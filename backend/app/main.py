from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.chat import router as chat_router
from app.routers.auth import router as auth_router
from app.routers.documents import router as document_router
from app.routers.workspaces import router as workspace_router

app = FastAPI(title="Multimodal RAG Platform", description="Backend API for Multimodal RAG Platform", version="1.0.0",)
app.include_router(auth_router, prefix="/api",)
app.include_router(document_router, prefix="/api",)
app.include_router(chat_router, prefix="/api")
app.include_router(workspace_router, prefix="/api"
                   )
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {
        "message": "Multimodal RAG Platform API",
        "status": "running",
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }