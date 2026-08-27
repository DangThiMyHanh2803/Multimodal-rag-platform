import type {DashboardStats,} from "../../types/dashboard";
interface StatCardsProps {
  stats: DashboardStats;
}

const cards = [
  {key: "files", label: "Tài liệu", sub: "+3 tuần này", icon: "/icon/doc.png"},
  {key: "questions", label: "Câu hỏi", sub: "+28 hôm nay", icon: "/icon/chat.png"},
  {key: "chunks", label: "Chunks", sub: "trong Vector DB", icon: "/icon/embedding.png"},
  {key: "workspaces", label: "Workspaces", sub: "đang hoạt động", icon: "/icon/fordel.png"},
] as const;

export default function StatCards({stats,}: StatCardsProps) {
  return (
    <div className="dashboard-stat-grid">
      {cards.map((card) => (
        <div className="dashboard-stat-card" key={card.key}>
          <div className="dashboard-stat-header">
            <span>{card.label}</span>
            <img src={card.icon} alt=""/>
          </div>
          <div className="dashboard-stat-value">{stats[card.key].toLocaleString()}</div>
          <div className="dashboard-stat-sub">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}