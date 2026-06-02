"""
embedding_service.py
====================
Lớp dịch vụ Embedding — chuyển đổi văn bản thành vector số.

Vai trò trong pipeline:
    file_service (chunk text)
        │
        ▼
    [embedding_service]  ←── bạn đang ở đây
        │  encode(text) → vector [0.12, -0.45, 0.88, ...]
        ▼
    chroma.py (lưu vector vào ChromaDB)
        │
        ▼
    rag_service (đọc vector để tìm kiếm)

Model sử dụng: BAAI/bge-m3
    - Hỗ trợ hơn 100 ngôn ngữ kể cả tiếng Việt
    - Vector dimension: 1024 chiều
    - Max sequence length: 8192 tokens
    - Hỗ trợ 3 loại retrieval: Dense, Sparse, Multi-Vector (ColBERT)
    - Trong project này dùng Dense retrieval (phổ biến nhất)

Tham chiếu: Chen et al. (2024) "BGE M3-Embedding" — arXiv:2309.07597
"""

from __future__ import annotations

import hashlib
import logging
import os
import uuid
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

from app.db.chroma import upsert_chunks, delete_chunks_by_file, count_chunks_by_file

load_dotenv()
logger = logging.getLogger(__name__)

# ── Cấu hình ──────────────────────────────────────────────────────────────────
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

# Batch size khi encode nhiều chunk cùng lúc
# Giảm nếu gặp OOM (out of memory) trên máy yếu
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "32"))

# Tiền tố cho passage (chunk tài liệu) — khác với query prefix trong rag_service
# bge-m3 khuyến nghị dùng prefix để phân biệt query vs passage
PASSAGE_PREFIX = "Represent this passage for retrieval: "


# =============================================================================
# EmbeddingService — CLASS CHÍNH
# =============================================================================

