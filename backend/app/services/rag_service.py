"""
rag_service.py
==============
Lớp dịch vụ RAG (Retrieval-Augmented Generation) — trái tim của hệ thống.

Pipeline chính:
    Câu hỏi của user
        │
        ▼
    [1] embed_query()          — chuyển câu hỏi → vector (bge-m3)
        │
        ▼
    [2] retrieve_top_k()       — tìm Top-K chunk gần nhất trong ChromaDB
        │
        ▼
    [3] rerank()               — Cross-encoder chọn Top-N chunk tốt nhất
        │
        ▼
    [4] build_prompt()         — ghép context + câu hỏi thành prompt
        │
        ▼
    [5] call_llm()             — gọi LLM sinh câu trả lời
        │
        ▼
    [6] RAGResponse            — trả về answer + sources + RAGAS scores

Tham chiếu bài báo:
    - Gao et al. (2023) "RAG Survey" — arXiv:2312.10997  (kiến trúc Advanced RAG)
    - Es et al. (2023)  "RAGAS"       — arXiv:2309.15217  (metric đánh giá)
"""

from __future__ import annotations

import logging
import math
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

# ── Vector DB & Embedding ──────────────────────────────────────────────────────
import chromadb
from chromadb import Collection
from sentence_transformers import SentenceTransformer, CrossEncoder

# ── LLM ───────────────────────────────────────────────────────────────────────
from openai import OpenAI

# ── Config từ .env ─────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)


# =============================================================================
# CẤU HÌNH TOÀN CỤC
# =============================================================================

# Tên model embedding đa ngôn ngữ hỗ trợ tiếng Việt tốt
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

# Cross-encoder reranker — chính xác hơn bi-encoder nhưng chậm hơn
RERANKER_MODEL_NAME  = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")

# Số chunk lấy ra ở bước retrieval (trước rerank)
TOP_K_RETRIEVE = int(os.getenv("TOP_K_RETRIEVE", "10"))

# Số chunk giữ lại sau rerank để đưa vào LLM
TOP_N_RERANK   = int(os.getenv("TOP_N_RERANK", "3"))

# ChromaDB
CHROMA_HOST       = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT       = int(os.getenv("CHROMA_PORT", "8001"))
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "rag_documents")

# LLM
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL       = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_MAX_TOKENS  = int(os.getenv("LLM_MAX_TOKENS", "1024"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))


# =============================================================================
# DATA CLASSES — Cấu trúc dữ liệu truyền qua pipeline
# =============================================================================

@dataclass
class RetrievedChunk:
    """
    Một đoạn văn (chunk) được lấy ra từ ChromaDB.

    Attributes:
        chunk_id    : ID duy nhất của chunk trong vector DB
        text        : Nội dung văn bản của chunk
        file_name   : Tên file tài liệu gốc (vd: "QCVN_40.pdf")
        page_number : Trang trong tài liệu gốc (nếu biết)
        score       : Điểm tương đồng cosine từ vector search (0–1)
        rerank_score: Điểm từ cross-encoder reranker (sau bước rerank)
    """
    chunk_id    : str
    text        : str
    file_name   : str
    page_number : Optional[int] = None
    score       : float         = 0.0
    rerank_score: float         = 0.0


@dataclass
class RAGResponse:
    """
    Kết quả cuối cùng trả về cho client (frontend).

    Attributes:
        answer      : Câu trả lời do LLM sinh ra
        sources     : Danh sách chunk được sử dụng (để hiển thị nguồn trích dẫn)
        ragas_scores: Điểm đánh giá chất lượng (faithfulness, relevance, precision)
        latency_ms  : Tổng thời gian xử lý (milliseconds)
        model_used  : Tên LLM đã dùng
    """
    answer      : str
    sources     : list[RetrievedChunk] = field(default_factory=list)
    ragas_scores: dict[str, float]     = field(default_factory=dict)
    latency_ms  : float                = 0.0
    model_used  : str                  = ""


# =============================================================================
# RAGService — CLASS CHÍNH
# =============================================================================

