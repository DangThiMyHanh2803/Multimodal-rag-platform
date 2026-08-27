import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer


# CẤU HÌNH
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CORPUS_PATH = os.path.join(BASE_DIR, "datasets", "custom", "corpus.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "embeddings")
os.makedirs(OUTPUT_DIR, exist_ok=True)

MODELS = {
    "bge_m3": "BAAI/bge-m3",
    "vietnamese_embedding_v2": "AITeamVN/Vietnamese_Embedding_v2",
}

# ĐỌC CORPUS
print("ĐỌC CORPUS")

with open(CORPUS_PATH, "r", encoding="utf-8") as f:
    corpus = json.load(f)

print("Corpus:", CORPUS_PATH)
print("Số lượng chunk:", len(corpus))

# Lấy ID và text
chunk_ids = [item["id"] for item in corpus]
texts = [item["text"] for item in corpus]

# Kiểm tra dữ liệu
print("\n5 chunk đầu tiên:")

for i in range(min(5, len(corpus))):
    print(f"{i}: {chunk_ids[i]} | " f"{len(texts[i])} ký tự")

# LƯU CHUNK IDS
chunk_ids_path = os.path.join(OUTPUT_DIR, "chunk_ids.json")
with open(chunk_ids_path, "w", encoding="utf-8") as f:
    json.dump(chunk_ids, f, ensure_ascii=False, indent=2)
print("\nĐã lưu:", chunk_ids_path)

# EMBEDDING TỪNG MODEL
for model_name, model_path in MODELS.items():

    print(f"MODEL: {model_name}")
    print(f"Path: {model_path}")

    # Load model
    print("Đang tải model...")
    model = SentenceTransformer(model_path)
    print("Tải model thành công!")
    print("Embedding dimension:", model.get_embedding_dimension())

    # Encode toàn bộ corpus
    print("\nBắt đầu embedding toàn bộ corpus...")
    embeddings = model.encode(
        texts,
        batch_size=8,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True
    )

    # Kiểm tra
    print("\nKẾT QUẢ")
    print("Số lượng text:", len(texts))
    print("Shape:", embeddings.shape)
    print("Dtype:", embeddings.dtype)

    # Lưu
    output_path = os.path.join(OUTPUT_DIR, f"{model_name}.npy")
    np.save(output_path, embeddings)
    print("Đã lưu:", output_path)
    del model

print("HOÀN THÀNH EMBEDDING")

print("Output directory:")
print(OUTPUT_DIR)