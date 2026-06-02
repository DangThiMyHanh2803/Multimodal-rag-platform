"""
chroma.py
=========
Quản lý kết nối và thao tác với ChromaDB — vector database lưu trữ
các embedding chunk của tài liệu.

Vai trò trong pipeline:
    file_service  →  embedding_service  →  [chroma.py]  →  rag_service
                                              lưu vector       đọc vector

ChromaDB hoạt động theo mô hình:
    Collection  : tương tự "bảng" trong SQL, chứa nhiều document
    Document    : một chunk văn bản + vector embedding của nó
    Metadata    : thông tin kèm theo (file_id, file_name, page_number, ...)
    ID          : chuỗi định danh duy nhất cho mỗi chunk
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import chromadb
from chromadb import Collection
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Cấu hình từ .env ──────────────────────────────────────────────────────────
CHROMA_HOST       = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT       = int(os.getenv("CHROMA_PORT", "8001"))
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "rag_documents")


# =============================================================================
# ChromaDB Client — Singleton
# =============================================================================

class ChromaClientManager:
    """
    Quản lý kết nối ChromaDB theo Singleton pattern.
    Đảm bảo chỉ có một kết nối duy nhất trong toàn bộ ứng dụng.
    """
    _client: Optional[chromadb.HttpClient] = None
    _collection: Optional[Collection] = None

    @classmethod
    def get_client(cls) -> chromadb.HttpClient:
        """Trả về ChromaDB HTTP client (tạo mới nếu chưa có)."""
        if cls._client is None:
            logger.info("Kết nối ChromaDB tại %s:%s", CHROMA_HOST, CHROMA_PORT)
            cls._client = chromadb.HttpClient(
                host=CHROMA_HOST,
                port=CHROMA_PORT,
            )
        return cls._client

    @classmethod
    def get_collection(cls) -> Collection:
        """
        Trả về collection chính (tạo mới nếu chưa tồn tại).

        Dùng cosine similarity — phù hợp nhất cho embedding văn bản
        vì đo góc giữa các vector, không bị ảnh hưởng bởi độ dài vector.
        """
        if cls._collection is None:
            client = cls.get_client()
            cls._collection = client.get_or_create_collection(
                name=CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("Collection '%s' sẵn sàng (%d chunks)",
                        CHROMA_COLLECTION, cls._collection.count())
        return cls._collection


# =============================================================================
# Hàm thao tác ChromaDB — dùng từ embedding_service và rag_service
# =============================================================================

def get_collection() -> Collection:
    """Lấy collection ChromaDB (shortcut cho các module khác import)."""
    return ChromaClientManager.get_collection()


def upsert_chunks(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    """
    Lưu (hoặc cập nhật) các chunk vào ChromaDB.

    Dùng upsert thay vì add để tránh lỗi trùng ID khi upload lại file.
    Nếu chunk_id đã tồn tại → cập nhật; nếu chưa có → thêm mới.

    Args:
        ids        : Danh sách ID duy nhất cho từng chunk
        embeddings : Danh sách vector embedding (mỗi vector ~ 1024 chiều với bge-m3)
        documents  : Danh sách text gốc của từng chunk
        metadatas  : Danh sách metadata kèm theo (file_id, file_name, page_number, ...)
    """
    collection = get_collection()
    try:
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info("Đã lưu %d chunks vào ChromaDB", len(ids))
    except Exception as exc:
        logger.error("Lỗi upsert ChromaDB: %s", exc)
        raise


def delete_chunks_by_file(file_id: str) -> int:
    """
    Xóa tất cả chunk thuộc về một file.

    Dùng khi người dùng xóa file hoặc upload lại file (để tránh chunk cũ
    lẫn với chunk mới).

    Args:
        file_id: ID của file cần xóa chunk

    Returns:
        Số chunk đã xóa
    """
    collection = get_collection()
    try:
        # Tìm tất cả chunk của file này trước
        results = collection.get(
            where={"file_id": {"$eq": file_id}},
            include=[],          # chỉ cần IDs, không cần document/embedding
        )
        chunk_ids = results.get("ids", [])
        if chunk_ids:
            collection.delete(ids=chunk_ids)
            logger.info("Đã xóa %d chunks của file_id='%s'", len(chunk_ids), file_id)
        return len(chunk_ids)
    except Exception as exc:
        logger.error("Lỗi xóa chunk file_id='%s': %s", file_id, exc)
        raise


def count_chunks_by_file(file_id: str) -> int:
    """Đếm số chunk của một file — dùng cho API status."""
    collection = get_collection()
    try:
        results = collection.get(
            where={"file_id": {"$eq": file_id}},
            include=[],
        )
        return len(results.get("ids", []))
    except Exception:
        return 0


def get_total_chunks() -> int:
    """Tổng số chunk trong toàn bộ collection — dùng cho Dashboard."""
    try:
        return get_collection().count()
    except Exception:
        return 0
