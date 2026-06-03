"""
chroma.py
=========
Quản lý kết nối và thao tác với ChromaDB — vector database lưu trữ
các embedding chunk của tài liệu.

Vai trò trong pipeline:
    file_service  →  embedding_service  →  [chroma.py]  →  rag_service
                                              lưu vector       đọc vector
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import chromadb
from chromadb import Collection
from chromadb.config import Settings as ChromaSettings
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
CHROMA_MODE        = os.getenv("CHROMA_MODE", "local")   # "local" | "server"
CHROMA_HOST        = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT        = int(os.getenv("CHROMA_PORT", "8001"))


# =============================================================================
# ChromaDB Client — Singleton
# =============================================================================

class ChromaClientManager:
    _client: Optional[chromadb.ClientAPI] = None

    @classmethod
    def get_client(cls) -> chromadb.ClientAPI:
        if cls._client is None:
            if CHROMA_MODE == "local":
                cls._client = chromadb.PersistentClient(
                    path=CHROMA_PERSIST_DIR,
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
                logger.info("ChromaDB local mode: %s", CHROMA_PERSIST_DIR)
            else:
                cls._client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
                logger.info("ChromaDB server: %s:%s", CHROMA_HOST, CHROMA_PORT)
        return cls._client

    @classmethod
    def get_collection(cls, name: str = "rag_documents") -> Collection:
        client = cls.get_client()
        collection = client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Collection '%s' sẵn sàng (%d chunks)", name, collection.count())
        return collection

    @classmethod
    def reset(cls) -> None:
        cls._client = None


# =============================================================================
# Hàm thao tác ChromaDB
# =============================================================================

def get_collection(workspace_id: str = "default") -> Collection:
    return ChromaClientManager.get_collection(f"workspace_{workspace_id}")


def upsert_chunks(
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
    workspace_id: str = "default",
) -> None:
    """Lưu hoặc cập nhật chunks vào ChromaDB."""
    collection = get_collection(workspace_id)
    try:
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info("Đã lưu %d chunks vào workspace '%s'", len(ids), workspace_id)
    except Exception as exc:
        logger.error("Lỗi upsert ChromaDB: %s", exc)
        raise


def query_chunks(
    query_embedding: list[float],
    workspace_id: str = "default",
    top_k: int = 10,
    file_ids: list[str] | None = None,
) -> list[dict]:
    """Tìm top-k chunks gần nhất với query embedding."""
    collection = get_collection(workspace_id)

    where_filter = None
    if file_ids:
        where_filter = (
            {"file_id": {"$eq": file_ids[0]}}
            if len(file_ids) == 1
            else {"file_id": {"$in": file_ids}}
        )

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count() or 1),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    return [
        {
            "text": results["documents"][0][i],
            "file_id": results["metadatas"][0][i].get("file_id", ""),
            "file_name": results["metadatas"][0][i].get("file_name", ""),
            "page_number": results["metadatas"][0][i].get("page_number", 0),
            "score": 1 - results["distances"][0][i],
        }
        for i in range(len(results["documents"][0]))
    ]


def delete_chunks_by_file(file_id: str, workspace_id: str = "default") -> int:
    """Xóa tất cả chunk của một file."""
    collection = get_collection(workspace_id)
    try:
        results = collection.get(
            where={"file_id": {"$eq": file_id}},
            include=[],
        )
        chunk_ids = results.get("ids", [])
        if chunk_ids:
            collection.delete(ids=chunk_ids)
            logger.info("Đã xóa %d chunks của file '%s'", len(chunk_ids), file_id)
        return len(chunk_ids)
    except Exception as exc:
        logger.error("Lỗi xóa chunk: %s", exc)
        raise


def count_chunks_by_file(file_id: str, workspace_id: str = "default") -> int:
    """Đếm số chunk của một file."""
    try:
        results = get_collection(workspace_id).get(
            where={"file_id": {"$eq": file_id}}, include=[]
        )
        return len(results.get("ids", []))
    except Exception:
        return 0


def get_total_chunks(workspace_id: str = "default") -> int:
    """Tổng số chunk trong workspace — dùng cho Dashboard."""
    try:
        return get_collection(workspace_id).count()
    except Exception:
        return 0
