import json
from pathlib import Path
from datasets import load_dataset

# Dataset
DATASET_NAME = "taidng/UIT-ViQuAD2.0"
SPLIT = "test"

# Số lượng mẫu để test
MAX_SAMPLES = 100
OUTPUT_DIR = (Path(__file__).parent/ "datasets"/ "viquad")

# Tải dataset
def load_viquad():
    print("Loading UIT-ViQuAD 2.0")
    dataset = load_dataset(DATASET_NAME, split=SPLIT )
    print(f"Tổng số lượng mẫu: {len(dataset)}")
    return dataset
# Chuyển đổi dataset
"""
   File corpus.json chứa id của chunk, text của chunk, title của chunk
   File queries.json chứa câu hỏi và id câu hỏi
   File qrels.json chứa đáp án cho câu hỏi
"""
def convert_dataset(dataset):
    corpus = []
    queries = []
    qrels = []
    # Tránh context trùng nhau
    context_to_chunk_id = {}
    # Chỉ số của câu hỏi
    query_index = 0
    # Chỉ số của chunk
    chunk_index = 0

    for item in dataset:
        # Bỏ những câu hỏi không có đáp án
        if item["is_impossible"]:
            continue
        context = item["context"].strip()
        question = item["question"].strip()
        # Bỏ qua dữ liệu bị thiếu context hoặc câu hỏi
        if not context or not question:
            continue

         # Nếu context chưa tồn tại thì tạo chunk mới
        if context not in context_to_chunk_id:
            chunk_id = f"chunk_{chunk_index:05d}"
            context_to_chunk_id[context] = chunk_id
            corpus.append({ "id": chunk_id, "text": context, "title": item["title"] })
            chunk_index += 1
        
        else:
            chunk_id = context_to_chunk_id[context]
        # Tạo query
        query_id = f"q_{query_index:05d}"
        queries.append({
            "id": query_id,
            "text": question
        })

        # Xác định chunk chứa thông tin liên quan đến câu hỏi
        qrels.append({"query_id": query_id, "chunk_id": chunk_id, "relevance": 1})
        query_index += 1
        # Giới hạn số lượng query
        if query_index >= MAX_SAMPLES:
            break
    return corpus, queries, qrels

# Lưu file json
def save_json(data, filename):
    output_path = OUTPUT_DIR / filename
    with open(output_path, "w", encoding="utf-8"
    ) as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    print(f"Saved: {output_path}")
# Main
def main():
    dataset = load_viquad()
    corpus, queries, qrels = convert_dataset(dataset)
    print()
    print("CONVERSION RESULT")
    print(f"Corpus : {len(corpus)}")
    print(f"Queries: {len(queries)}")
    print(f"Qrels  : {len(qrels)}")
    save_json( corpus, "corpus.json")
    save_json( queries, "queries.json")
    save_json( qrels, "qrels.json")
    print()
    print("Done!")

if __name__ == "__main__":
    main()