class EmbeddingService:
    """
    Lớp dịch vụ Embedding.

    Chức năng chính:
    1. encode_texts()      : chuyển list[str] → list[vector]
    2. embed_and_store()   : encode chunks + lưu vào ChromaDB
    3. encode_query()      : encode câu hỏi (dùng trong rag_service)

    Singleton: model bge-m3 (~2GB) chỉ load vào RAM một lần.
    """

    _instance: Optional["EmbeddingService"] = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True

        logger.info("Đang load Embedding model: %s ...", EMBEDDING_MODEL_NAME)
        self.model: SentenceTransformer = SentenceTransformer(EMBEDDING_MODEL_NAME)
        self.dimension: int = self.model.get_sentence_embedding_dimension()
        logger.info(
            "Embedding model sẵn sàng — dimension=%d, max_seq_len=%d",
            self.dimension,
            self.model.max_seq_length,
        )

    # =========================================================================
    # PUBLIC METHODS
    # =========================================================================

    def encode_texts(
        self,
        texts: list[str],
        is_query: bool = False,
        show_progress: bool = False,
    ) -> list[list[float]]:
        """
        Chuyển danh sách văn bản thành danh sách vector embedding.

        Args:
            texts        : Danh sách chuỗi văn bản cần encode
            is_query     : True nếu đây là câu hỏi (dùng query prefix),
                           False nếu là chunk tài liệu (dùng passage prefix)
            show_progress: Hiển thị progress bar khi encode nhiều chunk

        Returns:
            Danh sách vector, mỗi vector có độ dài = self.dimension (1024)

        Ví dụ:
            vectors = embedding_service.encode_texts(["BOD là gì?"], is_query=True)
            # → [[0.12, -0.45, 0.88, ..., 0.03]]  (1024 số)
        """
        if not texts:
            return []

        # Thêm prefix phù hợp cho từng loại input
        # bge-m3 dùng prefix để phân biệt ngữ cảnh encode
        if is_query:
            prefixed = [
                f"Represent this sentence for searching relevant passages: {t}"
                for t in texts
            ]
        else:
            prefixed = [f"{PASSAGE_PREFIX}{t}" for t in texts]

        # encode_batch: xử lý theo batch để tránh OOM
        vectors = self.model.encode(
            prefixed,
            batch_size=EMBED_BATCH_SIZE,
            normalize_embeddings=True,      # L2 normalize → cosine sim = dot product
            show_progress_bar=show_progress,
            convert_to_numpy=True,
        )

        # Chuyển numpy array → Python list (để ChromaDB và JSON serialize được)
        return vectors.tolist()

    def encode_query(self, question: str) -> list[float]:
        """
        Encode một câu hỏi đơn lẻ → vector.
        Wrapper tiện lợi cho rag_service.
        """
        results = self.encode_texts([question], is_query=True)
        return results[0] if results else []

    def embed_and_store(
        self,
        chunks: list["TextChunk"],
        file_id: str,
        file_name: str,
        replace_existing: bool = True,
    ) -> int:
        """
        Pipeline đầy đủ: encode chunks + lưu vào ChromaDB.

        Đây là hàm được gọi từ file_service sau khi chunking xong.

        Args:
            chunks          : Danh sách TextChunk từ file_service
            file_id         : ID duy nhất của file (để filter sau này)
            file_name       : Tên hiển thị của file
            replace_existing: Xóa chunk cũ trước khi lưu mới (khi upload lại)

        Returns:
            Số chunk đã lưu thành công

        Quy trình:
            1. Xóa chunk cũ (nếu replace_existing=True)
            2. Encode tất cả chunk text → vectors
            3. Tạo ID duy nhất cho mỗi chunk
            4. Upsert vào ChromaDB với metadata
        """
        if not chunks:
            logger.warning("embed_and_store: không có chunk nào để lưu")
            return 0

        # ── Bước 1: Xóa chunk cũ nếu cần ─────────────────────────────────────
        if replace_existing:
            deleted = delete_chunks_by_file(file_id)
            if deleted > 0:
                logger.info("Đã xóa %d chunk cũ của file '%s'", deleted, file_name)

        # ── Bước 2: Encode tất cả chunk text ─────────────────────────────────
        texts = [chunk.text for chunk in chunks]
        logger.info(
            "Đang encode %d chunks của file '%s' ...", len(texts), file_name
        )
        vectors = self.encode_texts(
            texts,
            is_query=False,
            show_progress=len(texts) > 10,   # hiện progress bar nếu nhiều chunk
        )

        # ── Bước 3 & 4: Tạo ID + metadata + upsert vào ChromaDB ──────────────
        ids: list[str]        = []
        embeddings: list      = []
        documents: list[str]  = []
        metadatas: list[dict] = []

        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            # ID: kết hợp file_id + index để đảm bảo duy nhất
            # Dùng hash ngắn để tránh ID quá dài
            chunk_hash = hashlib.md5(
                f"{file_id}_{i}_{chunk.text[:50]}".encode()
            ).hexdigest()[:12]
            chunk_id = f"{file_id}_{chunk_hash}"

            ids.append(chunk_id)
            embeddings.append(vector)
            documents.append(chunk.text)
            metadatas.append({
                "file_id"     : file_id,
                "file_name"   : file_name,
                "chunk_index" : i,                           # thứ tự chunk trong file
                "page_number" : chunk.page_number or 0,      # trang trong tài liệu gốc
                "char_count"  : len(chunk.text),             # độ dài chunk (chars)
                "source_type" : chunk.source_type or "text", # pdf / docx / txt
            })

        # Lưu batch vào ChromaDB
        upsert_chunks(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

        stored_count = count_chunks_by_file(file_id)
        logger.info(
            "Hoàn thành embedding '%s': %d chunks trong ChromaDB",
            file_name, stored_count,
        )
        return stored_count

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """
        Tính cosine similarity giữa 2 vector.

        Vì các vector đã được L2-normalize trong encode_texts(),
        cosine similarity = dot product (nhanh hơn tính thủ công).

        Returns:
            Giá trị trong [-1, 1], càng gần 1 càng giống nhau.
        """
        a = np.array(vec_a)
        b = np.array(vec_b)
        dot = float(np.dot(a, b))
        norm = float(np.linalg.norm(a) * np.linalg.norm(b))
        return dot / norm if norm > 0 else 0.0


# =============================================================================
# DATA CLASS dùng chung giữa file_service và embedding_service
# =============================================================================

class TextChunk:
    """
    Đại diện cho một đoạn văn bản sau khi chunking.

    Attributes:
        text        : Nội dung văn bản của chunk
        page_number : Số trang trong tài liệu gốc (None nếu không biết)
        source_type : Loại file nguồn ("pdf", "docx", "txt", ...)
        chunk_index : Thứ tự chunk trong file (bắt đầu từ 0)
    """

    __slots__ = ("text", "page_number", "source_type", "chunk_index")

    def __init__(
        self,
        text: str,
        page_number: Optional[int] = None,
        source_type: str = "text",
        chunk_index: int = 0,
    ) -> None:
        self.text        = text.strip()
        self.page_number = page_number
        self.source_type = source_type
        self.chunk_index = chunk_index

    def __repr__(self) -> str:
        return (
            f"TextChunk(page={self.page_number}, "
            f"chars={len(self.text)}, "
            f"preview={self.text[:40]!r})"
        )


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================
embedding_service = EmbeddingService()
