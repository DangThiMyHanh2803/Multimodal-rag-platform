from sqlalchemy.orm import Session
from app.models.conversation import Conversation

class ConversationRepository:

    @staticmethod
    def get_by_id(db: Session, conversation_id: int):
        return (
            db.query(Conversation).filter(Conversation.id == conversation_id).first()
        )

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        return (
            db.query(Conversation).offset(skip).limit(limit).all()
        )

    @staticmethod
    def get_by_user(db: Session, user_id: int):
        return (
            db.query(Conversation).filter(Conversation.user_id == user_id).all()
        )

    @staticmethod
    def get_by_workspace(db: Session, workspace_id: int):
        return (
            db.query(Conversation).filter(Conversation.workspace_id == workspace_id).all()
        )

    @staticmethod
    def create(db: Session, conversation: Conversation):
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def update(db: Session, conversation: Conversation):
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def delete(db: Session, conversation: Conversation):
        db.delete(conversation)
        db.commit()
        return conversation