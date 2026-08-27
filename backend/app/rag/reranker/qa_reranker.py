from sentence_transformers import CrossEncoder

class BertReranker:

    def __init__(self):
        self.model = CrossEncoder(
            "itdainb/PhoRanker"
        )

    def rerank(
        self,
        question: str,
        documents: list[dict],
        top_k: int | None = None,
    ):
        if not documents:
            return []

        pairs = [
            [question, doc["text"]]
            for doc in documents
        ]

        scores = self.model.predict(pairs)

        ranked_documents = []

        for document, score in zip(documents, scores):
            ranked_documents.append({
                **document,
                "rerank_score": float(score),
            })

        ranked_documents.sort(
            key=lambda item: item["rerank_score"],
            reverse=True,
        )

        if top_k is not None:
            return ranked_documents[:top_k]

        return ranked_documents
