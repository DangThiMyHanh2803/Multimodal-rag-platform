from fastapi import (APIRouter, Depends, HTTPException,)
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.chat import (ChatQueryRequest, ChatQueryResponse, ConversationResponse, ConversationDetailResponse,)
from app.services.chat_service import ChatService
from app.repositories.conversation_repository import (ConversationRepository,)

router = APIRouter(prefix="/chat", tags=["Chat"],)

@router.post("/query", response_model=ChatQueryResponse,)
def chat(request: ChatQueryRequest, db: Session = Depends(get_db),):

    user_id = "user-002"
    service = ChatService(db)
    print("Question:", request.question)
    print("Document IDs:", request.document_ids)
    print("Workspace ID:", request.workspace_id)
    print("Conversation ID:", request.conversation_id)
    try:
        return service.chat(user_id=user_id, request=request,)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e),)

@router.get("/conversations", response_model=list[ConversationResponse],)
def get_conversations(db: Session = Depends(get_db),):
    user_id = "demo-user-id"
    repository = ConversationRepository(db)
    return repository.get_by_user(user_id)

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse,)
def get_conversation(conversation_id: str, db: Session = Depends(get_db),):
    repository = ConversationRepository(db)
    conversation = repository.get_by_id(conversation_id)

    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation không tồn tại",)

    messages = repository.get_messages(conversation_id)

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        workspace_id=conversation.workspace_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=messages,
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db),):
    repository = ConversationRepository(db)
    conversation = repository.get_by_id(conversation_id)

    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation không tồn tại",)
    repository.delete(conversation)
    db.commit()
    return {"message": "Xóa conversation thành công"}