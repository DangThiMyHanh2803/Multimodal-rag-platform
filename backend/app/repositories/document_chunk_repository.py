from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk


class DocumentChunkRepository:

    @staticmethod
    def get_by_id(db: Session, chunk_id: str) -> DocumentChunk | None:
        statement = select(DocumentChunk).where(DocumentChunk.id == chunk_id)
        return db.scalar(statement)

    @staticmethod
    def get_by_document(db: Session, document_id: str) -> list[DocumentChunk]:
        statement = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_id.asc())
        )
        return list(db.scalars(statement).all())

    @staticmethod
    def create(db: Session, chunk: DocumentChunk) -> DocumentChunk:
        db.add(chunk)
        db.commit()
        db.refresh(chunk)
        return chunk

    @staticmethod
    def create_many(db: Session, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        db.add_all(chunks)
        db.commit()

        for chunk in chunks:
            db.refresh(chunk)

        return chunks

    @staticmethod
    def delete(db: Session, chunk: DocumentChunk) -> None:
        db.delete(chunk)
        db.commit()

    @staticmethod
    def delete_by_document(db: Session, document_id: str) -> None:
        statement = delete(DocumentChunk).where(
            DocumentChunk.document_id == document_id
        )

        db.execute(statement)
        db.commit()