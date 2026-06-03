from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_MODE: str = "local"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"


settings = Settings()
