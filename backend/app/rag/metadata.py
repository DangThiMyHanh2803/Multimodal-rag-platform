from pathlib import Path

def create_document_metadata(file_path: str, title: str, file_type: str, document_id: str) -> dict:
    return {
        "document_id": document_id,
        "file_name": Path(file_path).name,
        "file_type": file_type,
        "title": title,
    }

def create_chunk_metadata(document_metadata: dict, chunk_id: int, page_number: int | None = None) -> dict:
    metadata = {
        "document_id": document_metadata["document_id"],
        "file_name": document_metadata["file_name"],
        "file_type": document_metadata["file_type"],
        "title": document_metadata["title"],
        "chunk_id": chunk_id,
    }

    if document_metadata["file_type"] == ".pdf" and page_number is not None:
        metadata["page_number"] = page_number

    return metadata