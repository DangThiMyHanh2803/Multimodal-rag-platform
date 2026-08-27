from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentCreate(BaseModel):
    workspace_id: str
    file_name: str
    title: str
    file_type: str

class DocumentUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    page_count: int | None = None
    chunk_count: int | None = None
    error_message: str | None = None

class DocumentResponse(BaseModel):
    id: str
    workspace_id: str
    uploaded_by: str
    file_name: str
    title: str
    file_type: str
    file_path: str
    file_size: int | None
    status: str
    page_count: int | None
    chunk_count: int
    error_message: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)