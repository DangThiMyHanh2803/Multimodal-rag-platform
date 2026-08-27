from pydantic import BaseModel, ConfigDict
from typing import Optional

class ConversationBase(BaseModel):
    title: Optional[str] = None

class ConversationCreate(ConversationBase):
    workspace_id: int

class ConversationResponse(ConversationBase):
    id: int
    workspace_id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)