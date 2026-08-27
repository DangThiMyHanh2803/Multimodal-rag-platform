import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering


class ExtractiveQuestionAnswering:
    def __init__(self):
        model_name = "chieunq/XLM-R-base-finetuned-uit-vquad-1"

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForQuestionAnswering.from_pretrained(model_name)
        self.model.eval()

    def answer(self, question: str, context: str) -> dict:
        inputs = self.tokenizer(
            question,
            context,
            return_tensors="pt",
            truncation="only_second",
            max_length=512,
            return_offsets_mapping=True,
        )

        offset_mapping = inputs.pop("offset_mapping")[0]
        sequence_ids = inputs.sequence_ids(0)

        with torch.no_grad():
            outputs = self.model(**inputs)

        start_logits = outputs.start_logits[0]
        end_logits = outputs.end_logits[0]

        best_score = float("-inf")
        best_start = None
        best_end = None
        max_answer_length = 80

        for start_index in range(len(start_logits)):
            if sequence_ids[start_index] != 1:
                continue

            max_end = min(
                start_index + max_answer_length,
                len(end_logits),
            )

            for end_index in range(start_index, max_end):
                if sequence_ids[end_index] != 1:
                    continue

                score = start_logits[start_index] + end_logits[end_index]

                if score > best_score:
                    best_score = score
                    best_start = start_index
                    best_end = end_index

        if best_start is None or best_end is None:
            return {
                "answer": "",
                "score": 0.0,
                "start": 0,
                "end": 0,
            }

        start_char = offset_mapping[best_start][0].item()
        end_char = offset_mapping[best_end][1].item()

        expanded_start, expanded_end = self._expand_answer(
            context,
            start_char,
            end_char,
        )

        answer = context[expanded_start:expanded_end].strip()
        answer = answer.lstrip("-+* ").strip()
        score = torch.sigmoid(best_score).item()

        return {
            "answer": answer,
            "score": score,
            "start": start_char,
            "end": end_char,
        }

    def _expand_answer(
        self,
        context: str,
        start: int,
        end: int,
    ) -> tuple[int, int]:
        line_start = context.rfind("\n", 0, start)
        line_end = context.find("\n", end)

        if line_start == -1:
            line_start = 0
        else:
            line_start += 1

        if line_end == -1:
            line_end = len(context)

        current_line = context[line_start:line_end].strip()

        if current_line.startswith(("-", "+", "*")):
            return line_start, line_end

        sentence_start = context.rfind(".", 0, start)
        sentence_end = context.find(".", end)

        if sentence_start == -1 or sentence_start < line_start:
            sentence_start = line_start
        else:
            sentence_start += 1

        if sentence_end == -1 or sentence_end > line_end:
            sentence_end = line_end
        else:
            sentence_end += 1

        return sentence_start, sentence_end