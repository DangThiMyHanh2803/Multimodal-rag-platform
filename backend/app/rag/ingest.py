from pathlib import Path

from app.rag.parser.pdf_parser import parse_pdf
from app.rag.parser.docx_parser import parse_docx
from app.rag.parser.txt_parser import parser_txt
from app.rag.text_processor import clean_text, chunk_text
from app.rag.metadata import create_document_metadata, create_chunk_metadata
from app.rag.embedding.embedding_model import VietnameseEmbedding
from app.rag.vectorstore.chroma_store import ChromaStore


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def parse_document(file_path: Path):
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return parse_pdf(str(file_path))
    if suffix == ".docx":
        return parse_docx(str(file_path))
    if suffix == ".txt":
        return parser_txt(str(file_path))

    raise ValueError(f"Không hỗ trợ loại file: {suffix}")


def build_chunk(
    document_id: str,
    chunk_index: int,
    chunk_text_value: str,
    document_metadata: dict,
    page_number=None,
):
    metadata = create_chunk_metadata(
        document_metadata,
        chunk_index,
        page_number,
    )

    return {
        "id": f"{document_id}_chunk_{chunk_index:05d}",
        "text": chunk_text_value,
        **metadata,
    }


def create_chunks(file_path: Path, document_id: str) -> list[dict]:
    result = parse_document(file_path)

    if not result:
        return []

    file_type = file_path.suffix.lower()
    title = result.get("title", file_path.stem)

    document_metadata = create_document_metadata(
        str(file_path),
        title,
        file_type,
        document_id,
    )

    all_chunks = []
    chunk_index = 0

    if file_type == ".pdf":
        pages = result.get("pages", [])

        for page in pages:
            page_text = clean_text(page.get("text", ""))

            if not page_text:
                continue

            page_chunks = chunk_text(page_text)

            for chunk in page_chunks:
                all_chunks.append(
                    build_chunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        chunk_text_value=chunk,
                        document_metadata=document_metadata,
                        page_number=page.get("page_number"),
                    )
                )

                chunk_index += 1

        return all_chunks

    text = result.get("text", "")

    if not text:
        text = result.get("pages", "")

    text = clean_text(text)

    if not text:
        return []

    chunks = chunk_text(text)

    for chunk in chunks:
        all_chunks.append(
            build_chunk(
                document_id=document_id,
                chunk_index=chunk_index,
                chunk_text_value=chunk,
                document_metadata=document_metadata,
            )
        )

        chunk_index += 1

    return all_chunks


def ingest_document(file_path: str, document_id: str):
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {path}")

    suffix = path.suffix.lower()

    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Không hỗ trợ loại file: {suffix}")

    print(f"\nĐang ingest file: {path}")
    print(f"Loại file: {suffix}")

    chunks = create_chunks(
        file_path=path,
        document_id=document_id,
    )

    if not chunks:
        raise ValueError("Không tạo được chunk từ tài liệu.")

    print(f"Số chunks tạo được: {len(chunks)}")

    texts = [chunk["text"] for chunk in chunks]

    print("Đang tạo embedding...")

    embedding_model = VietnameseEmbedding()
    embeddings = embedding_model.encode(texts)

    print("Embedding shape:", embeddings.shape)

    print("Đang lưu vào ChromaDB...")

    store = ChromaStore(
        collection_name="documents"
    )

    store.add_chunks(
        chunks,
        embeddings,
    )

    print(f"Đã lưu {len(chunks)} chunks vào ChromaDB")

    try:
        print(
            "Tổng vector trong collection:",
            store.collection.count(),
        )
    except AttributeError:
        pass

    print("INGESTION HOÀN TẤT")

    return {
        "file_path": str(path),
        "chunk_count": len(chunks),
        "status": "ready",
    }