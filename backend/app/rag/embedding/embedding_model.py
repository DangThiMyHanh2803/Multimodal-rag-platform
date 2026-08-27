from sentence_transformers import SentenceTransformer

MODEL_NAME = "AITeamVN/Vietnamese_Embedding_v2"
class VietnameseEmbedding:
    _model = None
    def __init__(self):
        if VietnameseEmbedding._model is None:
            print(f"Đang tải embedding model: {MODEL_NAME}")

            VietnameseEmbedding._model = SentenceTransformer(
                MODEL_NAME
            )

            print("Embedding model loaded!")
            print(
                "Embedding dimension:",
                VietnameseEmbedding._model.get_sentence_embedding_dimension()
            )

        self.model = VietnameseEmbedding._model
    def encode(self, texts):
        return self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    def encode_query(self, query):
        return self.model.encode(query, normalize_embeddings=True, convert_to_numpy=True)