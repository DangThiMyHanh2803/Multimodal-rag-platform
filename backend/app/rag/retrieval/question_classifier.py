import unicodedata

class QuestionClassifier:
    def classify(self, question: str) -> str:
        question = unicodedata.normalize("NFC", question)
        question_lower = question.lower().strip()

        aggregate_patterns = [
            "trình bày",
            "liệt kê",
            "nêu các",
            "hãy nêu",
            "những",
            "các đặc điểm",
            "các nguyên nhân",
            "các quyền",
            "các nghĩa vụ",
            "các loại",
            "bao gồm",
            "gồm những",
            "tóm tắt",
            "tổng hợp",
        ]

        if any(pattern in question_lower for pattern in aggregate_patterns):
            return "aggregate"

        return "extractive"