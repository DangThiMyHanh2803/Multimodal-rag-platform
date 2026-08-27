import { useState } from "react";
import { C } from "../../styles/theme";
import type { Workspace } from "../../types/workspace";

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (workspace: Workspace) => void;
}

export default function CreateWorkspaceModal({ onClose, onCreate }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    const workspaceName = name.trim();

    if (workspaceName.length < 3) {
      return;
    }

    const workspace: Workspace = {
      id: "",
      name: workspaceName,
      description: description.trim(),
      icon: "/icon/fordel.png",
      fileCount: 0,
      messageCount: 0,
      isOwner: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: "user-002",
          name: "Hạnh",
          email: "myhanh@gmail.com",
          role: "owner",
          avatarColor: C.accent,
        },
      ],
    };

    onCreate(workspace);
  };

  return (
    <div className="workspace-modal-overlay" onClick={onClose}>
      <div className="workspace-modal" onClick={(event) => event.stopPropagation()}>
        <div className="workspace-modal-header">
          <h2>Tạo workspace</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <label>
          Tên workspace
          <input
            value={name}
            placeholder="Nhập tên workspace"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          Mô tả
          <textarea
            rows={4}
            value={description}
            placeholder="Nhập mô tả"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="workspace-modal-actions">
          <button
            type="button"
            className="workspace-secondary-button"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            type="button"
            className="workspace-primary-button"
            disabled={name.trim().length < 3}
            onClick={handleCreate}
          >
            Tạo workspace
          </button>
        </div>
      </div>
    </div>
  );
}