import re
import os
import unicodedata

CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", "800"))     # số ký tự tối đa mỗi chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))  # số ký tự chồng lấn giữa 2 chunk liền kề
MIN_CHUNK_LEN = int(os.getenv("MIN_CHUNK_LEN", "80"))   # bỏ chunk quá ngắn (header, số trang, ...)

# Làm sạch text
def clean_text(text: str) -> str:
    if not text:
        return ""
    # Chuẩn hóa Unicode dạng NFC
    text = unicodedata.normalize("NFC", text)
    # Chuẩn hóa các kiểu ký tự xuống dòng khác nhau về cùng một kiểu \n.
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    # Loại space/tab thừa
    text = re.sub(r"[ \t]+", " ", text)
    # Xóa khoảng trắng đầu/cuối từng dòng
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# Chunk text

# Chia đều các ký tự nếu đoạn văn dài hơn CHUNK_SIZE
def split_long_unit(unit: str) -> list[str]:
    unit_length = len(unit)
    # Số pieces tối thiểu cần có
    num_pieces = (unit_length + CHUNK_SIZE - 1) // CHUNK_SIZE
    # Chia đều
    base_size = unit_length // num_pieces
    remainder = unit_length % num_pieces

    pieces = []
    start = 0
    for i in range(num_pieces):
        # Kích thước pieces 
        piece_length = (base_size + (1 if i < remainder else 0))
        end = start + piece_length
        piece = unit[start:end]
        pieces.append(piece)
        start = end
    return pieces

def chunk_text(text: str):
    if not text:
        return []
    # Tách thành paragraph
    paragraphs = re.split(r"\n\n+", text)
    paragraphs = [
        paragraph
        for paragraph in paragraphs
        if paragraph
    ]
    # Paragraph quá dài thì tách theo câu.
    units = []
    for paragraph in paragraphs:
        if len(paragraph) <= CHUNK_SIZE:
            units.append(paragraph)
            continue
        # Paragraph quá dài → tách câu
        sentences = re.split(r"(?<=[.!?])\s+",paragraph)
        for sentence in sentences:
            if sentence:
                units.append(sentence)

    # 3. Ghép units thành chunks
    chunks = []
    current_units = []
    current_length = 0

    for unit in units:
        unit_length = len(unit)
        # Unit quá dài → xử lý riêng
        if unit_length > CHUNK_SIZE:
            # Lưu chunk hiện tại
            if current_units:
                chunks.append("\n".join(current_units))
                current_units = []
                current_length = 0
            
            # Chia unit thành các piece cân bằng
            pieces = split_long_unit(unit)

            # Thêm các piece vào chunks
            chunks.extend(pieces)
            continue
        # Thử thêm unit vào chunk hiện tại
        new_length = (current_length + unit_length + (1 if current_units else 0) )
        if new_length <= CHUNK_SIZE:
            current_units.append(unit)
            current_length = new_length
        else:
            # Chunk hiện tại đã đủ lớn
            if current_units:
                chunks.append(
                    "\n".join(current_units)
                )

            # Bắt đầu chunk mới
            current_units = [unit]
            current_length = unit_length

    # Chunk cuối
    if current_units:
        chunks.append(
            "\n".join(current_units)
        )
    # 4. Tạo overlap
    final_chunks = []
    for index, chunk in enumerate(chunks):
        # Chunk đầu tiên
        if index == 0:
            if len(chunk) >= MIN_CHUNK_LEN:
                final_chunks.append(chunk)
            continue
        previous_chunk = chunks[index - 1]
        # Số ký tự tối đa còn lại để thêm overlap
        available_space = CHUNK_SIZE - len(chunk) - 1

        # Không gian không đủ cho overlap
        if available_space <= 0:
            combined = chunk
        else:
            overlap_length = min(CHUNK_OVERLAP, available_space)
            # Lấy phần cuối của chunk trước
            overlap = previous_chunk[-overlap_length:]
            # Ghép overlap với chunk hiện tại
            combined = overlap + "\n" + chunk

        if len(combined) >= MIN_CHUNK_LEN:
            final_chunks.append(combined)

    return final_chunks


"""
Ví dụ CHUNK_SIZE = 800
MIN_CHUNK_LEN = 80

unit = 1610
CHUNK_SIZE = 800
MIN_CHUNK_LEN = 80

unit = 1610
1610 // 3 = 536
1610 % 3 = 2
537 + 537 + 536
"""