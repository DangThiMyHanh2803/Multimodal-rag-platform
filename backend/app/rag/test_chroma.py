import chromadb
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
CHROMA_DIR = BASE_DIR / "data" / "chroma"
COLLECTION_NAME = "documents"

def main():
    print("TEST CHROMADB")
    print("Python:")
    print(sys.executable)
    print("\nChromaDB:")
    print(chromadb.__version__)
    print("\nChroma path:")
    print(CHROMA_DIR)
    print("Path exists:", CHROMA_DIR.exists())
    sqlite_file = CHROMA_DIR / "chroma.sqlite3"
    print("SQLite exists:", sqlite_file.exists())

    if sqlite_file.exists():
        print("SQLite size:", sqlite_file.stat().st_size, "bytes")

    print("CONNECT CHROMADB")

    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR)
    )
    print("\nCác collection:")
    collections = client.list_collections()
    print("Số collection:", len(collections))

    for collection in collections:
        print(" -", collection.name)

    print("COLLECTION: documents")

    try:
        collection = client.get_collection(name=COLLECTION_NAME)
        print("Collection tồn tại!")
    except Exception as e:
        print("Không tìm thấy collection documents!")
        print("ERROR:", repr(e))
        return

    print("TEST COUNT")

    try:
        count = collection.count()
        print("Số records:", count)
    except Exception as e:
        print("COUNT ERROR:")
        print(repr(e))
        return

    print("TEST GET")
    try:
        results = collection.get(limit=5, include=["documents", "metadatas"])
        ids = results.get( "ids",[])
        documents = results.get("documents",[])
        metadatas = results.get("metadatas", [])
        print("Lấy được:", len(ids), "records")
        for i in range(400,len(ids)):
            print("\n")
            print("ID:", ids[i])
            print("Metadata:", metadatas[i])
            text = documents[i]
            print("Text:", text[:300])

    except Exception as e:
        print("GET ERROR:")
        print(repr(e))
        return
    print("TEST CHROMADB HOÀN TẤT")

if __name__ == "__main__":
    main()