class RAGService:
    """
    Lớp dịch vụ RAG chứa toàn bộ pipeline hỏi đáp tài liệu.

    Sử dụng Singleton pattern: chỉ khởi tạo model một lần khi ứng dụng
    khởi động (tránh load lại model mỗi request — rất chậm).

    Ví dụ sử dụng:
        rag = RAGService()
        response = await rag.query("BOD dùng để làm gì?", file_ids=["abc123"])
    """

    # ── Singleton ──────────────────────────────────────────────────────────────
    _instance: Optional["RAGService"] = None

    def __new__(cls) -> "RAGService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    # ── Khởi tạo ──────────────────────────────────────────────────────────────

    def __init__(self) -> None:
        # Chỉ chạy một lần (Singleton guard)
        if self._initialized:
            return
        self._initialized = True

        logger.info("Đang tải Embedding model: %s ...", EMBEDDING_MODEL_NAME)
        # SentenceTransformer load bge-m3 — hỗ trợ tiếng Việt, tiếng Anh
        self.embedder: SentenceTransformer = SentenceTransformer(EMBEDDING_MODEL_NAME)

        logger.info("Đang tải Reranker model: %s ...", RERANKER_MODEL_NAME)
        # CrossEncoder — đọc cặp (query, chunk) cùng lúc, chính xác hơn bi-encoder
        self.reranker: CrossEncoder = CrossEncoder(RERANKER_MODEL_NAME)

        logger.info("Đang kết nối ChromaDB tại %s:%s ...", CHROMA_HOST, CHROMA_PORT)
        chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        # get_or_create: tạo mới nếu chưa có, lấy lại nếu đã có
        self.collection: Collection = chroma_client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            # Dùng cosine similarity (phù hợp với embedding văn bản)
            metadata={"hnsw:space": "cosine"},
        )

        logger.info("Đang khởi tạo OpenAI client ...")
        self.llm_client = OpenAI(api_key=OPENAI_API_KEY)

        logger.info("RAGService sẵn sàng ✓")

    # =========================================================================
    # PUBLIC METHOD — Gọi từ bên ngoài (routes/chat.py)
    # =========================================================================

    async def query(
        self,
        question: str,
        file_ids: Optional[list[str]] = None,
        top_k: int = TOP_K_RETRIEVE,
        top_n: int = TOP_N_RERANK,
    ) -> RAGResponse:
        """
        Pipeline RAG chính: nhận câu hỏi → trả về câu trả lời + nguồn.

        Args:
            question : Câu hỏi của người dùng (tiếng Việt hoặc tiếng Anh)
            file_ids : Danh sách ID file cần tìm (None = tìm trong tất cả file)
            top_k    : Số chunk lấy ra từ vector DB (trước rerank)
            top_n    : Số chunk giữ lại sau rerank (đưa vào LLM)

        Returns:
            RAGResponse với answer, sources, ragas_scores, latency_ms
        """
        t_start = time.monotonic()
        logger.info("[RAG] Câu hỏi: %r | file_ids=%s", question, file_ids)

        # ── Bước 1: Embed câu hỏi ────────────────────────────────────────────
        query_vector = self._embed_query(question)

        # ── Bước 2: Retrieve Top-K từ ChromaDB ───────────────────────────────
        candidates = self._retrieve(query_vector, top_k=top_k, file_ids=file_ids)

        if not candidates:
            return RAGResponse(
                answer=(
                    "Không tìm thấy nội dung liên quan trong tài liệu đã upload. "
                    "Vui lòng thử lại với câu hỏi khác hoặc upload thêm tài liệu."
                ),
                sources=[],
                ragas_scores={},
                latency_ms=self._elapsed_ms(t_start),
                model_used=LLM_MODEL,
            )

        # ── Bước 3: Rerank — chọn Top-N chunk chất lượng nhất ────────────────
        reranked = self._rerank(question, candidates, top_n=top_n)

        # ── Bước 4: Xây dựng prompt ───────────────────────────────────────────
        prompt = self._build_prompt(question, reranked)

        # ── Bước 5: Gọi LLM sinh câu trả lời ────────────────────────────────
        answer = self._call_llm(prompt)

        # ── Bước 6: Tính RAGAS scores (ước lượng heuristic) ──────────────────
        ragas_scores = self._estimate_ragas_scores(
            question=question,
            answer=answer,
            chunks=reranked,
        )

        latency_ms = self._elapsed_ms(t_start)
        logger.info("[RAG] Hoàn thành trong %.0f ms", latency_ms)

        return RAGResponse(
            answer=answer,
            sources=reranked,
            ragas_scores=ragas_scores,
            latency_ms=latency_ms,
            model_used=LLM_MODEL,
        )

    # =========================================================================
    # PRIVATE METHODS — Từng bước trong pipeline
    # =========================================================================

    # ── Bước 1: Embed query ───────────────────────────────────────────────────

    def _embed_query(self, question: str) -> list[float]:
        """
        Chuyển câu hỏi thành vector số dùng model bge-m3.

        bge-m3 hỗ trợ "query instruction" — thêm tiền tố giúp model
        hiểu đây là câu hỏi (query) chứ không phải đoạn văn (passage).
        """
        # Tiền tố gợi ý cho embedding model biết đây là query (không phải passage)
        prefixed = f"Represent this sentence for searching relevant passages: {question}"
        vector = self.embedder.encode(prefixed, normalize_embeddings=True)
        return vector.tolist()

    # ── Bước 2: Retrieve ──────────────────────────────────────────────────────

    def _retrieve(
        self,
        query_vector: list[float],
        top_k: int,
        file_ids: Optional[list[str]],
    ) -> list[RetrievedChunk]:
        """
        Tìm kiếm ngữ nghĩa (semantic search) trong ChromaDB.

        ChromaDB dùng HNSW index để tìm các vector gần nhất với
        query_vector — tức chunk nào có nghĩa gần với câu hỏi nhất.

        Nếu file_ids được cung cấp, chỉ tìm trong các file đó
        bằng ChromaDB where filter.
        """
        # Xây dựng bộ lọc theo file nếu cần
        where_filter = None
        if file_ids:
            if len(file_ids) == 1:
                where_filter = {"file_id": {"$eq": file_ids[0]}}
            else:
                where_filter = {"file_id": {"$in": file_ids}}

        try:
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("[Retrieve] Lỗi ChromaDB: %s", exc)
            return []

        chunks: list[RetrievedChunk] = []

        ids       = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for chunk_id, text, meta, dist in zip(ids, documents, metadatas, distances):
            # ChromaDB trả về distance (0 = giống nhau) → đổi sang similarity
            similarity = 1.0 - dist
            chunks.append(RetrievedChunk(
                chunk_id    = chunk_id,
                text        = text or "",
                file_name   = meta.get("file_name", "Unknown"),
                page_number = meta.get("page_number"),
                score       = round(similarity, 4),
            ))

        logger.debug("[Retrieve] Tìm được %d chunks", len(chunks))
        return chunks

    # ── Bước 3: Rerank ────────────────────────────────────────────────────────

    def _rerank(
        self,
        question: str,
        chunks: list[RetrievedChunk],
        top_n: int,
    ) -> list[RetrievedChunk]:
        """
        Cross-encoder reranker: đánh giá lại chất lượng từng chunk.

        Khác với bi-encoder (embed riêng query và chunk rồi so sánh),
        cross-encoder đọc CẶP (query + chunk) cùng lúc → hiểu ngữ cảnh
        tốt hơn, chính xác hơn (nhưng chậm hơn vì phải chạy K lần).

        Đây là bước "post-retrieval processing" trong Advanced RAG theo
        Gao et al. (2023) — arXiv:2312.10997, Hình 3.
        """
        if not chunks:
            return []

        # Tạo danh sách cặp [câu hỏi, nội dung chunk] cho cross-encoder
        pairs = [(question, chunk.text) for chunk in chunks]

        try:
            scores: list[float] = self.reranker.predict(pairs).tolist()
        except Exception as exc:
            logger.warning("[Rerank] Lỗi reranker, fallback vector score: %s", exc)
            return chunks[:top_n]

        # Gán rerank_score vào từng chunk
        for chunk, score in zip(chunks, scores):
            chunk.rerank_score = round(float(score), 4)

        # Sắp xếp theo rerank_score giảm dần, lấy Top-N
        reranked = sorted(chunks, key=lambda c: c.rerank_score, reverse=True)[:top_n]

        logger.debug(
            "[Rerank] Top-%d: %s",
            top_n,
            [f"{c.file_name}:{c.rerank_score:.3f}" for c in reranked],
        )
        return reranked

    # ── Bước 4: Build Prompt ──────────────────────────────────────────────────

    def _build_prompt(self, question: str, chunks: list[RetrievedChunk]) -> str:
        """
        Ghép các chunk được chọn + câu hỏi thành prompt gửi cho LLM.

        Kỹ thuật Prompt Engineering:
        - Context block : nội dung tài liệu đã tìm được (có đánh số nguồn)
        - Question      : câu hỏi của người dùng
        - Rules         : ràng buộc LLM chỉ dùng context, tránh hallucination

        Quy tắc thiết kế:
        - Yêu cầu LLM CHỈ dùng thông tin trong context
        - Yêu cầu trích dẫn [1], [2] để frontend hiển thị nguồn
        - Nếu không tìm thấy → nói thẳng "không tìm thấy"
        """
        # Build context từ các chunk được rerank
        context_parts = []
        for i, chunk in enumerate(chunks, start=1):
            source_label = chunk.file_name
            if chunk.page_number:
                source_label += f" (trang {chunk.page_number})"
            context_parts.append(f"[{i}] Nguồn: {source_label}\n{chunk.text}")

        context_block = "\n\n".join(context_parts)

        prompt = (
            "Bạn là trợ lý hỏi đáp tài liệu chuyên nghiệp. Nhiệm vụ của bạn là "
            "trả lời câu hỏi DỰA HOÀN TOÀN vào nội dung tài liệu được cung cấp.\n\n"
            "QUY TẮC:\n"
            "1. Chỉ sử dụng thông tin từ phần TÀI LIỆU THAM KHẢO — không thêm kiến thức bên ngoài.\n"
            "2. Trích dẫn số nguồn [1], [2]... ở cuối mỗi câu lấy từ tài liệu.\n"
            "3. Nếu tài liệu KHÔNG có thông tin → trả lời: "
            "\"Tài liệu không đề cập đến nội dung này.\"\n"
            "4. Trả lời bằng tiếng Việt, rõ ràng và súc tích.\n\n"
            f"TÀI LIỆU THAM KHẢO:\n{context_block}\n\n"
            f"CÂU HỎI: {question}\n\n"
            "TRẢ LỜI:"
        )
        return prompt

    # ── Bước 5: Gọi LLM ──────────────────────────────────────────────────────

    def _call_llm(self, prompt: str) -> str:
        """
        Gửi prompt đến OpenAI GPT-4o-mini và nhận câu trả lời.

        temperature=0.2 : ít sáng tạo, bám sát tài liệu (phù hợp Q&A)
        max_tokens=1024 : đủ dài cho câu trả lời chi tiết
        """
        try:
            response = self.llm_client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Bạn là trợ lý hỏi đáp tài liệu. "
                            "Chỉ trả lời dựa trên tài liệu được cung cấp. "
                            "Luôn trích dẫn số nguồn [1], [2] trong câu trả lời."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=LLM_TEMPERATURE,
                max_tokens=LLM_MAX_TOKENS,
            )
            answer = response.choices[0].message.content or ""
            logger.debug("[LLM] Tokens dùng: %s", response.usage)
            return answer.strip()

        except Exception as exc:
            logger.error("[LLM] Lỗi gọi API: %s", exc)
            return (
                "Xin lỗi, hệ thống gặp sự cố khi sinh câu trả lời. "
                "Vui lòng thử lại sau."
            )

    # ── Bước 6: Ước lượng RAGAS scores ───────────────────────────────────────

    def _estimate_ragas_scores(
        self,
        question: str,
        answer: str,
        chunks: list[RetrievedChunk],
    ) -> dict[str, float]:
        """
        Ước lượng nhanh các chỉ số RAGAS bằng heuristic.

        Trong production thực tế, RAGAS gọi thêm LLM để đánh giá mỗi chiều.
        Ở đây dùng heuristic để hiển thị realtime trên dashboard (nhanh hơn).

        Các chỉ số (theo Es et al., 2023 — arXiv:2309.15217):

        Faithfulness     : Câu trả lời có trung thực với tài liệu không?
                           Heuristic: % câu trong answer có overlap từ với context
        Answer Relevance : Câu trả lời có đúng trọng tâm câu hỏi không?
                           Heuristic: cosine similarity embed(answer) vs embed(question)
        Context Precision: Reranker có chọn đúng chunk không?
                           Heuristic: sigmoid của mean rerank_score
        """
        scores: dict[str, float] = {}

        # ── Faithfulness ──────────────────────────────────────────────────────
        if answer and chunks:
            context_words = set()
            for chunk in chunks:
                context_words.update(chunk.text.lower().split())

            # Tách answer thành câu theo dấu chấm
            sentences = [s.strip() for s in answer.split(".") if len(s.strip()) > 10]
            if sentences:
                grounded = sum(
                    1 for sent in sentences
                    if len(set(sent.lower().split()) & context_words)
                    / max(len(sent.split()), 1) >= 0.30
                )
                scores["faithfulness"] = round(grounded / len(sentences), 3)
            else:
                scores["faithfulness"] = 0.5
        else:
            scores["faithfulness"] = 0.0

        # ── Answer Relevance ──────────────────────────────────────────────────
        try:
            if answer:
                q_vec = self.embedder.encode(question, normalize_embeddings=True)
                # Cắt ngắn answer để encode nhanh hơn
                a_vec = self.embedder.encode(answer[:500], normalize_embeddings=True)
                # Dot product của 2 normalized vector = cosine similarity
                relevance = float(np.dot(q_vec, a_vec))
                scores["answer_relevance"] = round(max(0.0, min(1.0, relevance)), 3)
            else:
                scores["answer_relevance"] = 0.0
        except Exception:
            scores["answer_relevance"] = 0.5

        # ── Context Precision ─────────────────────────────────────────────────
        if chunks:
            # Sigmoid của mean rerank_score → chuẩn hóa về [0, 1]
            mean_rerank = sum(c.rerank_score for c in chunks) / len(chunks)
            scores["context_precision"] = round(1 / (1 + math.exp(-mean_rerank)), 3)
        else:
            scores["context_precision"] = 0.0

        logger.debug("[RAGAS] %s", scores)
        return scores

    # ── Utility ───────────────────────────────────────────────────────────────

    @staticmethod
    def _elapsed_ms(t_start: float) -> float:
        """Tính thời gian trôi qua (ms) kể từ t_start."""
        return round((time.monotonic() - t_start) * 1000, 1)

    # =========================================================================
    # PHƯƠNG THỨC BỔ SUNG — Dùng cho Dashboard và nâng cấp sau
    # =========================================================================

    async def query_with_hybrid_search(
        self,
        question: str,
        file_ids: Optional[list[str]] = None,
    ) -> RAGResponse:
        """
        Phiên bản nâng cấp: Hybrid Search = Vector Search + BM25.

        Theo Gao et al. (2023), Hybrid Search cải thiện đáng kể với:
        - Thuật ngữ viết tắt (BOD, COD, QCVN) → BM25 khớp chính xác từ khóa
        - Câu hỏi ngữ nghĩa phức tạp          → Vector search hiểu ý nghĩa

        TODO (Ưu tiên 3.1): Tích hợp BM25Retriever từ LangChain:
            from langchain.retrievers import BM25Retriever, EnsembleRetriever
            ensemble = EnsembleRetriever(
                retrievers=[vector_retriever, bm25_retriever],
                weights=[0.6, 0.4],   # 60% vector + 40% BM25
            )
        """
        logger.info("[Hybrid] Đang dùng vector search (BM25 chưa tích hợp)")
        return await self.query(question, file_ids=file_ids)

    def get_collection_stats(self) -> dict:
        """
        Thống kê ChromaDB collection — dùng cho Dashboard API.

        Returns:
            {"total_chunks": 1234, "collection_name": "rag_documents"}
        """
        try:
            return {
                "total_chunks": self.collection.count(),
                "collection_name": CHROMA_COLLECTION,
            }
        except Exception as exc:
            logger.error("[Stats] Lỗi: %s", exc)
            return {"total_chunks": 0, "collection_name": CHROMA_COLLECTION}


# =============================================================================
# SINGLETON INSTANCE — Import và dùng trong routes
# =============================================================================
#
# Cách dùng trong routes/chat.py:
#
#   from app.services.rag_service import rag_service
#
#   @router.post("/message")
#   async def send_message(body: ChatRequest):
#       response = await rag_service.query(
#           question=body.question,
#           file_ids=body.file_ids,
#       )
#       return response
#
# Singleton được khởi tạo một lần khi module được import lần đầu
rag_service = RAGService()
