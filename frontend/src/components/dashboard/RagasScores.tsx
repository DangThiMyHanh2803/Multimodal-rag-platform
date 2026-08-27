import type {RagasPoint,} from "../../types/dashboard";
import DashboardSection from "./DashboardSection";
import RagasChart from "./RagasChart";

interface RagasScoresProps {
  history: RagasPoint[];
}

export default function RagasScores({history,}: RagasScoresProps) {
  const current = history[history.length - 1];
  if (!current) {
    return null;
  }
  const metrics = [
    {key: "faithfulness", label: "Faithfulness"},
    {key: "relevance", label: "Relevance"},
    {key: "precision", label: "Precision"},
    {key: "recall", label: "Recall"},
  ] as const;

  return (
    <div className="dashboard-ragas-grid">
      <DashboardSection title="Xu hướng RAGAS">
        <div className="ragas-legend">
          {metrics.map((metric) => (<span key={metric.key}>{metric.label}</span>))}
        </div>
        <RagasChart data={history} />
      </DashboardSection>

      <DashboardSection title="Điểm RAGAS hiện tại">
        <div className="ragas-score-list">
          {metrics.map((metric) => {
            const value = current[metric.key];
            return (
              <div className="ragas-score" key={metric.key}>
                <div className="ragas-score-header">
                  <span>{metric.label}</span>
                  <strong>{value.toFixed(2)}</strong>
                </div>
                <div className="ragas-progress">
                  <div style={{ width: `${value * 100}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div className="ragas-average">
          Avg:{" "}
          {((current.faithfulness + current.relevance + current.precision + current.recall) / 4).toFixed(2)}
        </div>
      </DashboardSection>
    </div>
  );
}