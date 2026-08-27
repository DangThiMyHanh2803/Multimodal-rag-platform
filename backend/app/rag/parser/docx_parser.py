from docx import Document
from pathlib import Path

# Đọc file DOCX và trích xuất paragraph + table theo đúng thứ tự xuất hiện trong tài liệu.
def parse_docx(file_path: str) -> str:
    doc = Document(file_path)
    contents = []
    paragraph_index = 0
    table_index = 0
    # Duyệt tất cả phần tử trong DOCX body
    for element in doc.element.body:
        if element.tag.endswith("p"):
            paragraph = doc.paragraphs[paragraph_index]
            paragraph_index += 1
            text = paragraph.text.strip()

            if text:
                contents.append(text)
        elif element.tag.endswith("tbl"):
            table = doc.tables[table_index]
            table_index += 1
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    text = cell.text.strip()
                    if text:
                        row_data.append(text)
                if row_data:
                    contents.append(" | ".join(row_data))
    title = Path(file_path).stem
    # return về tiêu đề, text
    return {
        "title": title,
        "text": "\n".join(contents)
    }