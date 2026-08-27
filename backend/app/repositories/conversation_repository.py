from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.conversation import Conversation
from app.models.message import Message

class ConversationRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, conversation_id: str,) -> Conversation | None:
        statement = select(Conversation).where(Conversation.id == conversation_id)
        return self.db.scalar(statement)

    def get_by_user(self, user_id: str,) -> list[Conversation]:
        statement = (select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc()))
        return list(self.db.scalars(statement).all())

    def create(self, conversation: Conversation,) -> Conversation:
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def add_message(self, message: Message,) -> Message:
        self.db.add(message)
        self.db.flush()
        return message

    def get_messages(self, conversation_id: str,) -> list[Message]:
        statement = (select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()))
        return list(self.db.scalars(statement).all())

    def delete(self, conversation: Conversation,) -> None:
        self.db.delete(conversation)
        self.db.flush()