from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse
from app.services.workspace_service import WorkspaceService


router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"],
)


@router.get(
    "/",
    response_model=list[WorkspaceResponse],
)
def get_workspaces(
    db: Session = Depends(get_db),
):
    return WorkspaceService.get_all(db)


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
)
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
):
    try:
        return WorkspaceService.get_by_id(
            db,
            workspace_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )


@router.post(
    "/",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workspace(
    workspace_data: WorkspaceCreate,
    db: Session = Depends(get_db),
):
    return WorkspaceService.create(
        db,
        workspace_data,
    )