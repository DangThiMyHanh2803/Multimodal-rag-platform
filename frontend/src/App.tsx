import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import WorkspacePage from "./pages/WorkspacePage";
import SharedChatPage from "./pages/SharedChatPage";
import type { Workspace } from "./types/workspace";
import "./App.css";

type Page = "login" | "register" | "chat" | "dashboard" | "files" | "workspace" | "shared";

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "chat", icon: "/icon/chat.png", label: "Chat" },
  { page: "dashboard", icon: "/icon/dashboard.png", label: "Dashboard" },
  { page: "files", icon: "/icon/doc.png", label: "Tài liệu" },
  { page: "workspace", icon: "/icon/fordel.png", label: "Workspace" },
];

interface AppShellProps {
  page: Page;
  setPage: (page: Page) => void;
  workspaceId?: string;
  children: React.ReactNode;
}

function AppShell({ page, setPage, workspaceId, children }: AppShellProps) {
  const handleNavigation = (targetPage: Page) => {
    if (targetPage === "chat" && !workspaceId) {
      setPage("workspace");
      return;
    }

    setPage(targetPage);
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <img
          className="app-logo"
          src="/logo2.png"
          alt="logo"
          onClick={() => handleNavigation("chat")}
        />

        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            type="button"
            className={`app-nav-button ${page === item.page ? "active" : ""}`}
            onClick={() => handleNavigation(item.page)}
            title={item.label}
          >
            <img src={item.icon} alt={item.label} />
          </button>
        ))}

        <div className="app-sidebar-spacer" />

        <button
          type="button"
          className="app-login-button"
          onClick={() => setPage("login")}
          title="Đăng nhập"
        >
          👤
        </button>
      </aside>

      <main className="app-content">{children}</main>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("workspace");
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  const handleOpenWorkspace = (workspace: Workspace) => {
    console.log("OPEN WORKSPACE:", workspace);
    console.log("WORKSPACE ID:", workspace.id);

    setWorkspaceId(workspace.id);
    setPage("chat");
  };

  if (page === "login") {
    return <LoginPage onNavigateRegister={() => setPage("register")} />;
  }

  if (page === "register") {
    return <RegisterPage onNavigateLogin={() => setPage("login")} />;
  }

  if (page === "shared") {
    return <SharedChatPage />;
  }

  return (
    <AppShell
      page={page}
      setPage={setPage}
      workspaceId={workspaceId}
    >
      {page === "chat" && (
        <ChatPage workspaceId={workspaceId} />
      )}

      {page === "dashboard" && (
        <DashboardPage onNavigateChat={() => {
          if (workspaceId) {
            setPage("chat");
          } else {
            setPage("workspace");
          }
        }} />
      )}

      {page === "files" && <FilesPage />}

      {page === "workspace" && (
        <WorkspacePage onOpenWorkspace={handleOpenWorkspace} />
      )}
    </AppShell>
  );
}

export default App;