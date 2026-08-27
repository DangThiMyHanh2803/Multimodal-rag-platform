from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    name: Mapped[str] = mapped_column(String(255), nullable=False,)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True,)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False,)
    # Relationships
    owner = relationship("User", back_populates="workspaces",)
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan",)
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan",)