"""
main.py
=======
FastAPI application entry point.

Khởi động:
    uvicorn app.main:app --reload --port 8000

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.files import router as files_router
from app.routes.chat  import router as chat_router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Multimodal RAG Platform",
    description="Hệ thống hỏi đáp tài liệu dựa trên mô hình Advanced RAG "
                "(bge-m3 + ChromaDB + bge-reranker-v2-m3 + GPT-4o-mini).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS — cho phép frontend React (localhost:5173) gọi API ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Đăng ký routers ───────────────────────────────────────────────────────────
app.include_router(files_router)
app.include_router(chat_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "RAG Backend đang chạy"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
