import type { Workspace } from "../../types/workspace";

interface WorkspaceDetailProps {
  workspace: Workspace;
  onClose: () => void;
}

export default function WorkspaceDetail({
  workspace,
  onClose,
}: WorkspaceDetailProps) {
  return (
    <div
      className="workspace-detail-overlay"
      onClick={onClose}
    >
      <aside
        className="workspace-detail"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="workspace-detail-header">
          <div>
            <h2>{workspace.name}</h2>

            <span>
              {workspace.fileCount} tài liệu ·{" "}
              {workspace.messageCount} câu hỏi
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="workspace-detail-description">
          {workspace.description}
        </p>

        <div className="workspace-detail-stats">
          <div>
            <strong>
              {workspace.fileCount}
            </strong>
            <span>Tài liệu</span>
          </div>

          <div>
            <strong>
              {workspace.messageCount}
            </strong>
            <span>Câu hỏi</span>
          </div>

          <div>
            <strong>
              {workspace.members.length}
            </strong>
            <span>Thành viên</span>
          </div>
        </div>

        <h3>Thành viên</h3>

        <div className="workspace-detail-members">
          {workspace.members.map((member) => (
            <div
              key={member.id}
              className="workspace-detail-member"
            >
              <div
                className="workspace-detail-avatar"
                style={{
                  backgroundColor:
                    member.avatarColor,
                }}
              >
                {member.name.charAt(0)}
              </div>

              <div className="workspace-detail-member-info">
                <span>{member.name}</span>
                <small>{member.email}</small>
              </div>

              <span className="workspace-role">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}