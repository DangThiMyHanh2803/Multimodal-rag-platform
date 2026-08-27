from sentence_transformers import SentenceTransformer

MODEL_NAME = "BAAI/bge-m3"
def main():
    print("Test BGE-M3")

    print("\nĐang tải model...")
    model = SentenceTransformer(MODEL_NAME)
    print("Tải model thành công!")

    # Các câu test
    sentences = [
        "RAG là gì?",
        "Retrieval-Augmented Generation là một kỹ thuật kết hợp truy xuất thông tin với mô hình ngôn ngữ.",
        "Hôm nay trời rất đẹp.",
    ]
    print("\nĐang tạo embedding...")
    embeddings = model.encode(sentences, normalize_embeddings=True)

    print("Embedding thành công!")
    print("\nThông tin embedding:")
    print(f"Số câu: {len(sentences)}")
    print(f"Kích thước vector: {embeddings.shape}")

    print("\nVector của câu đầu tiên:")
    print(embeddings[0])

    # Tính similarity
    print("\nSimilarity:")
    similarity_01 = embeddings[0] @ embeddings[1]
    similarity_02 = embeddings[0] @ embeddings[2]
    print(
        f"Câu 1 <-> Câu 2: "
        f"{similarity_01:.4f}"
    )
    print(
        f"Câu 1 <-> Câu 3: "
        f"{similarity_02:.4f}"
    )

if __name__ == "__main__":
    main()