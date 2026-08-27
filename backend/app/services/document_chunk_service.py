from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.document_chunk import DocumentChunk
from app.repositories.document_chunk_repository import DocumentChunkRepository
class DocumentChunkService:

    @staticmethod
    def get_chunk(db: Session, chunk_id: str):
        chunk = DocumentChunkRepository.get_by_id(db, chunk_id)
        if not chunk:
            raise ValueError("Document chunk not found")
        return chunk

    @staticmethod
    def get_chunks_by_document(db: Session, document_id: str):
        return DocumentChunkRepository.get_by_document(db, document_id)

    @staticmethod
    def create_chunk(db: Session, document_id: str, chunk_id: int, content: str, page_number: int | None = None, chunk_metadata: dict | None = None,):
        chunk = DocumentChunk(
            id=str(uuid4()),
            document_id=document_id,
            chunk_id=chunk_id,
            content=content,
            page_number=page_number,
            chunk_metadata=chunk_metadata,
        )
        return DocumentChunkRepository.create(db, chunk)

    @staticmethod
    def create_chunks(db: Session, document_id: str, chunks: list[dict]):
        document_chunks = []
        for chunk_data in chunks:
            chunk = DocumentChunk(
                id=str(uuid4()),
                document_id=document_id,
                chunk_id=chunk_data["chunk_id"],
                content=chunk_data["content"],
                page_number=chunk_data.get("page_number"),
                chunk_metadata=chunk_data.get(
                    "chunk_metadata"
                ),
            )
            document_chunks.append(chunk)
        return DocumentChunkRepository.create_many(db, document_chunks)

    @staticmethod
    def delete_chunk(db: Session, chunk_id: str):
        chunk = DocumentChunkRepository.get_by_id(db, chunk_id)
        if not chunk:
            raise ValueError("Document chunk not found")
        return DocumentChunkRepository.delete(db, chunk)

    @staticmethod
    def delete_chunks_by_document(db: Session, document_id: str):
        return DocumentChunkRepository.delete_by_document(db, document_id)