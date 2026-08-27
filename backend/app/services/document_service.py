from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.document import Document
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate

class DocumentService:

    @staticmethod
    def get_document(db: Session, document_id: str):
        document = DocumentRepository.get_by_id(db, document_id)
        if not document:
            raise ValueError("Document not found")
        return document

    @staticmethod
    def get_documents_by_workspace(db: Session, workspace_id: str):
        return DocumentRepository.get_by_workspace(db, workspace_id)

    @staticmethod
    def create_document(db: Session, document_data: DocumentCreate, uploaded_by: str, file_path: str, file_size: int | None = None):
        document = Document(
            id=str(uuid4()),
            workspace_id=document_data.workspace_id,
            uploaded_by=uploaded_by,
            file_name=document_data.file_name,
            title=document_data.title,
            file_type=document_data.file_type,
            file_path=file_path,
            file_size=file_size,
            status="indexing",
            page_count=None,
            chunk_count=0,
            error_message=None,
        )
        return DocumentRepository.create(db, document)

    @staticmethod
    def update_document(db: Session, document_id: str, document_data: DocumentUpdate):
        document = DocumentRepository.get_by_id(db, document_id)
        if not document:
            raise ValueError("Document not found")
        if document_data.title is not None:
            document.title = document_data.title
        if document_data.status is not None:
            document.status = document_data.status
        if document_data.page_count is not None:
            document.page_count = document_data.page_count
        if document_data.chunk_count is not None:
            document.chunk_count = document_data.chunk_count
        if document_data.error_message is not None:
            document.error_message = document_data.error_message
        return DocumentRepository.update(db, document)

    @staticmethod
    def update_status(db: Session, document_id: str, status: str, error_message: str | None = None):
        document = DocumentRepository.get_by_id(db, document_id)
        if not document:
            raise ValueError("Document not found")
        document.status = status
        document.error_message = error_message
        return DocumentRepository.update(db, document)

    @staticmethod
    def delete_document(db: Session, document_id: str):
        document = DocumentRepository.get_by_id(db, document_id)
        if not document:
            raise ValueError("Document not found")
        return DocumentRepository.delete(db, document)