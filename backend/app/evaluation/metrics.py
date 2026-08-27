from typing import Dict, List, Set


# ============================================================
# CHUẨN BỊ GROUND TRUTH
# ============================================================

def build_relevance_dict(
    qrels: List[dict]
) -> Dict[str, Set[str]]:
    """
    Chuyển qrels thành dạng:

    {
        "q_00001": {"chunk_00005"},
        "q_00002": {"chunk_00012", "chunk_00015"}
    }

    Mỗi query sẽ được ánh xạ tới tập các chunk đúng.
    """

    relevance_dict = {}

    for item in qrels:

        query_id = item["query_id"]
        chunk_id = item["chunk_id"]
        relevance = item.get("relevance", 0)

        # Chỉ lấy các chunk có relevance > 0
        if relevance > 0:

            if query_id not in relevance_dict:
                relevance_dict[query_id] = set()

            relevance_dict[query_id].add(chunk_id)

    return relevance_dict


# ============================================================
# RECALL@K
# ============================================================

def recall_at_k(
    retrieved_chunk_ids: List[str],
    relevant_chunk_ids: Set[str],
    k: int
) -> float:
    """
    Tính Recall@K cho một query.

    retrieved_chunk_ids:
        Danh sách chunk model tìm được theo thứ tự giảm dần
        độ tương đồng.

    relevant_chunk_ids:
        Các chunk đúng theo ground truth.

    k:
        Chỉ xét K kết quả đầu tiên.

    Trả về:
        1.0 nếu tìm được ít nhất một chunk đúng.
        0.0 nếu không tìm được.
    """

    if not relevant_chunk_ids:
        return 0.0

    top_k = retrieved_chunk_ids[:k]

    for chunk_id in top_k:

        if chunk_id in relevant_chunk_ids:
            return 1.0

    return 0.0


# ============================================================
# MRR@K
# ============================================================

def reciprocal_rank_at_k(
    retrieved_chunk_ids: List[str],
    relevant_chunk_ids: Set[str],
    k: int
) -> float:
    """
    Tính Reciprocal Rank tại K.

    Ví dụ:

    Top-K:
        1. chunk_10
        2. chunk_15
        3. chunk_05  ← đúng

    Reciprocal Rank = 1 / 3
    """

    if not relevant_chunk_ids:
        return 0.0

    top_k = retrieved_chunk_ids[:k]

    for rank, chunk_id in enumerate(top_k, start=1):

        if chunk_id in relevant_chunk_ids:
            return 1.0 / rank

    return 0.0


# ============================================================
# TÍNH METRICS CHO TOÀN BỘ DATASET
# ============================================================

def evaluate_retrieval(
    results: Dict[str, List[str]],
    qrels: List[dict],
    k_values: List[int] = None
) -> Dict[str, float]:
    """
    Đánh giá kết quả retrieval trên toàn bộ query.

    results có dạng:

    {
        "q_00000": [
            "chunk_00005",
            "chunk_00012",
            "chunk_00001"
        ],

        "q_00001": [
            "chunk_00008",
            "chunk_00003",
            "chunk_00015"
        ]
    }

    qrels chứa ground truth.

    Trả về các metric trung bình.
    """

    if k_values is None:
        k_values = [1, 5, 10]

    # Chuyển qrels thành dictionary
    relevance_dict = build_relevance_dict(qrels)

    # Lưu kết quả
    metrics = {}

    # --------------------------------------------------------
    # Recall@K
    # --------------------------------------------------------

    for k in k_values:

        scores = []

        for query_id, retrieved_chunks in results.items():

            relevant_chunks = relevance_dict.get(
                query_id,
                set()
            )

            score = recall_at_k(
                retrieved_chunks,
                relevant_chunks,
                k
            )

            scores.append(score)

        if scores:
            metrics[f"recall@{k}"] = sum(scores) / len(scores)

        else:
            metrics[f"recall@{k}"] = 0.0

    # --------------------------------------------------------
    # MRR@K
    # --------------------------------------------------------

    for k in k_values:

        scores = []

        for query_id, retrieved_chunks in results.items():

            relevant_chunks = relevance_dict.get(
                query_id,
                set()
            )

            score = reciprocal_rank_at_k(
                retrieved_chunks,
                relevant_chunks,
                k
            )

            scores.append(score)

        if scores:
            metrics[f"mrr@{k}"] = sum(scores) / len(scores)

        else:
            metrics[f"mrr@{k}"] = 0.0

    return metrics