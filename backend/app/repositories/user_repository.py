from sqlalchemy.orm import Session
from app.models.user import User

class UserRepository:

    @staticmethod
    def get_by_id(db: Session, user_id: str):
        return (
            db.query(User).filter(User.id == user_id).first()
        )

    @staticmethod
    def get_by_email(db: Session, email: str):
        return (
            db.query(User).filter(User.email == email).first()
        )

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        return (
            db.query(User).offset(skip).limit(limit).all()
        )

    @staticmethod
    def create(db: Session, user: User):
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update(db: Session, user: User):
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user: User):
        db.delete(user)
        db.commit()
        return user