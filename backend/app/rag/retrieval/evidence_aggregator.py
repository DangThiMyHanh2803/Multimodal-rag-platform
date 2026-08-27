import re
import unicodedata


class EvidenceAggregator:
    def __init__(
        self,
        reranker,
        max_blocks: int = 6,
        max_characters: int = 5000,
        min_relative_score: float = 0.55,
        min_overlap_chars: int = 20,
        max_overlap_chars: int = 800,
    ):
        self.reranker = reranker
        self.max_blocks = max_blocks
        self.max_characters = max_characters
        self.min_relative_score = min_relative_score
        self.min_overlap_chars = min_overlap_chars
        self.max_overlap_chars = max_overlap_chars

    def aggregate(
        self,
        documents: list[dict],
        question: str,
    ) -> str:
        if not documents:
            return ""

        documents = self._sort_documents(documents)
        combined_text = self._merge_documents(documents)

        if not combined_text:
            return ""

        blocks = self._split_blocks(combined_text)

        if not blocks:
            return ""

        blocks = self._remove_duplicate_blocks(blocks)

        if not blocks:
            return ""

        candidates = [
            {
                "text": block,
                "original_index": index,
            }
            for index, block in enumerate(blocks)
        ]

        ranked_blocks = self.reranker.rerank(
            question=question,
            documents=candidates,
        )

        if not ranked_blocks:
            return ""

        selected_blocks = self._select_relevant_blocks(
            ranked_blocks
        )

        if not selected_blocks:
            return ""

        selected_blocks.sort(
            key=lambda item: item["original_index"]
        )

        answer = "\n\n".join(
            block["text"].strip()
            for block in selected_blocks
            if block["text"].strip()
        )

        answer = self._clean_leading_noise(answer)
        answer = self._clean_trailing_noise(answer)
        answer = self._remove_repeated_lines(answer)
        answer = self._limit_text(answer)

        return answer.strip()

    def _sort_documents(
        self,
        documents: list[dict],
    ) -> list[dict]:
        return sorted(
            documents,
            key=lambda item: int(
                item.get("metadata", {}).get(
                    "chunk_id",
                    0,
                )
            ),
        )

    def _merge_documents(
        self,
        documents: list[dict],
    ) -> str:
        texts = [
            document.get("text", "").strip()
            for document in documents
            if document.get("text", "").strip()
        ]

        if not texts:
            return ""

        merged = texts[0]

        for next_text in texts[1:]:
            overlap = self._find_overlap(
                merged,
                next_text,
            )

            if overlap > 0:
                next_text = next_text[overlap:].lstrip()

            if not next_text:
                continue

            if merged and not merged.endswith("\n"):
                merged += "\n"

            merged += next_text

        return merged.strip()

    def _find_overlap(
        self,
        first: str,
        second: str,
    ) -> int:
        max_length = min(
            len(first),
            len(second),
            self.max_overlap_chars,
        )

        for length in range(
            max_length,
            self.min_overlap_chars - 1,
            -1,
        ):
            first_part = first[-length:]
            second_part = second[:length]

            if self._normalize_overlap(
                first_part
            ) == self._normalize_overlap(
                second_part
            ):
                return length

        return 0

    def _normalize_overlap(
        self,
        text: str,
    ) -> str:
        text = unicodedata.normalize(
            "NFC",
            text,
        )

        text = text.lower()
        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        return text.strip()

    def _split_blocks(
        self,
        text: str,
    ) -> list[str]:
        lines = text.splitlines()
        blocks = []
        current_block = []

        for line in lines:
            stripped = line.strip()

            if not stripped:
                if current_block:
                    blocks.append(
                        "\n".join(
                            current_block
                        ).strip()
                    )
                    current_block = []
                continue

            if self._is_heading(stripped):
                if current_block:
                    blocks.append(
                        "\n".join(
                            current_block
                        ).strip()
                    )

                current_block = [stripped]
                continue

            if self._is_list_item(stripped):
                if current_block:
                    current_block.append(stripped)
                else:
                    current_block = [stripped]

                continue

            if current_block:
                current_block.append(stripped)
            else:
                current_block = [stripped]

        if current_block:
            blocks.append(
                "\n".join(current_block).strip()
            )

        return [
            block
            for block in blocks
            if block
        ]

    def _is_heading(
        self,
        text: str,
    ) -> bool:
        if re.match(
            r"^Câu\s+\d+\s*[:.]?",
            text,
            flags=re.IGNORECASE,
        ):
            return True

        if re.match(
            r"^(Chương|Điều|Mục|Phần)\s+",
            text,
            flags=re.IGNORECASE,
        ):
            return True

        if text.startswith("*"):
            return True

        if (
            len(text) <= 140
            and text.endswith(":")
        ):
            return True

        return False

    def _is_list_item(
        self,
        text: str,
    ) -> bool:
        return bool(
            re.match(
                r"^[-+•]\s+",
                text,
            )
            or re.match(
                r"^\d+[.)]\s+",
                text,
            )
            or re.match(
                r"^[a-zA-ZđĐ][.)]\s+",
                text,
            )
        )

    def _remove_duplicate_blocks(
        self,
        blocks: list[str],
    ) -> list[str]:
        if len(blocks) <= 1:
            return blocks

        normalized = [
            self._normalize_block(block)
            for block in blocks
        ]

        keep = [True] * len(blocks)

        for i in range(len(blocks)):
            if not keep[i]:
                continue

            first = normalized[i]

            if not first:
                keep[i] = False
                continue

            for j in range(len(blocks)):
                if i == j:
                    continue

                second = normalized[j]

                if not second:
                    continue

                if first == second:
                    if i > j:
                        keep[i] = False
                        break

                if (
                    len(first) < len(second)
                    and first in second
                ):
                    keep[i] = False
                    break

        return [
            block
            for index, block in enumerate(blocks)
            if keep[index]
        ]

    def _normalize_block(
        self,
        text: str,
    ) -> str:
        text = unicodedata.normalize(
            "NFC",
            text,
        )

        text = text.lower()

        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        text = re.sub(
            r"\s*([.,:;!?])\s*",
            r"\1",
            text,
        )

        return text.strip()

    def _select_relevant_blocks(
        self,
        ranked_blocks: list[dict],
    ) -> list[dict]:
        ranked_blocks = [
            block
            for block in ranked_blocks
            if block.get("text", "").strip()
        ]

        if not ranked_blocks:
            return []

        best_score = ranked_blocks[0].get(
            "rerank_score",
            0.0,
        )

        selected = []

        if best_score > 0:
            threshold = (
                best_score
                * self.min_relative_score
            )

            for block in ranked_blocks:
                score = block.get(
                    "rerank_score",
                    0.0,
                )

                if score < threshold:
                    continue

                selected.append(block)

                if len(selected) >= self.max_blocks:
                    break
        else:
            selected = ranked_blocks[
                :self.max_blocks
            ]

        if not selected:
            selected = ranked_blocks[:1]

        return selected

    def _clean_leading_noise(
        self,
        text: str,
    ) -> str:
        blocks = [
            block.strip()
            for block in re.split(
                r"\n\s*\n",
                text,
            )
            if block.strip()
        ]

        while blocks:
            first = blocks[0]
            first_lines = first.splitlines()

            if (
                len(first) <= 120
                and first.endswith("?")
            ):
                blocks.pop(0)
                continue

            if (
                len(first_lines) == 1
                and len(first.split()) <= 3
                and not self._is_heading(first)
                and not self._is_list_item(first)
            ):
                blocks.pop(0)
                continue

            break

        return "\n\n".join(
            blocks
        ).strip()

    def _clean_trailing_noise(
        self,
        text: str,
    ) -> str:
        blocks = [
            block.strip()
            for block in re.split(
                r"\n\s*\n",
                text,
            )
            if block.strip()
        ]

        while blocks:
            last = blocks[-1]
            last_lines = last.splitlines()

            if (
                len(last_lines) == 1
                and len(last.split()) <= 3
                and not self._is_heading(last)
                and not self._is_list_item(last)
            ):
                blocks.pop()
                continue

            break

        return "\n\n".join(
            blocks
        ).strip()

    def _remove_repeated_lines(
        self,
        text: str,
    ) -> str:
        lines = text.splitlines()
        result = []
        seen = set()

        for line in lines:
            stripped = line.strip()

            if not stripped:
                if result and result[-1] != "":
                    result.append("")
                continue

            normalized = self._normalize_block(
                stripped
            )

            if normalized in seen:
                continue

            seen.add(normalized)
            result.append(stripped)

        return "\n".join(
            result
        ).strip()

    def _limit_text(
        self,
        text: str,
    ) -> str:
        if len(text) <= self.max_characters:
            return text.strip()

        limited = text[
            :self.max_characters
        ]

        boundaries = [
            limited.rfind("."),
            limited.rfind("?"),
            limited.rfind("!"),
            limited.rfind("\n"),
        ]

        boundary = max(boundaries)

        if boundary > 0:
            limited = limited[
                :boundary + 1
            ]

        return limited.strip()