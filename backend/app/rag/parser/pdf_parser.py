from pypdf import PdfReader
from pathlib import Path
# Đọc file PDF có text thật và trích xuất text
def parse_pdf(file_path: str):
    reader = PdfReader(file_path)

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):

        text = page.extract_text() or ""

        pages.append({
            "page_number": page_number,
            "text": text.strip()
        })
    title = Path(file_path).stem
    # return về tiêu đề, text, số trang
    return {
        "title": title,
        "pages": pages,
    }