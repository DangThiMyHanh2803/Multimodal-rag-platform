from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk

class DocumentRepository:

    @staticmethod
    def get_by_id(db: Session, document_id: str):
        return db.query(Document).filter(
            Document.id == document_id
        ).first()

    @staticmethod
    def get_by_workspace(db: Session, workspace_id: str):
        return db.query(Document).filter(
            Document.workspace_id == workspace_id
        ).order_by(
            Document.created_at.desc()
        ).all()

    @staticmethod
    def create(db: Session, document: Document):
        db.add(document)
        db.commit()
        db.refresh(document)
        return document

    @staticmethod
    def update(db: Session, document: Document):
        db.commit()
        db.refresh(document)
        return document

    @staticmethod
    def delete(db: Session, document: Document):
        db.delete(document)
        db.commit()
        return document

    @staticmethod
    def get_documents_by_ids(
        db: Session,
        document_ids: list[str],
    ):
        return db.query(Document).filter(
            Document.id.in_(document_ids)
        ).all()

    @staticmethod
    def get_chunks_by_documents(
        db: Session,
        document_ids: list[str],
    ):
        return db.query(DocumentChunk).filter(
            DocumentChunk.document_id.in_(document_ids)
        ).all()