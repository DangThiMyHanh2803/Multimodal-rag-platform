from backend.app.evaluation.metrics import (recall_at_k, reciprocal_rank_at_k, evaluate_retrieval)

def main():
    # Ground truth

    qrels = [
        {
            "query_id": "q_00001",
            "chunk_id": "chunk_00002",
            "relevance": 1
        },
        {
            "query_id": "q_00002",
            "chunk_id": "chunk_00005",
            "relevance": 1
        }
    ]

    # Kết quả giả lập của model

    results = {
        "q_00001": [
            "chunk_00010",
            "chunk_00002",
            "chunk_00008"
        ],
        "q_00002": [
            "chunk_00005",
            "chunk_00020",
            "chunk_00001"
        ]
    }
    # Test Recall@K

    relevant_q1 = {"chunk_00002"}
    retrieved_q1 = [
        "chunk_00010",
        "chunk_00002",
        "chunk_00008"
    ]
    recall_1 = recall_at_k(
        retrieved_q1,
        relevant_q1,
        1
    )
    recall_5 = recall_at_k(
        retrieved_q1,
        relevant_q1,
        5
    )
    print()
    print("QUERY: q_00001")
    print(f"Recall@1: {recall_1}")
    print(f"Recall@5: {recall_5}")
    # Test MRR

    mrr_5 = reciprocal_rank_at_k(retrieved_q1, relevant_q1, 5)
    print(f"MRR@5: {mrr_5}")
    # Test toàn bộ dataset
    metrics = evaluate_retrieval(results, qrels, k_values=[1, 5, 10])
    print()
    print("Kết quả")

    for name, value in metrics.items():
        print(
            f"{name.upper():<12}: "
            f"{value:.4f}"
        )

if __name__ == "__main__":
    main()