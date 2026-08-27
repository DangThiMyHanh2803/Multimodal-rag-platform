import "../styles/dashboard.css";
import StatCards from "../components/dashboard/StatCards";
import RagasScores from "../components/dashboard/RagasScores";
import TopFiles from "../components/dashboard/TopFiles";
import WorkspaceStats from "../components/dashboard/WorkspaceStats";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import StorageCard from "../components/dashboard/StorageCard";
import QuickActions from "../components/dashboard/QuickActions";
import DashboardSection from "../components/dashboard/DashboardSection";
import { useDashboard } from "../hooks/useDashboard";

interface DashboardPageProps {
  workspaceId?: string;
  onNavigateChat?: () => void;
}

export default function DashboardPage({workspaceId, onNavigateChat}: DashboardPageProps) {
  const {data, loading, error, reload} = useDashboard({workspaceId});
  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Đang tải Dashboard...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-error">
          <p>{error}</p>
          <button type="button" onClick={reload}> Thử lại </button>
        </div>
      </main>
    );
  }
  if (!data) {return null;}

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Thống kê hệ thống</p>
        </div>
        <button type="button" className="dashboard-chat-button" onClick={onNavigateChat}>
          <img src="/icon/chat.png" alt=""/>
          Về Chat
        </button>
      </header>
      <StatCards stats={data.stats} />
      <RagasScores history={data.ragasHistory}/>
      <div className="dashboard-two-column">
        <TopFiles files={data.topFiles}/>
        <WorkspaceStats workspaces={data.workspaces}/>
      </div>

      <div className="dashboard-two-column activity-row">
        <ActivityFeed activities={data.activities}/>
        <div className="dashboard-side-column">
          <StorageCard storage={data.storage}/>
          <DashboardSection title="Thao tác nhanh">
            <QuickActions onNavigateChat={onNavigateChat}/>
          </DashboardSection>
        </div>
      </div>
    </main>
  );
}