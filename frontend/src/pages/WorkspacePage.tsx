import { useEffect, useState } from "react";
import WorkspaceCard from "../components/workspace/WorkspaceCard";
import CreateWorkspaceModal from "../components/workspace/CreateWorkspaceModal";
import WorkspaceDetail from "../components/workspace/WorkspaceDetail";
import type { Workspace } from "../types/workspace";
import { createWorkspace, listWorkspaces } from "../services/workspaceService";
import { C } from "../styles/theme";
import "../styles/workspacePage.css";

interface WorkspacePageProps {
  onOpenWorkspace?: (workspace: Workspace) => void;
}

export default function WorkspacePage({ onOpenWorkspace }: WorkspacePageProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const result = await listWorkspaces();

        const mappedWorkspaces: Workspace[] = result.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          icon: "/icon/fordel.png",
          fileCount: 0,
          messageCount: 0,
          isOwner: item.owner_id === "user-002",
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
          members: [
            {
              id: item.owner_id,
              name: "Hạnh",
              email: "myhanh@gmail.com",
              role: "owner",
              avatarColor: C.accent,
            },
          ],
        }));

        setWorkspaces(mappedWorkspaces);
      } catch (error) {
        console.error("LOAD WORKSPACE ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  const filteredWorkspaces = workspaces.filter((workspace) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      workspace.name.toLowerCase().includes(keyword) ||
      workspace.description.toLowerCase().includes(keyword);

    const matchesFilter =
      filter === "all" ||
      (filter === "mine" && workspace.isOwner) ||
      (filter === "shared" && !workspace.isOwner);

    return matchesSearch && matchesFilter;
  });

  const handleCreate = async (workspace: Workspace) => {
    try {
      const result = await createWorkspace(workspace.name, workspace.description);

      const savedWorkspace: Workspace = {
        ...workspace,
        id: result.id,
        name: result.name,
        description: result.description ?? "",
        isOwner: result.owner_id === "user-002",
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
        members: [
          {
            id: result.owner_id,
            name: "Hạnh",
            email: "myhanh@gmail.com",
            role: "owner",
            avatarColor: C.accent,
          },
        ],
      };

      setWorkspaces((current) => [savedWorkspace, ...current]);
      setShowCreate(false);
    } catch (error) {
      console.error("CREATE WORKSPACE ERROR:", error);
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <h1>Workspace</h1>
          <p>Quản lý các nhóm tài liệu và không gian làm việc</p>
        </div>
        <button type="button" className="workspace-primary-button" onClick={() => setShowCreate(true)}>
          Tạo workspace
        </button>
      </header>

      <div className="workspace-toolbar">
        <div className="workspace-search">
          <img src="/icon/magnifyingGlass.png" alt="" />
          <input
            value={search}
            placeholder="Tìm workspace..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="workspace-filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
          <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Của tôi</button>
          <button className={filter === "shared" ? "active" : ""} onClick={() => setFilter("shared")}>Chia sẻ</button>
        </div>

        <span className="workspace-count">{filteredWorkspaces.length} workspace</span>
      </div>

      {loading ? (
        <div className="workspace-empty">
          <p>Đang tải workspace...</p>
        </div>
      ) : (
        <div className="workspace-grid">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onOpen={() => onOpenWorkspace?.(workspace)}
              onSettings={() => setSelectedWorkspace(workspace)}
            />
          ))}

          <button type="button" className="workspace-create-card" onClick={() => setShowCreate(true)}>
            <span>+</span>
            <strong>Tạo workspace mới</strong>
            <small>Tạo không gian để quản lý tài liệu</small>
          </button>
        </div>
      )}

      {!loading && filteredWorkspaces.length === 0 && (
        <div className="workspace-empty">
          <h3>Không tìm thấy workspace</h3>
          <p>Thử thay đổi từ khóa hoặc bộ lọc.</p>
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {selectedWorkspace && (
        <WorkspaceDetail workspace={selectedWorkspace} onClose={() => setSelectedWorkspace(null)} />
      )}
    </div>
  );
}