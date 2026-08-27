import type { Source } from "../../types/chat";

interface SourceChipProps { source: Source; }

export default function SourceChip({ source }: SourceChipProps) {
  const title = source.fileName.replace(/\.[^.]+$/, "");
  return <div className="source-chip" title={source.content}><span>📎</span><span>{title}</span>{source.page !== undefined && <span className="source-page">— tr.{source.page}</span>}{source.score !== undefined && <span className="source-score">{Math.round(source.score * 100)}%</span>}</div>;
}
