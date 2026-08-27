from datetime import datetime
from sqlalchemy import (String, DateTime, ForeignKey, Text, JSON, Float,)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True,)
    role: Mapped[str] = mapped_column(String(20), nullable=False,)
    content: Mapped[str] = mapped_column(Text, nullable=False,)
    sources: Mapped[list | None] = mapped_column(JSON, nullable=True,)
    faithfulness: Mapped[float | None] = mapped_column(Float, nullable=True,)
    relevance: Mapped[float | None] = mapped_column(Float, nullable=True,)
    precision_score: Mapped[float | None] = mapped_column(Float, nullable=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    # Relationship
    conversation = relationship("Conversation", back_populates="messages",)