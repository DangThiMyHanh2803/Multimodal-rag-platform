"""
file_service.py
===============
Lớp dịch vụ xử lý file — bước đầu tiên trong pipeline RAG.

Vai trò:
    Upload file
        │
        ▼
    [file_service]  ←── bạn đang ở đây
        │  parse + clean + chunk
        ▼
    embedding_service  (encode chunk → vector)
        │
        ▼
    ChromaDB           (lưu vector)

Pipeline chi tiết:
    ┌─────────────────────────────────────────────────────────────┐
    │  File đầu vào (PDF / DOCX / TXT)                           │
    │       │                                                     │
    │  [1] _extract_text()   — trích xuất text từng trang        │
    │       │                                                     │
    │  [2] _clean_text()     — làm sạch (xóa noise, chuẩn hóa)  │
    │       │                                                     │
    │  [3] _chunk_text()     — tách thành đoạn nhỏ có overlap    │
    │       │                                                     │
    │  [4] embed_and_store() — gọi embedding_service lưu vào DB  │
    └─────────────────────────────────────────────────────────────┘

Lý thuyết Chunking (tham chiếu: Gao et al. 2023 — arXiv:2312.10997):
    - Chunk quá ngắn (<100 từ): thiếu ngữ cảnh, câu trả lời kém
    - Chunk quá dài (>1000 từ): vượt context window LLM, nhiều noise
    - Overlap (chồng lấn): giữ ngữ cảnh giữa các chunk liền kề
      chunk 1: dòng 1→100 | chunk 2: dòng 80→180 (overlap=20 dòng)
"""

from __future__ import annotations

import io
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Import thư viện parse tài liệu ───────────────────────────────────────────
try:
    import pdfplumber                          # parse PDF chất lượng cao
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdfplumber chưa cài — không hỗ trợ PDF. Chạy: pip install pdfplumber")

try:
    from docx import Document as DocxDocument  # parse DOCX
    DOCX_SUPPORT = True
except ImportError:
    DOCX_SUPPORT = False
    logger.warning("python-docx chưa cài — không hỗ trợ DOCX. Chạy: pip install python-docx")

# Import TextChunk từ embedding_service (dùng chung)
from app.services.embedding_service import TextChunk, embedding_service


# ── Cấu hình Chunking ─────────────────────────────────────────────────────────
CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", "800"))     # số ký tự tối đa mỗi chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))  # số ký tự chồng lấn giữa 2 chunk liền kề
MIN_CHUNK_LEN = int(os.getenv("MIN_CHUNK_LEN", "80"))   # bỏ chunk quá ngắn (header, số trang, ...)

# Thư mục lưu file upload tạm thời
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# DATA CLASS — Kết quả xử lý file
# =============================================================================

class ProcessedFile:
    """
    Kết quả trả về sau khi xử lý một file.

    Attributes:
        file_id    : ID duy nhất (UUID) do hệ thống tạo
        file_name  : Tên file gốc
        file_type  : "pdf" | "docx" | "txt"
        total_pages: Số trang (PDF) hoặc số đoạn văn (DOCX)
        chunks     : Danh sách TextChunk đã tách
        chunk_count: Số chunk đã lưu vào ChromaDB
        error      : Thông báo lỗi (None nếu thành công)
    """

    __slots__ = (
        "file_id", "file_name", "file_type",
        "total_pages", "chunks", "chunk_count", "error",
    )

    def __init__(
        self,
        file_id: str,
        file_name: str,
        file_type: str,
        total_pages: int = 0,
        chunks: Optional[list[TextChunk]] = None,
        chunk_count: int = 0,
        error: Optional[str] = None,
    ) -> None:
        self.file_id     = file_id
        self.file_name   = file_name
        self.file_type   = file_type
        self.total_pages = total_pages
        self.chunks      = chunks or []
        self.chunk_count = chunk_count
        self.error       = error

    def to_dict(self) -> dict:
        """Chuyển sang dict để trả về qua API."""
        return {
            "file_id"    : self.file_id,
            "file_name"  : self.file_name,
            "file_type"  : self.file_type,
            "total_pages": self.total_pages,
            "chunk_count": self.chunk_count,
            "status"     : "error" if self.error else "ready",
            "error"      : self.error,
        }


# =============================================================================
# FileService — CLASS CHÍNH
# =============================================================================

