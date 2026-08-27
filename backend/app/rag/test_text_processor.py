from backend.app.rag.parser.pdf_parser import parse_pdf
from backend.app.rag.text_processorCu import clean_text, chunk_text


PDF_PATH = r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\tử huyệt cảm xúc.pdf"


def test_pdf_chunking():
    # 1. Parse PDF
    result = parse_pdf(PDF_PATH)
    print("PDF INFORMATION")
    print("Title:", result["title"])
    print("Number of pages:", len(result["pages"]))
    # 2. Lấy text từ PDF
    all_text = ""

    for page in result["pages"]:

        page_number = page["page_number"]
        page_text = page["text"]
        print(f"PAGE {page_number}")

        print(
            f"Raw text length: "
            f"{len(page_text)}"
        )

        # Clean text
        cleaned = clean_text(page_text)

        all_text += cleaned + "\n\n"
    # 3. Chunk toàn bộ tài liệu

    chunks = chunk_text(all_text)
    # 4. Hiển thị kết quả
    print("CHUNKING RESULT")

    print("Total text length:", len(all_text))
    print("Number of chunks:", len(chunks))


    for i, chunk in enumerate(chunks):

        print(f"CHUNK {i + 1}")
        print(f"Length: {len(chunk)}")

        print(chunk)

if __name__ == "__main__":
    test_pdf_chunking()