from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.user import User
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate

USER_ID = "user-002"

class WorkspaceService:

    @staticmethod
    def get_all(db: Session):
        return WorkspaceRepository.get_all(db)

    @staticmethod
    def get_by_id(db: Session, workspace_id: str):
        workspace = WorkspaceRepository.get_by_id(db, workspace_id)
        if not workspace:
            raise ValueError("Workspace không tồn tại")
        return workspace

    @staticmethod
    def create(db: Session, data: WorkspaceCreate):
        user = db.query(User).filter(User.id == USER_ID).first()
        if not user:
            raise ValueError("User user-002 không tồn tại")

        workspace = Workspace(
            id=str(uuid4()),
            owner_id=USER_ID,
            name=data.name,
            description=data.description,
        )

        return WorkspaceRepository.create(db, workspace)