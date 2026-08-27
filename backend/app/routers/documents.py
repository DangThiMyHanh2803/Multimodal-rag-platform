import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form 
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.document import (DocumentCreate, DocumentResponse, DocumentUpdate,)
from app.services.document_service import DocumentService
from app.rag.ingest import ingest_document

router = APIRouter(prefix="/documents", tags=["Documents"],)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
def get_documents():
    return {"message": "Documents router is working", "documents": [],}

@router.get("/{document_id}", response_model=DocumentResponse,)
def get_document(document_id: str, db: Session = Depends(get_db),):
    try:
        return DocumentService.get_document(db, document_id,)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e),)

@router.get("/workspace/{workspace_id}", response_model=list[DocumentResponse],)
def get_documents_by_workspace(workspace_id: str, db: Session = Depends(get_db),):
    return DocumentService.get_documents_by_workspace(db, workspace_id,)

@router.delete("/{document_id}", response_model=DocumentResponse,)
def delete_document(document_id: str, db: Session = Depends(get_db),):
    try:
        return DocumentService.delete_document(db, document_id,)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e),)
    
@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED,)
def create_document(document_data: DocumentCreate, db: Session = Depends(get_db),):
    try:
        return DocumentService.create_document(
            db=db,
            document_data=document_data,
            uploaded_by=document_data.uploaded_by,
            file_path=document_data.file_path,
            file_size=document_data.file_size,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e),)

@router.put("/{document_id}", response_model=DocumentResponse,)
def update_document(document_id: str, document_data: DocumentUpdate, db: Session = Depends(get_db),):
    try:
        return DocumentService.update_document(db, document_id, document_data,)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e),)

@router.patch("/{document_id}/status", response_model=DocumentResponse,)
def update_document_status(
    document_id: str,
    status_value: str,
    error_message: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        return DocumentService.update_status(
            db=db,
            document_id=document_id,
            status=status_value,
            error_message=error_message,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e),)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Tên file không hợp lệ",
        )

    uploaded_by = "user-002"

    suffix = Path(file.filename).suffix.lower()

    if suffix not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(
            status_code=400,
            detail=f"Không hỗ trợ loại file: {suffix}",
        )

    file_path = UPLOAD_DIR / file.filename
    content = await file.read()

    with open(file_path, "wb") as f:
        f.write(content)

    document_data = DocumentCreate(
        workspace_id=workspace_id,
        file_name=file.filename,
        title=Path(file.filename).stem,
        file_type=suffix,
    )

    document = None

    try:
        document = DocumentService.create_document(
            db=db,
            document_data=document_data,
            uploaded_by=uploaded_by,
            file_path=str(file_path),
            file_size=len(content),
        )

        ingest_result = ingest_document(
            str(file_path),
            document.id,
        )

        document_update = DocumentUpdate(
            status="ready",
            chunk_count=ingest_result["chunk_count"],
            error_message=None,
        )

        document = DocumentService.update_document(
            db=db,
            document_id=document.id,
            document_data=document_update,
        )

        return {
            "document_id": document.id,
            "workspace_id": document.workspace_id,
            "file_name": document.file_name,
            "file_type": document.file_type,
            "file_path": document.file_path,
            "file_size": document.file_size,
            "chunk_count": document.chunk_count,
            "status": document.status,
        }

    except Exception as e:
        if document is not None:
            try:
                DocumentService.update_status(
                    db=db,
                    document_id=document.id,
                    status="error",
                    error_message=str(e),
                )
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi xử lý tài liệu: {str(e)}",
        )