class FileService:
    """
    Lớp dịch vụ xử lý file tài liệu.

    Luồng chính:
        process_file(file_bytes, filename)
            → _detect_type()
            → _extract_text_*()     (tùy loại file)
            → _clean_text()
            → _chunk_text()
            → embedding_service.embed_and_store()
            → ProcessedFile

    Hỗ trợ:
        - PDF  : pdfplumber (giữ được thông tin trang)
        - DOCX : python-docx (giữ được cấu trúc đoạn văn)
        - TXT  : built-in Python (đọc thẳng)
    """

    # =========================================================================
    # PUBLIC METHOD — Gọi từ routes/files.py
    # =========================================================================

    async def process_file(
        self,
        file_bytes: bytes,
        filename: str,
        file_id: Optional[str] = None,
    ) -> ProcessedFile:
        """
        Xử lý một file từ đầu đến cuối: parse → chunk → embed → lưu DB.

        Args:
            file_bytes: Nội dung file nhị phân (từ HTTP upload)
            filename  : Tên file gốc (vd: "QCVN_40_2011.pdf")
            file_id   : ID tùy chỉnh (None = tự tạo UUID)

        Returns:
            ProcessedFile với kết quả xử lý và chunk_count

        Ví dụ dùng trong routes/files.py:
            result = await file_service.process_file(
                file_bytes=await upload.read(),
                filename=upload.filename,
            )
            return result.to_dict()
        """
        if file_id is None:
            file_id = str(uuid.uuid4())

        file_type = self._detect_type(filename)
        logger.info(
            "Bắt đầu xử lý file '%s' (type=%s, size=%d bytes)",
            filename, file_type, len(file_bytes),
        )

        # ── Bước 1: Trích xuất text theo loại file ────────────────────────────
        try:
            raw_pages: list[tuple[str, int]] = self._extract_text(
                file_bytes, file_type, filename
            )
        except Exception as exc:
            logger.error("Lỗi trích xuất file '%s': %s", filename, exc)
            return ProcessedFile(
                file_id=file_id, file_name=filename, file_type=file_type,
                error=f"Không thể đọc file: {exc}",
            )

        if not raw_pages:
            return ProcessedFile(
                file_id=file_id, file_name=filename, file_type=file_type,
                error="File không có nội dung văn bản.",
            )

        total_pages = len(raw_pages)

        # ── Bước 2 & 3: Làm sạch + Chunking ─────────────────────────────────
        all_chunks: list[TextChunk] = []
        for page_text, page_num in raw_pages:
            cleaned = self._clean_text(page_text)
            if not cleaned:
                continue

            page_chunks = self._chunk_text(
                text=cleaned,
                page_number=page_num,
                source_type=file_type,
                start_index=len(all_chunks),
            )
            all_chunks.extend(page_chunks)

        if not all_chunks:
            return ProcessedFile(
                file_id=file_id, file_name=filename, file_type=file_type,
                total_pages=total_pages,
                error="Không tách được chunk nào từ tài liệu.",
            )

        logger.info(
            "'%s': %d trang → %d chunks (avg %.0f chars/chunk)",
            filename, total_pages, len(all_chunks),
            sum(len(c.text) for c in all_chunks) / len(all_chunks),
        )

        # ── Bước 4: Embed + Lưu vào ChromaDB ─────────────────────────────────
        try:
            stored = embedding_service.embed_and_store(
                chunks=all_chunks,
                file_id=file_id,
                file_name=filename,
                replace_existing=True,   # xóa chunk cũ khi upload lại
            )
        except Exception as exc:
            logger.error("Lỗi embed file '%s': %s", filename, exc)
            return ProcessedFile(
                file_id=file_id, file_name=filename, file_type=file_type,
                total_pages=total_pages, chunks=all_chunks,
                error=f"Lỗi embedding: {exc}",
            )

        return ProcessedFile(
            file_id=file_id,
            file_name=filename,
            file_type=file_type,
            total_pages=total_pages,
            chunks=all_chunks,
            chunk_count=stored,
        )

    # =========================================================================
    # PRIVATE — Bước 1: Trích xuất text
    # =========================================================================

    def _detect_type(self, filename: str) -> str:
        """Phát hiện loại file từ phần mở rộng."""
        ext = Path(filename).suffix.lower().lstrip(".")
        mapping = {
            "pdf"  : "pdf",
            "docx" : "docx",
            "doc"  : "docx",     # cũng parse bằng python-docx
            "txt"  : "txt",
            "md"   : "txt",      # Markdown xử lý như text
        }
        return mapping.get(ext, "txt")

    def _extract_text(
        self,
        file_bytes: bytes,
        file_type: str,
        filename: str,
    ) -> list[tuple[str, int]]:
        """
        Dispatch sang hàm extract phù hợp theo loại file.

        Returns:
            list of (page_text, page_number) — mỗi phần tử là 1 trang/đoạn
        """
        if file_type == "pdf":
            return self._extract_pdf(file_bytes)
        elif file_type == "docx":
            return self._extract_docx(file_bytes)
        else:
            return self._extract_txt(file_bytes)

    def _extract_pdf(self, file_bytes: bytes) -> list[tuple[str, int]]:
        """
        Trích xuất text từ PDF dùng pdfplumber.

        pdfplumber ưu việt hơn PyPDF2 vì:
        - Xử lý tốt layout nhiều cột
        - Trích xuất bảng biểu (tables) chính xác hơn
        - Giữ thứ tự đọc tự nhiên của văn bản

        Mỗi trang PDF → một phần tử trong list (để theo dõi page_number).
        """
        if not PDF_SUPPORT:
            raise ImportError("pdfplumber chưa được cài đặt")

        pages: list[tuple[str, int]] = []
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    # Trích xuất text, bỏ qua trang trống
                    text = page.extract_text(
                        x_tolerance=3,      # dung sai ghép ký tự ngang
                        y_tolerance=3,      # dung sai ghép dòng
                    )
                    if text and text.strip():
                        pages.append((text, page_num))

                        # Thử trích xuất bảng biểu nếu có
                        tables = page.extract_tables()
                        if tables:
                            table_text = self._tables_to_text(tables)
                            if table_text:
                                # Gán cùng page_number với trang gốc
                                pages.append((table_text, page_num))

        except Exception as exc:
            logger.error("pdfplumber lỗi: %s", exc)
            raise

        logger.debug("PDF: trích xuất được %d trang có text", len(pages))
        return pages

    def _extract_docx(self, file_bytes: bytes) -> list[tuple[str, int]]:
        """
        Trích xuất text từ DOCX dùng python-docx.

        Chiến lược: gom các đoạn văn (paragraphs) thành "trang ảo"
        mỗi ~50 đoạn → 1 "trang" (vì DOCX không có khái niệm trang số).

        Xử lý thêm:
        - Bảng biểu (tables): ghép nội dung ô thành text
        - Heading: giữ để làm cấu trúc ngữ cảnh cho chunk
        """
        if not DOCX_SUPPORT:
            raise ImportError("python-docx chưa được cài đặt")

        doc = DocxDocument(io.BytesIO(file_bytes))
        segments: list[tuple[str, int]] = []

        # ── Đoạn văn ──────────────────────────────────────────────────────────
        PARAS_PER_PAGE = 30      # số đoạn văn tính là 1 "trang ảo"
        current_block: list[str] = []
        pseudo_page = 1

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            current_block.append(text)

            if len(current_block) >= PARAS_PER_PAGE:
                segments.append(("\n".join(current_block), pseudo_page))
                current_block = []
                pseudo_page += 1

        # Đoạn cuối còn dư
        if current_block:
            segments.append(("\n".join(current_block), pseudo_page))
            pseudo_page += 1

        # ── Bảng biểu ─────────────────────────────────────────────────────────
        for table in doc.tables:
            rows_text: list[str] = []
            for row in table.rows:
                cell_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cell_texts:
                    rows_text.append(" | ".join(cell_texts))
            if rows_text:
                table_content = "\n".join(rows_text)
                segments.append((table_content, pseudo_page))
                pseudo_page += 1

        logger.debug("DOCX: %d đoạn/bảng đã trích xuất", len(segments))
        return segments

    def _extract_txt(self, file_bytes: bytes) -> list[tuple[str, int]]:
        """
        Đọc file text thuần (TXT, Markdown).

        Tự động detect encoding: UTF-8 → UTF-8 with BOM → Latin-1.
        Chia thành "trang ảo" theo số dòng.
        """
        LINES_PER_PAGE = 100    # số dòng tính là 1 "trang ảo"

        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                content = file_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            content = file_bytes.decode("latin-1", errors="replace")

        lines = content.splitlines()
        segments: list[tuple[str, int]] = []

        for i in range(0, len(lines), LINES_PER_PAGE):
            block = "\n".join(lines[i : i + LINES_PER_PAGE])
            if block.strip():
                page_num = i // LINES_PER_PAGE + 1
                segments.append((block, page_num))

        return segments

    @staticmethod
    def _tables_to_text(tables: list) -> str:
        """
        Chuyển bảng pdfplumber thành text dạng "col1 | col2 | col3".

        Dùng cho PDF có bảng biểu (vd: QCVN với bảng tiêu chuẩn).
        """
        lines: list[str] = []
        for table in tables:
            for row in table:
                if row:
                    cells = [str(cell).strip() if cell else "" for cell in row]
                    non_empty = [c for c in cells if c]
                    if non_empty:
                        lines.append(" | ".join(non_empty))
        return "\n".join(lines)

    # =========================================================================
    # PRIVATE — Bước 2: Làm sạch text
    # =========================================================================

    def _clean_text(self, text: str) -> str:
        """
        Làm sạch văn bản trước khi chunking.

        Các vấn đề thường gặp khi đọc PDF/DOCX:
        1. Ký tự xuống dòng lung tung (\\n \\r \\t)
        2. Khoảng trắng thừa do layout nhiều cột
        3. Header/footer lặp lại (số trang, tên tài liệu)
        4. Ký tự không phải UTF-8 (ký tự đặc biệt của Word)
        5. Dòng chỉ có số (số trang) hoặc ký tự đặc biệt

        Nguyên tắc: làm sạch nhẹ nhàng, KHÔNG thay đổi nội dung.
        Dấu tiếng Việt được giữ nguyên (Unicode NFC).
        """
        if not text:
            return ""

        # ── 1. Chuẩn hóa Unicode (NFC) — giữ dấu tiếng Việt ────────────────
        import unicodedata
        text = unicodedata.normalize("NFC", text)

        # ── 2. Thay thế ký tự đặc biệt của Word/PDF ─────────────────────────
        replacements = {
            "’": "'",   # right single quotation mark
            "‘": "'",   # left single quotation mark
            "“": '"',   # left double quotation mark
            "”": '"',   # right double quotation mark
            "–": "-",   # en dash
            "—": "-",   # em dash
            " ": " ",   # non-breaking space
            "­": "",    # soft hyphen
            "�": "",    # replacement character (ký tự lỗi)
        }
        for old, new in replacements.items():
            text = text.replace(old, new)

        # ── 3. Xóa header/footer dạng số trang ──────────────────────────────
        # Dòng chỉ chứa số (vd: "3", "- 15 -") → bỏ
        text = re.sub(r"^\s*[-–—]?\s*\d+\s*[-–—]?\s*$", "", text, flags=re.MULTILINE)

        # ── 4. Gộp nhiều dòng trống liên tiếp thành 1 ───────────────────────
        text = re.sub(r"\n{3,}", "\n\n", text)

        # ── 5. Gộp dòng bị ngắt giữa chừng (word wrap) ──────────────────────
        # Dòng không kết thúc bằng dấu chấm câu → nối với dòng tiếp theo
        text = re.sub(
            r"([^\.\!\?\:\n])\n([^\n\-\•\*\d])",
            r"\1 \2",
            text,
        )

        # ── 6. Chuẩn hóa khoảng trắng ───────────────────────────────────────
        text = re.sub(r"[ \t]{2,}", " ", text)   # nhiều space → 1 space
        text = re.sub(r" +\n", "\n", text)        # space trước xuống dòng

        return text.strip()

    # =========================================================================
    # PRIVATE — Bước 3: Chunking
    # =========================================================================

    def _chunk_text(
        self,
        text: str,
        page_number: int,
        source_type: str,
        start_index: int = 0,
    ) -> list[TextChunk]:
        """
        Tách văn bản thành các chunk nhỏ có overlap.

        Chiến lược (Sentence-aware chunking):
        1. Ưu tiên tách theo đoạn văn (\\n\\n) — giữ ngữ nghĩa trọn vẹn
        2. Nếu đoạn văn vẫn còn dài → tách theo câu (dấu chấm)
        3. Áp dụng sliding window với CHUNK_OVERLAP để giữ ngữ cảnh

        Ví dụ minh họa (CHUNK_SIZE=20, OVERLAP=5):
            text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            → chunk 1: "ABCDEFGHIJKLMNOPQRST" (0→20)
            → chunk 2: "PQRSTUVWXYZ"          (15→26, overlap=5)

        Tại sao cần overlap?
            Câu hỏi: "BOD tiêu chuẩn là bao nhiêu?"
            Câu trả lời nằm ở biên chunk 1/chunk 2 → nếu không overlap
            thì cả 2 chunk đều thiếu thông tin, câu trả lời sai.

        Args:
            text        : Văn bản đã làm sạch
            page_number : Số trang để gán vào metadata
            source_type : "pdf" | "docx" | "txt"
            start_index : Index bắt đầu đếm chunk (để chunk_index liên tục)

        Returns:
            Danh sách TextChunk
        """
        chunks: list[TextChunk] = []

        # ── Tách theo đoạn văn trước ─────────────────────────────────────────
        # Đoạn văn là khối text ngăn cách bởi 1+ dòng trống
        paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]

        # ── Gộp đoạn văn thành window với overlap ────────────────────────────
        current_chars = 0
        window: list[str] = []
        chunk_idx = start_index

        def flush_window() -> None:
            """Đẩy nội dung window hiện tại thành 1 chunk."""
            nonlocal chunk_idx
            if not window:
                return
            chunk_text = "\n\n".join(window)
            if len(chunk_text) >= MIN_CHUNK_LEN:
                chunks.append(TextChunk(
                    text=chunk_text,
                    page_number=page_number,
                    source_type=source_type,
                    chunk_index=chunk_idx,
                ))
                chunk_idx += 1

        for para in paragraphs:
            para_len = len(para)

            if para_len > CHUNK_SIZE:
                # Đoạn văn quá dài → tách thêm theo câu
                sub_chunks = self._split_long_paragraph(
                    para, page_number, source_type, chunk_idx
                )
                # Flush window trước khi xử lý sub-chunks
                flush_window()
                window = []
                current_chars = 0

                chunks.extend(sub_chunks)
                chunk_idx += len(sub_chunks)
                continue

            # Kiểm tra có vượt CHUNK_SIZE không
            if current_chars + para_len > CHUNK_SIZE and window:
                flush_window()
                # Giữ lại một phần window cuối để tạo overlap
                overlap_chars = 0
                overlap_window: list[str] = []
                for prev_para in reversed(window):
                    if overlap_chars + len(prev_para) <= CHUNK_OVERLAP:
                        overlap_window.insert(0, prev_para)
                        overlap_chars += len(prev_para)
                    else:
                        break
                window = overlap_window
                current_chars = overlap_chars

            window.append(para)
            current_chars += para_len

        # Chunk cuối còn dư
        flush_window()

        return chunks

    def _split_long_paragraph(
        self,
        para: str,
        page_number: int,
        source_type: str,
        start_idx: int,
    ) -> list[TextChunk]:
        """
        Tách đoạn văn quá dài (> CHUNK_SIZE) thành các chunk nhỏ hơn.

        Dùng sliding window theo ký tự với bước = CHUNK_SIZE - CHUNK_OVERLAP.
        Cố gắng tách tại ranh giới câu (dấu chấm + khoảng trắng) để
        tránh cắt giữa câu.
        """
        chunks: list[TextChunk] = []
        step = CHUNK_SIZE - CHUNK_OVERLAP
        start = 0
        idx = start_idx

        while start < len(para):
            end = start + CHUNK_SIZE

            if end < len(para):
                # Tìm ranh giới câu gần nhất (dấu chấm + space/newline)
                # Tìm lùi từ vị trí end để không cắt giữa câu
                boundary = para.rfind(". ", start, end)
                if boundary == -1:
                    boundary = para.rfind(".\n", start, end)
                if boundary != -1 and boundary > start:
                    end = boundary + 1     # +1 để bao gồm dấu chấm

            chunk_text = para[start:end].strip()
            if len(chunk_text) >= MIN_CHUNK_LEN:
                chunks.append(TextChunk(
                    text=chunk_text,
                    page_number=page_number,
                    source_type=source_type,
                    chunk_index=idx,
                ))
                idx += 1

            start = end - CHUNK_OVERLAP    # dịch sang phải, trừ phần overlap

        return chunks


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================
file_service = FileService()
