from backend.app.rag.metadata import (create_document_metadata, create_chunk_metadata)

def test_pdf():

    print("=" * 60)
    print("TEST PDF")
    print("=" * 60)

    document_metadata = create_document_metadata(
        file_path=r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\tử huyệt cảm xúc.pdf",
        title="Tử huyệt cảm xúc",
        file_type="pdf"
    )

    print("DOCUMENT METADATA:")
    print(document_metadata)

    chunk_metadata = create_chunk_metadata(
        document_metadata=document_metadata,
        chunk_id=0,
        page_number=1
    )

    print("\nCHUNK METADATA:")
    print(chunk_metadata)


def test_docx():

    print("\n" + "=" * 60)
    print("TEST DOCX")
    print("=" * 60)

    document_metadata = create_document_metadata(
        file_path=r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\BAOCAOND.docx",
        title="BAOCAOND",
        file_type="docx"
    )

    print("DOCUMENT METADATA:")
    print(document_metadata)

    chunk_metadata = create_chunk_metadata(
        document_metadata=document_metadata,
        chunk_id=0
    )

    print("\nCHUNK METADATA:")
    print(chunk_metadata)


def test_txt():

    print("\n" + "=" * 60)
    print("TEST TXT")
    print("=" * 60)

    document_metadata = create_document_metadata(
        file_path=r"D:\Mon Nam 4\Tiểu luận tốt nghiệp\File Test\Xây dựng website hỏi đáp tài liệu.txt",
        title="Xây dựng website hỏi đáp tài liệu",
        file_type="txt"
    )

    print("DOCUMENT METADATA:")
    print(document_metadata)

    chunk_metadata = create_chunk_metadata(
        document_metadata=document_metadata,
        chunk_id=0
    )

    print("\nCHUNK METADATA:")
    print(chunk_metadata)


if __name__ == "__main__":

    test_pdf()
    test_docx()
    test_txt()