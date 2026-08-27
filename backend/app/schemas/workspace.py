from datetime import datetime
from pydantic import BaseModel, ConfigDict

class WorkspaceBase(BaseModel):
    name: str
    description: str | None = None

class WorkspaceCreate(WorkspaceBase):
    name: str
    description: str | None = None

class WorkspaceResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkspaceResponseW(WorkspaceBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)