import chromadb
import numpy as np
from pathlib import Path

from app.rag.embedding.embedding_model import VietnameseEmbedding


BASE_DIR = Path(__file__).resolve().parents[1]
CHROMA_DIR = BASE_DIR / "data" / "chroma"


print("=" * 60)
print("TEST VIETNAMESE EMBEDDING + CHROMADB")
print("=" * 60)


# --------------------------------------------------
# 1. Load embedding model
# --------------------------------------------------

print("\nĐang tải embedding model...")

embedding_model = VietnameseEmbedding()

print("Embedding model loaded!")


# --------------------------------------------------
# 2. Tạo dữ liệu test
# --------------------------------------------------

texts = [
    "RAG là hệ thống hỏi đáp dựa trên tài liệu.",
    "Chunking giúp chia tài liệu thành các đoạn nhỏ.",
    "Embedding biến văn bản thành vector."
]

print("\nSố text:", len(texts))


# --------------------------------------------------
# 3. Embedding
# --------------------------------------------------

embeddings = embedding_model.encode(texts)

print("\nEmbedding:")
print("Shape:", embeddings.shape)
print("Dtype:", embeddings.dtype)

print("Dimension:", embeddings.shape[1])


# --------------------------------------------------
# 4. Kiểm tra vector
# --------------------------------------------------

print("\nVector đầu tiên:")

print(
    embeddings[0][:10]
)


# --------------------------------------------------
# 5. ChromaDB
# --------------------------------------------------

print("\nKhởi tạo ChromaDB...")

client = chromadb.PersistentClient(
    path=str(CHROMA_DIR)
)


# Xóa collection test cũ nếu có
try:
    client.delete_collection("embedding_test")
except Exception:
    pass


collection = client.create_collection(
    name="embedding_test",
    metadata={
        "hnsw:space": "cosine"
    }
)


print("Collection:", collection.name)


# --------------------------------------------------
# 6. Add embeddings
# --------------------------------------------------

ids = [
    "test_001",
    "test_002",
    "test_003"
]

collection.add(
    ids=ids,
    documents=texts,
    embeddings=embeddings.tolist()
)


print("\nĐã add embeddings!")


# --------------------------------------------------
# 7. Count
# --------------------------------------------------

print("\nCOUNT:")

print(
    collection.count()
)


# --------------------------------------------------
# 8. Query
# --------------------------------------------------

query = "Hệ thống RAG dùng tài liệu như thế nào?"

query_embedding = embedding_model.encode(
    [query]
)[0]


print("\nQuery embedding shape:")

print(
    query_embedding.shape
)


result = collection.query(
    query_embeddings=[
        query_embedding.tolist()
    ],
    n_results=3
)


print("\nQUERY RESULT:")

for i in range(len(result["ids"][0])):

    print("\n--------------------")

    print(
        "ID:",
        result["ids"][0][i]
    )

    print(
        "Distance:",
        result["distances"][0][i]
    )

    print(
        "Text:",
        result["documents"][0][i]
    )


print("\nTEST HOÀN TẤT")