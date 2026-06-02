"""
routes/files.py
===============
REST API endpoints quản lý tài liệu.

Endpoints:
    POST   /api/files/upload     — upload 1 file, parse + embed + lưu ChromaDB
    GET    /api/files            — danh sách file đã upload
    GET    /api/files/{file_id}  — thông tin chi tiết 1 file
    DELETE /api/files/{file_id}  — xóa file + toàn bộ chunk khỏi ChromaDB

Luồng upload:
    Client gửi multipart/form-data
        │
        ▼
    validate_file()          — kiểm tra type, size
        │
        ▼
    file_service.process_file()
        ├── parse PDF/DOCX/TXT
        ├── clean + chunk
        └── embed → ChromaDB
        │
        ▼
    Trả về FileResponse (file_id, chunk_count, status)
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.db.chroma import delete_chunks_by_file, count_chunks_by_file, get_total_chunks
from app.services.file_service import file_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["Files"])

# ── Cấu hình ──────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE    = MAX_FILE_SIZE_MB * 1024 * 1024   # bytes

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}

# In-memory store — thay bằng DB thật ở Ưu tiên 3 (Auth + DB)
# Key: file_id, Value: dict metadata
_file_store: dict[str, dict] = {}


# =============================================================================
# Pydantic Schemas
# =============================================================================

class FileResponse(BaseModel):
    """Schema trả về khi upload file thành công."""
    file_id    : str
    file_name  : str
    file_type  : str
    total_pages: int
    chunk_count: int
    status     : str          # "ready" | "error"
    error      : Optional[str] = None


class FileListItem(BaseModel):
    """Schema một item trong danh sách file."""
    file_id    : str
    file_name  : str
    file_type  : str
    chunk_count: int
    status     : str


class FileListResponse(BaseModel):
    """Schema danh sách file."""
    files      : list[FileListItem]
    total_files: int
    total_chunks: int


class DeleteResponse(BaseModel):
    """Schema xác nhận xóa file."""
    file_id      : str
    deleted_chunks: int
    message      : str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post(
    "/upload",
    response_model=FileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload tài liệu",
    description="Upload file PDF, DOCX hoặc TXT. File sẽ được parse, "
                "chunking, embed và lưu vào ChromaDB tự động.",
)
async def upload_file(
    file: UploadFile = File(..., description="File PDF, DOCX hoặc TXT"),
):
    """
    Upload một file tài liệu vào hệ thống.

    Pipeline tự động:
        1. Validate loại file và kích thước
        2. Đọc nội dung file (bytes)
        3. file_service.process_file() → parse + chunk + embed + lưu ChromaDB
        4. Lưu metadata vào _file_store
        5. Trả về FileResponse

    Raises:
        400: File không hợp lệ (sai type, không có nội dung)
        413: File vượt quá giới hạn kích thước
        422: Không tách được chunk (file rỗng hoặc chỉ có ảnh)
        500: Lỗi hệ thống (ChromaDB, model, ...)
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    _validate_file(file)

    # ── Đọc file bytes ────────────────────────────────────────────────────────
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File rỗng — không có nội dung để xử lý.",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File vượt quá {MAX_FILE_SIZE_MB}MB. "
                   f"Kích thước hiện tại: {len(file_bytes) / 1024 / 1024:.1f}MB.",
        )

    filename = file.filename or "unknown_file"
    logger.info("Nhận file upload: '%s' (%d bytes)", filename, len(file_bytes))

    # ── Xử lý file ────────────────────────────────────────────────────────────
    try:
        result = await file_service.process_file(
            file_bytes=file_bytes,
            filename=filename,
        )
    except Exception as exc:
        logger.error("Lỗi xử lý file '%s': %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xử lý file: {exc}",
        )

    # ── Trả lỗi nếu không parse được ─────────────────────────────────────────
    if result.error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.error,
        )

    # ── Lưu metadata vào store ────────────────────────────────────────────────
    _file_store[result.file_id] = {
        "file_id"    : result.file_id,
        "file_name"  : result.file_name,
        "file_type"  : result.file_type,
        "total_pages": result.total_pages,
        "chunk_count": result.chunk_count,
        "status"     : "ready",
    }

    logger.info(
        "Upload hoàn thành: '%s' → %d chunks (file_id=%s)",
        filename, result.chunk_count, result.file_id,
    )

    return FileResponse(**_file_store[result.file_id])


@router.get(
    "",
    response_model=FileListResponse,
    summary="Danh sách file đã upload",
)
async def list_files(
    file_type: Optional[str] = Query(None, description="Lọc theo loại: pdf, docx, txt"),
):
    """
    Trả về danh sách tất cả file đã upload.

    Query params:
        file_type: Lọc theo loại file (pdf | docx | txt)

    Returns:
        FileListResponse với danh sách file và thống kê tổng
    """
    files = list(_file_store.values())

    # Lọc theo loại file nếu có
    if file_type:
        files = [f for f in files if f["file_type"] == file_type.lower()]

    return FileListResponse(
        files=[FileListItem(**f) for f in files],
        total_files=len(files),
        total_chunks=get_total_chunks(),
    )


@router.get(
    "/{file_id}",
    response_model=FileResponse,
    summary="Chi tiết một file",
)
async def get_file(file_id: str):
    """
    Lấy thông tin chi tiết của một file theo file_id.

    Cũng đếm lại số chunk thực tế trong ChromaDB (có thể khác với lúc upload
    nếu có lỗi xảy ra giữa chừng).

    Raises:
        404: Không tìm thấy file với file_id này
    """
    meta = _file_store.get(file_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy file với ID '{file_id}'.",
        )

    # Đếm lại chunk thực tế trong ChromaDB
    actual_chunks = count_chunks_by_file(file_id)
    meta["chunk_count"] = actual_chunks

    return FileResponse(**meta)


@router.delete(
    "/{file_id}",
    response_model=DeleteResponse,
    summary="Xóa file",
)
async def delete_file(file_id: str):
    """
    Xóa file và toàn bộ chunk của file khỏi ChromaDB.

    Raises:
        404: Không tìm thấy file với file_id này
    """
    if file_id not in _file_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy file với ID '{file_id}'.",
        )

    file_name = _file_store[file_id]["file_name"]

    # Xóa khỏi ChromaDB
    deleted_chunks = delete_chunks_by_file(file_id)

    # Xóa khỏi metadata store
    del _file_store[file_id]

    logger.info(
        "Đã xóa file '%s' (file_id=%s, chunks=%d)",
        file_name, file_id, deleted_chunks,
    )

    return DeleteResponse(
        file_id=file_id,
        deleted_chunks=deleted_chunks,
        message=f"Đã xóa '{file_name}' và {deleted_chunks} chunks.",
    )


# =============================================================================
# HELPER
# =============================================================================

def _validate_file(file: UploadFile) -> None:
    """
    Kiểm tra file upload hợp lệ trước khi xử lý.

    Kiểm tra:
    - Content-type phải nằm trong ALLOWED_TYPES
    - Phần mở rộng phải nằm trong ALLOWED_EXTENSIONS
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File không có tên.",
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loại file không được hỗ trợ: '{ext}'. "
                   f"Chấp nhận: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Content-type check (nếu browser gửi đúng)
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        # Chỉ cảnh báo, không block — một số browser gửi sai content-type
        logger.warning(
            "Content-type không quen: %s (file: %s)",
            file.content_type, file.filename,
        )
