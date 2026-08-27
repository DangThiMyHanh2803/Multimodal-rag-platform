import uuid
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.document_repository import DocumentRepository
from app.rag.embedding.embedding_model import VietnameseEmbedding
from app.rag.vectorstore.chroma_store import ChromaStore
from app.rag.reranker.qa_reranker import BertReranker
from app.rag.qa.extractive_qa import ExtractiveQuestionAnswering
from app.rag.retrieval.question_classifier import QuestionClassifier
from app.rag.retrieval.evidence_selector import EvidenceSelector
from app.rag.retrieval.evidence_aggregator import EvidenceAggregator
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse, SourceDocument


class ChatService:
    embedding_model = VietnameseEmbedding()
    reranker = BertReranker()
    qa_model = ExtractiveQuestionAnswering()
    question_classifier = QuestionClassifier()
    evidence_selector = EvidenceSelector()
    evidence_aggregator = EvidenceAggregator(reranker=reranker)

    def __init__(self, db: Session):
        self.db = db
        self.conversation_repository = ConversationRepository(db)

    def retrieve_documents(
        self,
        question: str,
        document_ids: list[str],
        top_k: int = 15,
    ) -> list[dict]:
        query_embedding = self.embedding_model.encode_query(question)
        store = ChromaStore(collection_name="documents")

        results = store.search(
            query_embedding=query_embedding,
            document_ids=document_ids,
            top_k=top_k,
        )

        texts = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        documents = []

        for index, (text, metadata, distance) in enumerate(
            zip(texts, metadatas, distances)
        ):
            documents.append({
                "text": text,
                "metadata": metadata,
                "distance": distance,
                "dense_rank": index + 1,
            })

        return documents

    def get_neighbor_chunk(
        self,
        document_id: str,
        chunk_id: int,
    ) -> dict | None:
        store = ChromaStore(collection_name="documents")

        results = store.collection.get(
            where={
                "$and": [
                    {
                        "document_id": {
                            "$eq": document_id
                        }
                    },
                    {
                        "chunk_id": {
                            "$eq": chunk_id
                        }
                    },
                ]
            },
            include=[
                "documents",
                "metadatas",
            ],
        )

        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])

        if not documents or not metadatas:
            return None

        return {
            "text": documents[0],
            "metadata": metadatas[0],
        }

    def chat(
        self,
        user_id: str,
        request: ChatQueryRequest,
    ) -> ChatQueryResponse:
        documents = DocumentRepository.get_documents_by_ids(
            self.db,
            request.document_ids,
        )

        found_ids = {
            document.id
            for document in documents
        }

        if any(
            document_id not in found_ids
            for document_id in request.document_ids
        ):
            raise ValueError(
                "Một hoặc nhiều document không tồn tại"
            )

        if any(
            document.workspace_id != request.workspace_id
            for document in documents
        ):
            raise ValueError(
                "Document không thuộc workspace hiện tại"
            )

        if request.conversation_id:
            conversation = self.conversation_repository.get_by_id(
                request.conversation_id
            )

            if not conversation:
                raise ValueError(
                    "Conversation không tồn tại"
                )

            if conversation.user_id != user_id:
                raise ValueError(
                    "Bạn không có quyền truy cập conversation này"
                )
        else:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                workspace_id=request.workspace_id,
                title=request.question[:255],
            )

            self.conversation_repository.create(
                conversation
            )

        user_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=request.question,
        )

        self.conversation_repository.add_message(
            user_message
        )

        answer, sources = self.generate_answer(
            request.question,
            request.document_ids,
        )

        assistant_message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sources=[
                {
                    "document_id": source.document_id,
                    "chunk_id": source.chunk_id,
                    "page_number": source.page_number,
                }
                for source in sources
            ],
        )

        self.conversation_repository.add_message(
            assistant_message
        )

        self.db.commit()

        return ChatQueryResponse(
            conversation_id=conversation.id,
            message_id=assistant_message.id,
            answer=answer,
            sources=sources,
        )

    def generate_answer(
        self,
        question: str,
        document_ids: list[str],
    ) -> tuple[str, list[SourceDocument]]:
        question_type = self.question_classifier.classify(
            question
        )

        print(
            "Question type:",
            question_type,
        )

        if question_type == "aggregate":
            answer, sources = self._answer_aggregate(
                question,
                document_ids,
            )

            if answer:
                return answer, sources

        return self._answer_extractive(
            question,
            document_ids,
        )

    def _answer_extractive(
        self,
        question: str,
        document_ids: list[str],
    ) -> tuple[str, list[SourceDocument]]:
        documents = self.retrieve_documents(
            question,
            document_ids,
            top_k=15,
        )

        if not documents:
            return (
                "Không tìm thấy nội dung phù hợp trong các tài liệu được chọn.",
                [],
            )

        reranked_documents = self.reranker.rerank(
            question=question,
            documents=documents,
        )

        if not reranked_documents:
            return (
                "Không tìm thấy câu trả lời phù hợp trong tài liệu.",
                [],
            )

        candidates = reranked_documents[:8]

        for index, document in enumerate(candidates):
            document["rerank_rank"] = index + 1

            result = self.qa_model.answer(
                question=question,
                context=document["text"],
            )

            document["qa_answer"] = result["answer"].strip()
            document["qa_score"] = result["score"]

            print(
                f"rerank={document['rerank_rank']} | "
                f"qa_score={document['qa_score']:.6f} | "
                f"answer={document['qa_answer']}"
            )

        best_document = max(
            candidates,
            key=lambda item: item["qa_score"],
        )

        best_answer = best_document["qa_answer"]
        best_score = best_document["qa_score"]

        if not best_answer or best_score < 0.02:
            return (
                "Không tìm thấy câu trả lời phù hợp trong tài liệu.",
                [],
            )

        metadata = best_document["metadata"]

        sources = [
            SourceDocument(
                document_id=metadata["document_id"],
                chunk_id=int(metadata["chunk_id"]),
                content=best_document["text"],
                page_number=metadata.get("page_number"),
            )
        ]

        return best_answer, sources

    def _answer_aggregate(
        self,
        question: str,
        document_ids: list[str],
    ) -> tuple[str, list[SourceDocument]]:
        documents = self.retrieve_documents(
            question,
            document_ids,
            top_k=15,
        )

        if not documents:
            return "", []

        reranked_documents = self.reranker.rerank(
            question=question,
            documents=documents,
        )

        if not reranked_documents:
            return "", []

        selected_documents = self.evidence_selector.select(
            reranked_documents
        )

        if selected_documents:
            anchor = selected_documents[0]
        else:
            anchor = reranked_documents[0]

        metadata = anchor["metadata"]
        document_id = metadata["document_id"]
        chunk_id = int(metadata["chunk_id"])

        documents_for_answer = [
            anchor
        ]

        next_chunk = self.get_neighbor_chunk(
            document_id=document_id,
            chunk_id=chunk_id + 1,
        )

        if next_chunk:
            documents_for_answer.append(
                next_chunk
            )

        answer = self.evidence_aggregator.aggregate(
            documents_for_answer,
            question,
        )

        if not answer:
            return "", []

        sources = []
        source_keys = set()

        for document in documents_for_answer:
            metadata = document["metadata"]

            source_key = (
                metadata["document_id"],
                int(metadata["chunk_id"]),
            )

            if source_key in source_keys:
                continue

            sources.append(
                SourceDocument(
                    document_id=metadata["document_id"],
                    chunk_id=int(metadata["chunk_id"]),
                    content=document["text"],
                    page_number=metadata.get("page_number"),
                )
            )

            source_keys.add(
                source_key
            )

        return answer, sources