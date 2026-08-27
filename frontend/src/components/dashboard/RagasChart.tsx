import type {RagasPoint,} from "../../types/dashboard";
interface RagasChartProps {
  data: RagasPoint[];
}

export default function RagasChart({data,}: RagasChartProps) {
  if (!data.length) {
    return (<div className="dashboard-empty">Chưa có dữ liệu RAGAS</div>);
  }

  const W = 560;
  const H = 160;
  const PAD = {t: 16, r: 16, b: 32, l: 44,};
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;
  const toX = (index: number) => PAD.l + (index / Math.max(data.length - 1, 1)) * cw;
  const toY = (value: number) => PAD.t + (1 - (value - 0.6) / 0.4) * ch;
  const metrics = [
    {
      key: "faithfulness",
      className: "ragas-faithfulness",
    },
    {
      key: "relevance",
      className: "ragas-relevance",
    },
    {
      key: "precision",
      className: "ragas-precision",
    },
    {
      key: "recall",
      className: "ragas-recall",
    },
  ] as const;
  const yTicks = [0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,];
  return (
    <svg className="ragas-chart"  viewBox={`0 0 ${W} ${H}`}>
      {yTicks.map((value) => (
        <g key={value}>
          <line x1={PAD.l} y1={toY(value)} x2={W - PAD.r} y2={toY(value)} className="ragas-grid"/>
          <text x={PAD.l - 6} y={toY(value)} textAnchor="end" dominantBaseline="middle" className="ragas-label">{value.toFixed(2)}</text>
        </g>
      ))}
      {data.map((item, index) => (<text key={index} x={toX(index)} y={H - 4} textAnchor="middle" className="ragas-label">{item.date}</text>))}
      {metrics.map((metric) => {const points = data.map((item, index) =>`${toX(index)},${toY(item[metric.key])}`).join(" ");

        return (<polyline key={metric.key} points={points} className={`ragas-line ${metric.className}`}/>);
      })}
    </svg>
  );
}