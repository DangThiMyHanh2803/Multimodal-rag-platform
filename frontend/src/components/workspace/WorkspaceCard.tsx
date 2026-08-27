import type { Workspace } from "../../types/workspace";

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen: () => void;
  onSettings: () => void;
}

function formatTime(date: Date) {
  const diff = Date.now() - date.getTime();

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diff / 60000));
    return `${minutes} phút trước`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} giờ trước`;
  }
  return date.toLocaleDateString("vi-VN");
}

export default function WorkspaceCard({workspace, onOpen, onSettings,}: WorkspaceCardProps) {
  const members = workspace.members.slice(0, 4);
  const remaining = workspace.members.length - members.length;

  return (
    <div className="workspace-card" onClick={onOpen}>
      <div className="workspace-card-header">
        <div className="workspace-icon">
          <img src={workspace.icon} alt="" />
        </div>

        <div className="workspace-heading">
          <div className="workspace-title-row">
            <h3>{workspace.name}</h3>

            {!workspace.isOwner && (
              <span className="workspace-shared-badge">Chia sẻ</span>
            )}
          </div>
          <span className="workspace-updated">
            Cập nhật {formatTime(workspace.updatedAt)}
          </span>
        </div>

        <button type="button" className="workspace-settings-button"
          onClick={(event) => {
            event.stopPropagation();
            onSettings();
          }}
        > ⋯ </button>
      </div>

      <p className="workspace-description">{workspace.description}</p>

      <div className="workspace-stats">
        <div>
          <img src="/icon/doc.png" alt="" />
          <span>{workspace.fileCount}</span>
          <small>Tài liệu</small>
        </div>

        <div>
          <img src="/icon/question.png" alt="" />
          <span>{workspace.messageCount}</span>
          <small>Câu hỏi</small>
        </div>

        <div>
          <img src="/icon/users.png" alt="" />
          <span>{workspace.members.length}</span>
          <small>Thành viên</small>
        </div>
      </div>

      <div className="workspace-card-footer">
        <div className="workspace-members">
          {members.map((member, index) => (
            <div key={member.id} className="workspace-member-avatar" title={member.name}
              style={{backgroundColor: member.avatarColor, marginLeft: index === 0 ? 0 : -7,}}>
              {member.name.charAt(0)}
            </div>
          ))}

          {remaining > 0 && (
            <div className="workspace-member-more"> +{remaining}</div>
          )}
        </div>
        <button type="button" className="workspace-open-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >Mở</button>
      </div>
    </div>
  );
}