from datetime import datetime
from sqlalchemy import (String, DateTime, ForeignKey,)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,)
    workspace_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True,)
    title: Mapped[str] = mapped_column(String(255), default="Cuộc trò chuyện mới", nullable=False,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False,)
    # Relationships
    user = relationship("User", back_populates="conversations",)
    workspace = relationship("Workspace", back_populates="conversations",)
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",)