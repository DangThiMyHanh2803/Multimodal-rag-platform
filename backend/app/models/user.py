from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True,)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True,)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False,)
    name: Mapped[str] = mapped_column(String(100), nullable=False,)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False,)
    # Relationships
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan",)
    files = relationship("Document", back_populates="uploaded_by_user",)
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan",)