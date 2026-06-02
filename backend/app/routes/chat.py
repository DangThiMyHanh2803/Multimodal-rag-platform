"""
routes/chat.py
==============
REST API endpoints cho tính năng hỏi đáp tài liệu.

Endpoints:
    POST  /api/chat/message          — gửi câu hỏi, nhận câu trả lời từ RAG
    GET   /api/chat/conversations    — danh sách cuộc hội thoại
    GET   /api/chat/conversations/{id}/messages — lịch sử tin nhắn
    DELETE /api/chat/conversations/{id}         — xóa cuộc hội thoại

Luồng chat:
    Client gửi { question, file_ids, conversation_id }
        │
        ▼
    rag_service.query()
        ├── embed question → vector
        ├── retrieve Top-10 chunks từ ChromaDB
        ├── rerank → Top-3 chunks
        ├── build prompt + call LLM
        └── tính RAGAS scores
        │
        ▼
    Lưu message vào conversation store
        │
        ▼
    Trả về ChatResponse (answer, sources, ragas_scores, latency_ms)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# In-memory conversation store — thay bằng DB thật ở Ưu tiên 3
# Key: conversation_id, Value: Conversation
_conversations: dict[str, dict] = {}


# =============================================================================
# Pydantic Schemas
# =============================================================================

class ChatRequest(BaseModel):
    """Body của POST /api/chat/message."""

    question       : str  = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Câu hỏi của người dùng",
        examples=["BOD dùng để làm gì?"],
    )
    file_ids       : Optional[list[str]] = Field(
        default=None,
        description="Danh sách file_id cần tìm kiếm. "
                    "Để trống (null) để tìm trong tất cả file đã upload.",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="ID cuộc hội thoại. Để trống để tạo cuộc hội thoại mới.",
    )


class SourceItem(BaseModel):
    """Một nguồn trích dẫn trong câu trả lời."""
    chunk_id    : str
    file_name   : str
    page_number : Optional[int]
    text_preview: str               # 150 ký tự đầu của chunk
    score       : float             # vector similarity score
    rerank_score: float             # cross-encoder score


class ChatResponse(BaseModel):
    """Response trả về sau khi RAG xử lý xong."""
    message_id     : str
    conversation_id: str
    question       : str
    answer         : str
    sources        : list[SourceItem]
    ragas_scores   : dict[str, float]
    latency_ms     : float
    model_used     : str
    created_at     : str


class MessageItem(BaseModel):
    """Một tin nhắn trong lịch sử hội thoại."""
    message_id : str
    role       : str             # "user" | "assistant"
    content    : str
    sources    : list[SourceItem] = []
    ragas_scores: dict[str, float] = {}
    created_at : str


class ConversationItem(BaseModel):
    """Metadata một cuộc hội thoại."""
    conversation_id: str
    title          : str          # lấy từ câu hỏi đầu tiên
    message_count  : int
    created_at     : str
    updated_at     : str


class ConversationDetail(BaseModel):
    """Chi tiết cuộc hội thoại kèm toàn bộ lịch sử tin nhắn."""
    conversation_id: str
    title          : str
    messages       : list[MessageItem]
    created_at     : str
    updated_at     : str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post(
    "/message",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Gửi câu hỏi",
    description="Gửi câu hỏi, hệ thống RAG tìm kiếm trong tài liệu và "
                "trả về câu trả lời có trích nguồn + RAGAS scores.",
)
async def send_message(body: ChatRequest):
    """
    Endpoint chính của hệ thống — gọi RAG pipeline và trả về câu trả lời.

    Flow:
        1. Validate request
        2. Lấy / tạo conversation
        3. Lưu user message
        4. Gọi rag_service.query()
        5. Lưu assistant message
        6. Trả về ChatResponse

    Raises:
        400: Câu hỏi rỗng
        500: Lỗi RAG pipeline (ChromaDB, model, LLM API)
    """
    question = body.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Câu hỏi không được để trống.",
        )

    # ── Lấy hoặc tạo conversation ─────────────────────────────────────────────
    conv_id = body.conversation_id or str(uuid.uuid4())
    now     = datetime.utcnow().isoformat() + "Z"

    if conv_id not in _conversations:
        _conversations[conv_id] = {
            "conversation_id": conv_id,
            "title"          : question[:60],   # 60 ký tự đầu làm tiêu đề
            "messages"       : [],
            "created_at"     : now,
            "updated_at"     : now,
        }

    conv = _conversations[conv_id]

    # ── Lưu user message ──────────────────────────────────────────────────────
    user_msg_id = str(uuid.uuid4())
    conv["messages"].append({
        "message_id" : user_msg_id,
        "role"       : "user",
        "content"    : question,
        "sources"    : [],
        "ragas_scores": {},
        "created_at" : now,
    })

    # ── Gọi RAG pipeline ──────────────────────────────────────────────────────
    logger.info(
        "[Chat] conv=%s | question=%r | file_ids=%s",
        conv_id, question, body.file_ids,
    )

    try:
        rag_result = await rag_service.query(
            question=question,
            file_ids=body.file_ids,
        )
    except Exception as exc:
        logger.error("[Chat] RAG pipeline lỗi: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống RAG: {exc}",
        )

    # ── Chuẩn bị sources để trả về ───────────────────────────────────────────
    sources = [
        SourceItem(
            chunk_id    = chunk.chunk_id,
            file_name   = chunk.file_name,
            page_number = chunk.page_number,
            text_preview= chunk.text[:150] + ("..." if len(chunk.text) > 150 else ""),
            score       = chunk.score,
            rerank_score= chunk.rerank_score,
        )
        for chunk in rag_result.sources
    ]

    # ── Lưu assistant message ─────────────────────────────────────────────────
    assistant_msg_id = str(uuid.uuid4())
    answer_time      = datetime.utcnow().isoformat() + "Z"

    conv["messages"].append({
        "message_id" : assistant_msg_id,
        "role"       : "assistant",
        "content"    : rag_result.answer,
        "sources"    : [s.model_dump() for s in sources],
        "ragas_scores": rag_result.ragas_scores,
        "created_at" : answer_time,
    })
    conv["updated_at"] = answer_time

    logger.info(
        "[Chat] Hoàn thành: %.0f ms | chunks=%d | faithfulness=%.2f",
        rag_result.latency_ms,
        len(sources),
        rag_result.ragas_scores.get("faithfulness", 0),
    )

    return ChatResponse(
        message_id     = assistant_msg_id,
        conversation_id= conv_id,
        question       = question,
        answer         = rag_result.answer,
        sources        = sources,
        ragas_scores   = rag_result.ragas_scores,
        latency_ms     = rag_result.latency_ms,
        model_used     = rag_result.model_used,
        created_at     = answer_time,
    )


@router.get(
    "/conversations",
    response_model=list[ConversationItem],
    summary="Danh sách cuộc hội thoại",
)
async def list_conversations():
    """
    Trả về danh sách tất cả cuộc hội thoại, sắp xếp mới nhất trước.
    """
    items = [
        ConversationItem(
            conversation_id= c["conversation_id"],
            title          = c["title"],
            message_count  = len(c["messages"]),
            created_at     = c["created_at"],
            updated_at     = c["updated_at"],
        )
        for c in _conversations.values()
    ]
    # Sắp xếp theo updated_at giảm dần (mới nhất trước)
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Lịch sử tin nhắn",
)
async def get_conversation(conversation_id: str):
    """
    Lấy toàn bộ lịch sử tin nhắn của một cuộc hội thoại.

    Raises:
        404: Không tìm thấy conversation_id
    """
    conv = _conversations.get(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy cuộc hội thoại '{conversation_id}'.",
        )

    return ConversationDetail(
        conversation_id= conv["conversation_id"],
        title          = conv["title"],
        messages       = [MessageItem(**m) for m in conv["messages"]],
        created_at     = conv["created_at"],
        updated_at     = conv["updated_at"],
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    summary="Xóa cuộc hội thoại",
)
async def delete_conversation(conversation_id: str):
    """
    Xóa một cuộc hội thoại và toàn bộ tin nhắn trong đó.

    Raises:
        404: Không tìm thấy conversation_id
    """
    if conversation_id not in _conversations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy cuộc hội thoại '{conversation_id}'.",
        )

    msg_count = len(_conversations[conversation_id]["messages"])
    del _conversations[conversation_id]

    return {
        "conversation_id": conversation_id,
        "deleted_messages": msg_count,
        "message": f"Đã xóa cuộc hội thoại và {msg_count} tin nhắn.",
    }
