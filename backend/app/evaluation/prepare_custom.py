import json
from pathlib import Path

from backend.app.rag.parser.pdf_parser import parse_pdf
from backend.app.rag.parser.docx_parser import parse_docx
from backend.app.rag.parser.txt_parser import parser_txt
from backend.app.rag.text_processorCu import (clean_text, chunk_text)

DOCUMENT_DIR = Path(r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test")
OUTPUT_DIR = (Path(__file__).parent/ "datasets"/ "custom")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Đọc tài liệu
def parse_document(file_path):
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        result = parse_pdf( str(file_path))
        return result, "pdf"
    elif suffix == ".docx":
        result = parse_docx( str(file_path))
        return result, "docx"
    elif suffix == ".txt":
        result = parser_txt( str(file_path))
        return result, "txt"
    else:
        return None, None
    
# Tạo corpuZ
def create_corpus():
    corpus = []
    chunk_index = 0
    files = list( DOCUMENT_DIR.glob("*") )

    for file_path in files:
        if file_path.suffix.lower() not in {
            ".pdf",
            ".docx",
            ".txt"
        }:
            continue
        print(f"Đang xử lý: {file_path.name}")
        result, file_type = parse_document(file_path)
        if result is None:
            continue
        title = result.get("title", file_path.stem)
        # pdf
        if file_type == "pdf":
            pages = result.get("pages", [])
            for page in pages:
                page_text = page.get("text", "")
                page_text = clean_text(page_text)
                if not page_text:
                    continue
                chunks = chunk_text(page_text)
                for chunk in chunks:
                    corpus.append({
                        "id": f"chunk_{chunk_index:05d}",
                        "text": chunk,
                        "title": title,
                        "source": file_path.name,
                        "file_type": file_type,
                        "page_number": page.get("page_number")
                    })
                    chunk_index += 1

        # docx, txt
        else:
            text = result.get("text", "")
            # Một số parser có thể trả pages
            if not text: text = result.get("pages", "")
            text = clean_text(text)
            if not text:
                continue
            chunks = chunk_text(text)
            for chunk in chunks:
                corpus.append({
                    "id": f"chunk_{chunk_index:05d}",
                    "text": chunk,
                    "title": title,
                    "source": file_path.name,
                    "file_type": file_type,
                    "page_number":None
                })
                chunk_index += 1
    return corpus

def save_json(data, filename):
    output_path = (OUTPUT_DIR / filename)
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    print(f"Đã lưu: {output_path}")

def main():
    corpus = create_corpus()
    print(f"Số lượng chunks : {len(corpus)}")
    save_json(corpus, "corpus.json")
    print()
    print("Hoàn thành!")
if __name__ == "__main__":
    main()