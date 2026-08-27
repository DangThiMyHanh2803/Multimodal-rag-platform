from sqlalchemy.orm import Session
from app.models.workspace import Workspace

class WorkspaceRepository:

    @staticmethod
    def get_by_id(db: Session, workspace_id: str):
        return db.query(Workspace).filter(
            Workspace.id == workspace_id
        ).first()

    @staticmethod
    def get_all(db: Session):
        return db.query(Workspace).order_by(
            Workspace.updated_at.desc()
        ).all()

    @staticmethod
    def get_by_owner(db: Session, owner_id: str):
        return db.query(Workspace).filter(
            Workspace.owner_id == owner_id
        ).all()

    @staticmethod
    def create(db: Session, workspace: Workspace):
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        return workspace

    @staticmethod
    def update(db: Session, workspace: Workspace):
        db.commit()
        db.refresh(workspace)
        return workspace

    @staticmethod
    def delete(db: Session, workspace: Workspace):
        db.delete(workspace)
        db.commit()
        return workspace