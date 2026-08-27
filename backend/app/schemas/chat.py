from datetime import datetime
from pydantic import BaseModel, Field

class ChatQueryRequest(BaseModel):
    workspace_id: str
    document_ids: list[str] = Field(default_factory=list)
    question: str = Field(min_length=1, max_length=10000,)
    conversation_id: str | None = None

class SourceDocument(BaseModel):
    document_id: str
    chunk_id: int
    content: str
    page_number: int | None = None

class ChatQueryResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    sources: list[SourceDocument] = Field(default_factory=list)

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}

class ConversationResponse(BaseModel):
    id: str
    title: str
    workspace_id: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    workspace_id: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]
    model_config = {"from_attributes": True}