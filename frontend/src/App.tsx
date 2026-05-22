import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import WorkspacePage from "./pages/WorkspacePage";
import SharedChatPage from "./pages/SharedChatPage";
import { C } from "./styles/theme";

type Page = "login" | "register" | "chat" | "dashboard" | "files" | "workspace" | "shared";

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "chat",      icon: "/icon/chat.png",      label: "Chat" },
  { page: "dashboard", icon: "/icon/dashboard.png", label: "Dashboard" },
  { page: "files",     icon: "/icon/doc.png",       label: "Tài liệu" },
  { page: "workspace", icon: "/icon/fordel.png",    label: "Workspace" },
];

function AppShell({ page, setPage, children }: {
  page: Page; setPage: (p: Page) => void; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg }}>
      {/* Sidebar */}
      <div style={{
        width: 56, minWidth: 56, background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "12px 0", gap: 4,
      }}>
        <img src="/logo2.png" alt="logo" onClick={() => setPage("chat")} style={{ width: 30, height: 30, objectFit: "contain", marginBottom: 12, cursor: "pointer" }} />
        {NAV_ITEMS.map(item => (
          <button key={item.page} onClick={() => setPage(item.page)} title={item.label} style={{
            width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
            background: page === item.page ? C.accentDim : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
            outline: page === item.page ? `1.5px solid ${C.accent}` : "none",
          }}>
            <img src={item.icon} alt={item.label} style={{ width: 28, height: 28, objectFit: "contain", opacity: page === item.page ? 1 : 0.55 }} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setPage("login")} title="Đăng nhập" style={{
          width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
          background: "transparent", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>👤</button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("chat");

  if (page === "login")    return <LoginPage onNavigateRegister={() => setPage("register")} />;
  if (page === "register") return <RegisterPage onNavigateLogin={() => setPage("login")} />;
  if (page === "shared")   return <SharedChatPage />;

  return (
    <AppShell page={page} setPage={setPage}>
      {page === "chat"      && <ChatPage onNavigateLogin={() => setPage("login")} onNavigateDashboard={() => setPage("dashboard")} />}
      {page === "dashboard" && <DashboardPage onNavigateChat={() => setPage("chat")} />}
      {page === "files"     && <FilesPage />}
      {page === "workspace" && <WorkspacePage />}
    </AppShell>
  );
}

export default App;
