from pathlib import Path
# Đọc file txt và trích xuất nội dung

def parser_txt(file_path: str):
    with open(file_path, "r", encoding="utf-8") as file:
        text = file.read().strip()

    # Lấy tên file làm title
    title = Path(file_path).stem
    # return về tiêu đề, text
    return {
        "title": title,
        "text": text
    }