from datetime import datetime
from sqlalchemy import (String, Text, Integer, DateTime, ForeignKey, JSON,)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True,)
    chunk_id: Mapped[int] = mapped_column(Integer, nullable=False,)
    content: Mapped[str] = mapped_column(Text, nullable=False,)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    chunk_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    # Relationship
    document = relationship("Document", back_populates="chunks",)