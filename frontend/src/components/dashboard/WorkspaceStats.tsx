import type {WorkspaceStat,} from "../../types/dashboard";
import DashboardSection from "./DashboardSection";

interface WorkspaceStatsProps {
  workspaces: WorkspaceStat[];
}

export default function WorkspaceStats({workspaces,}: WorkspaceStatsProps) {
  const maxQuestions = Math.max( ...workspaces.map((item) => item.questions),1);
  return (
    <DashboardSection title="Hoạt động theo Workspace">
      <div className="workspace-stat-list">
        {workspaces.map((workspace) => (
          <div className="workspace-stat" key={workspace.name}>
            <img src={workspace.icon} alt=""/>

            <div className="workspace-stat-content">
              <div className="workspace-stat-header">
                <span>{workspace.name}</span>
                <strong>{workspace.questions} câu</strong>
              </div>

              <div className="workspace-progress">
                <div style={{ width: `${(workspace.questions / maxQuestions) * 100}%`,}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}