class EvidenceSelector:
    def __init__(self, max_chunks: int = 5, relative_threshold: float = 0.6):
        self.max_chunks = max_chunks
        self.relative_threshold = relative_threshold

    def select(self, documents: list[dict]) -> list[dict]:
        if not documents:
            return []

        top_score = documents[0]["rerank_score"]

        if top_score < 0.1:
            return documents[:self.max_chunks]

        selected_documents = []

        for document in documents:
            if len(selected_documents) >= self.max_chunks:
                break

            score = document["rerank_score"]

            if score >= top_score * self.relative_threshold:
                selected_documents.append(document)

        if not selected_documents:
            return documents[:1]

        return selected_documents
    def build_context(self, documents: list[dict], max_characters: int = 6000) -> str:
        parts = []
        current_length = 0

        for index, document in enumerate(documents):
            text = document["text"].strip()

            if not text:
                continue

            part = f"[Đoạn {index + 1}]\n{text}"

            if current_length + len(part) > max_characters:
                break

            parts.append(part)
            current_length += len(part)

        return "\n\n".join(parts)
    def is_multi_evidence(self, documents: list[dict]) -> bool:
        selected_documents = self.select(documents)

        return len(selected_documents) >= 2