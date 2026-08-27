from app.rag.parser.docx_parser import parse_docx
from app.rag.parser.pdf_parser import parse_pdf
from app.rag.parser.txt_parser import parser_txt

pdf_path = r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\tử huyệt cảm xúc.pdf"
result = parse_pdf(pdf_path)
print("=" * 60)

print("TITLE:")
print(result["title"])

print("=" * 60)

print("PAGE COUNT:")
print(len(result["pages"]))

print("=" * 60)

print("PAGE 1:")
print(result["pages"][0]["text"])
print(f"number: {result['pages'][0]['page_number']}")

print("=" * 60)

print("PAGE 2:")
print(result["pages"][1]["text"])
print(f"number: {result['pages'][1]['page_number']}")

print("=" * 60)
"""


doc_path = r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\BAOCAOND.docx"
result = parse_docx(doc_path)
print("=" * 60)
print("TITLE:")
print(result["title"])

print("=" * 60)
print("CONTENT:")
print(result["text"])

print("=" * 60)
"""
"""txt_path = r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\Xây dựng website hỏi đáp tài liệu.txt"
result = parser_txt(txt_path)

print(result["title"])
print(result["text"])
"""