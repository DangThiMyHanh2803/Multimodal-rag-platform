from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False,)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False,)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False,)
    title: Mapped[str] = mapped_column(String(255), nullable=False,)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False,)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False,)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    status: Mapped[str] = mapped_column(String(50), default="indexing", nullable=False,)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False,)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan",)
    workspace = relationship("Workspace", back_populates="documents",)
    uploaded_by_user = relationship("User", back_populates="files",)