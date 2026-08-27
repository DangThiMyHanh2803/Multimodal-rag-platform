import chromadb
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
CHROMA_DIR = BASE_DIR / "data" / "chroma"

class ChromaStore:

    def __init__(self, collection_name="documents"):
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            configuration={
                "hnsw": {
                    "space": "cosine"
                }
            }
        )

    def add_chunks(self, chunks, embeddings):
        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            ids.append(chunk["id"])
            documents.append(chunk["text"])

            metadata = {
                "document_id": chunk.get("document_id"),
                "file_name": chunk.get("file_name"),
                "file_type": chunk.get("file_type"),
                "title": chunk.get("title"),
                "chunk_id": chunk.get("chunk_id"),
                "page_number": chunk.get("page_number"),
            }

            metadatas.append({
                key: value
                for key, value in metadata.items()
                if value is not None
            })

        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings.tolist(),
            metadatas=metadatas,
        )

    def search(self, query_embedding, document_ids=None, top_k=5):
        params = {
            "query_embeddings": [query_embedding.tolist()],
            "n_results": top_k,
        }

        if document_ids:
            params["where"] = {
                "document_id": {
                    "$in": document_ids
                }
            }

        return self.collection.query(**params)
    def get_chunks_by_ids(self, document_id: str, chunk_ids: list[int],):
        if not chunk_ids:
            return []

        results = self.collection.get(
            where={
                "$and": [
                    {
                        "document_id": {
                            "$eq": document_id
                        }
                    },
                    {
                        "chunk_id": {
                            "$in": chunk_ids
                        }
                    },
                ]
            },
            include=["documents", "metadatas",],
        )

        chunks = []

        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])

        for text, metadata in zip(documents, metadatas,):
            chunks.append({"text": text, "metadata": metadata,})

        chunks.sort(
            key=lambda item: int(item["metadata"]["chunk_id"]))

        return chunks