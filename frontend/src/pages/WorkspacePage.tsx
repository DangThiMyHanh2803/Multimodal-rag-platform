import { useState } from "react";
import { C } from "../styles/theme";
import { Btn, Badge, Input, Card } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "owner" | "editor" | "viewer";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  fileCount: number;
  messageCount: number;
  members: Member[];
  createdAt: Date;
  updatedAt: Date;
  isOwner: boolean;
  sharedLink?: string;
}

interface WorkspacePageProps {
  onOpenWorkspace?: (ws: Workspace) => void;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const MEMBER_COLORS = [C.accent, C.teal, C.amber, C.coral, C.green, C.purple];

const SEED_WORKSPACES: Workspace[] = [
  {
    id: "ws1", name: "Đề tài môi trường", icon: "/icon/lacay.png", iconBg: "rgba(45,212,191,.12)",
    description: "Nghiên cứu xử lý nước thải công nghiệp khu vực phía Nam — Luận văn tốt nghiệp 2025",
    fileCount: 12, messageCount: 87, isOwner: true,
    createdAt: new Date("2025-03-10"), updatedAt: new Date(Date.now() - 600000),
    members: [
      { id: "u1", name: "Nguyễn Văn A", email: "a@email.com", role: "owner",  avatarColor: C.accent },
      { id: "u2", name: "Trần Thị B",   email: "b@email.com", role: "editor", avatarColor: C.teal  },
      { id: "u3", name: "Lê Văn C",     email: "c@email.com", role: "viewer", avatarColor: C.amber },
    ],
  },
  {
    id: "ws2", name: "Tiểu luận RAG", icon: "/icon/robot.png", iconBg: "rgba(167,139,250,.12)",
    description: "Tài liệu nghiên cứu và bài báo về mô hình Advanced RAG + Reranker",
    fileCount: 8, messageCount: 34, isOwner: true,
    createdAt: new Date("2025-04-22"), updatedAt: new Date(Date.now() - 7200000),
    members: [
      { id: "u1", name: "Nguyễn Văn A", email: "a@email.com", role: "owner", avatarColor: C.accent },
    ],
  },
  {
    id: "ws3", name: "Giáo trình CNMT K22", icon: "/icon/book.png", iconBg: "rgba(245,158,11,.12)",
    description: "Toàn bộ giáo trình ngành Công nghệ Môi trường khoá 22 — chia sẻ nhóm lớp",
    fileCount: 24, messageCount: 203, isOwner: false,
    createdAt: new Date("2025-01-05"), updatedAt: new Date(Date.now() - 86400000),
    sharedLink: "https://docrag.app/share/k22cnmt",
    members: [
      { id: "u4", name: "Phạm Thị D",   email: "d@email.com", role: "owner",  avatarColor: C.purple },
      { id: "u1", name: "Nguyễn Văn A", email: "a@email.com", role: "viewer", avatarColor: C.accent },
      { id: "u5", name: "Hoàng Văn E",  email: "e@email.com", role: "editor", avatarColor: C.coral  },
      { id: "u6", name: "Vũ Thị F",     email: "f@email.com", role: "viewer", avatarColor: C.green  },
    ],
  },
  {
    id: "ws4", name: "Lab xử lý nước", icon: "/icon/microscope.png", iconBg: "rgba(248,113,113,.12)",
    description: "Tài liệu thực hành phòng lab, báo cáo thí nghiệm các tuần",
    fileCount: 6, messageCount: 19, isOwner: true,
    createdAt: new Date("2025-05-01"), updatedAt: new Date(Date.now() - 3600000),
    members: [
      { id: "u1", name: "Nguyễn Văn A", email: "a@email.com", role: "owner",  avatarColor: C.accent },
      { id: "u2", name: "Trần Thị B",   email: "b@email.com", role: "editor", avatarColor: C.teal  },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MemberAvatars({ members, max = 4 }: { members: Member[]; max?: number }) {
  const shown = members.slice(0, max);
  const rest  = members.length - max;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((m, i) => (
        <div key={m.id} title={`${m.name} (${m.role})`} style={{
          width: 24, height: 24, borderRadius: "50%",
          background: m.avatarColor, color: "white",
          border: `2px solid ${C.surface}`, marginLeft: i === 0 ? 0 : -7,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600, zIndex: max - i, position: "relative",
          cursor: "default",
        }}>
          {m.name[0]}
        </div>
      ))}
      {rest > 0 && (
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: C.surfaceHigh, color: C.textSub,
          border: `2px solid ${C.surface}`, marginLeft: -7,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 600,
        }}>+{rest}</div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, [string, string]> = {
    owner:  [C.accent, "Owner"],
    editor: [C.teal,   "Editor"],
    viewer: [C.textMuted, "Viewer"],
  };
  const [color, label] = map[role];
  return <Badge color={color}>{label}</Badge>;
}

function WorkspaceCard({
  ws, onOpen, onSettings,
}: {
  ws: Workspace;
  onOpen: () => void;
  onSettings: () => void;
}) {
  const [hover, setHover] = useState(false);
  const formatTime = (d: Date) => {
    const diff = Date.now() - d.getTime();
    if (diff < 3600000)  return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString("vi-VN");
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hover ? C.accent : C.border}`,
        borderRadius: 16, padding: "20px", cursor: "pointer",
        transition: "all .2s", transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? `0 8px 30px rgba(79,124,255,.08)` : "none",
      }}
      onClick={onOpen}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: ws.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <img src={ws.icon} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{ws.name}</span>
            {!ws.isOwner && <Badge color={C.teal}>Chia sẻ</Badge>}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            Cập nhật {formatTime(ws.updatedAt)}
          </div>
        </div>
        {/* Settings dot menu */}
        <button
          onClick={e => { e.stopPropagation(); onSettings(); }}
          style={{
            width: 28, height: 28, borderRadius: 7, background: hover ? C.surfaceHigh : "transparent",
            border: "none", cursor: "pointer", color: C.textMuted, fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>⋯</button>
      </div>

      {/* Description */}
      <p style={{
        fontSize: 12, color: C.textSub, lineHeight: 1.55, marginBottom: 16,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>{ws.description}</p>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        {[
          { icon: "/icon/doc.png",      val: ws.fileCount,      label: "file" },
          { icon: "/icon/question.png", val: ws.messageCount,   label: "câu hỏi" },
          { icon: "/icon/users.png",    val: ws.members.length, label: "thành viên" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textMuted }}>
            <img src={s.icon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
            <span style={{ color: C.textSub, fontWeight: 500 }}>{s.val}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MemberAvatars members={ws.members} />
        <Btn variant="teal" style={{ fontSize: 12, padding: "5px 14px" }} onClick={onOpen}>
          Mở →
        </Btn>
      </div>
    </div>
  );
}

// ─── Create Workspace Modal ───────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (ws: Workspace) => void }) {
  const [name, setName]     = useState("");
  const [desc, setDesc]     = useState("");
  const [access, setAccess] = useState<"private" | "group" | "public">("private");
  const [icon, setIcon]     = useState("📁");
  const icons = ["📁","🌿","🤖","📚","🔬","⚗️","🏭","📊","🗂️","🧪"];
  const nameErr = name.trim().length > 0 && name.trim().length < 3 ? "Tên workspace tối thiểu 3 ký tự" : undefined;

  const submit = () => {
    if (!name.trim() || nameErr) return;
    onCreate({
      id: `ws${Date.now()}`, name: name.trim(), description: desc.trim(),
      icon, iconBg: "rgba(79,124,255,.12)",
      fileCount: 0, messageCount: 0, isOwner: true,
      createdAt: new Date(), updatedAt: new Date(),
      members: [{ id: "u1", name: "Nguyễn Văn A", email: "a@email.com", role: "owner", avatarColor: C.accent }],
    });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.65)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "28px 28px 24px", width: 460,
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 22 }}>Tạo workspace mới</h2>

        {/* Icon picker */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.textSub, marginBottom: 8 }}>Icon</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {icons.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width: 38, height: 38, borderRadius: 9, fontSize: 18,
                border: `1.5px solid ${icon === ic ? C.accent : C.border}`,
                background: icon === ic ? C.accentDim : C.surfaceHigh,
                cursor: "pointer", transition: "all .15s",
              }}>{ic}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Tên workspace *" placeholder="VD: Luận văn tốt nghiệp 2025"
            value={name} onChange={e => setName(e.target.value)} error={nameErr} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>Mô tả</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Mô tả ngắn về mục đích workspace..."
              rows={3}
              style={{
                background: C.surfaceHigh, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text,
                outline: "none", resize: "none",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
            />
          </div>

          {/* Access level */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textSub, marginBottom: 8 }}>
              Quyền truy cập
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                ["private", "🔒", "Chỉ mình tôi",           "Không ai khác có thể xem"],
                ["group",   "👥", "Nhóm (có thể mời)",       "Mời thành viên qua email"],
                ["public",  "🔗", "Link công khai (chỉ xem)","Ai có link đều xem được"],
              ] as const).map(([val, ic, label, sub]) => (
                <label key={val} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${access === val ? C.accent : C.border}`,
                  background: access === val ? C.accentDim : C.surfaceHigh,
                  transition: "all .15s",
                }}>
                  <input type="radio" checked={access === val} onChange={() => setAccess(val)}
                    style={{ accentColor: C.accent }} />
                  <span style={{ fontSize: 16 }}>{ic}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" onClick={submit} disabled={!name.trim() || !!nameErr}>
            Tạo workspace
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Detail Drawer ──────────────────────────────────────────────────
function DetailDrawer({ ws, onClose }: { ws: Workspace; onClose: () => void }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState<Role>("viewer");
  const [copied, setCopied]           = useState(false);

  const copyLink = () => {
    // navigator.clipboard.writeText(ws.sharedLink ?? window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", justifyContent: "flex-end", zIndex: 150,
    }} onClick={onClose}>
      <div style={{
        width: 400, height: "100%", background: C.surface,
        borderLeft: `1px solid ${C.border}`, overflowY: "auto",
        padding: "24px 22px",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: ws.iconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img src={ws.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ws.name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{ws.fileCount} file · {ws.messageCount} câu hỏi</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</button>
        </div>

        {/* Description */}
        <Card style={{ padding: "14px 16px", marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{ws.description}</p>
        </Card>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[
            { val: ws.fileCount,     label: "Tài liệu", color: C.accent },
            { val: ws.messageCount,  label: "Câu hỏi",  color: C.teal  },
            { val: ws.members.length,label: "Thành viên",color: C.amber },
          ].map(s => (
            <div key={s.label} style={{
              background: C.surfaceHigh, borderRadius: 10, padding: "12px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Members */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
            Thành viên ({ws.members.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ws.members.map(m => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", background: C.surfaceHigh, borderRadius: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: m.avatarColor, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                }}>{m.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                </div>
                <RoleBadge role={m.role} />
              </div>
            ))}
          </div>
        </div>

        {/* Invite (chỉ owner/editor) */}
        {ws.isOwner && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Mời thành viên
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email thành viên"
                style={{
                  flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.text, outline: "none",
                }}
              />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}
                style={{
                  background: C.surfaceHigh, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: "0 10px", fontSize: 12, color: C.textSub, outline: "none",
                }}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <Btn variant="teal" fullWidth style={{ marginTop: 10, fontSize: 13 }}
              disabled={!inviteEmail.includes("@")}>
              Gửi lời mời
            </Btn>
          </div>
        )}

        {/* Share link */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            Link chia sẻ chỉ xem
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`,
              borderRadius: 9, padding: "9px 12px", fontSize: 12, color: C.textMuted,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {ws.sharedLink ?? "docrag.app/share/ws-abc123"}
            </div>
            <Btn variant="ghost" style={{ fontSize: 12, flexShrink: 0 }} onClick={copyLink}>
              {copied ? "✓ Đã copy" : "Copy"}
            </Btn>
          </div>
        </div>

        {/* Danger zone */}
        {ws.isOwner && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.coral, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              Vùng nguy hiểm
            </div>
            <Btn variant="danger" style={{ fontSize: 13, width: "100%", justifyContent: "center" }}>
              🗑️ Xóa workspace
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkspacePage({ onOpenWorkspace }: WorkspacePageProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(SEED_WORKSPACES);
  const [showCreate, setShowCreate] = useState(false);
  const [detailWs, setDetailWs]     = useState<Workspace | null>(null);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<"all" | "mine" | "shared">("all");

  const filtered = workspaces.filter(ws => {
    const matchSearch = ws.name.toLowerCase().includes(search.toLowerCase()) ||
                        ws.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "mine" && ws.isOwner) || (filter === "shared" && !ws.isOwner);
    return matchSearch && matchFilter;
  });

  const onCreate = (ws: Workspace) => setWorkspaces(prev => [ws, ...prev]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Workspaces</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            Nhóm tài liệu theo dự án, chia sẻ và cộng tác với nhóm
          </p>
        </div>
        <Btn variant="primary" style={{ fontSize: 13 }} onClick={() => setShowCreate(true)}>
          + Tạo workspace
        </Btn>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <img src="/icon/magnifyingGlass.png" alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, objectFit: "contain", opacity: 0.5 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm workspace..."
            style={{
              width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "9px 12px 9px 36px", fontSize: 13, color: C.text, outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "mine", "shared"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              background: filter === f ? C.accentDim : "transparent",
              color: filter === f ? C.accent : C.textSub, cursor: "pointer", transition: "all .15s",
            }}>
              {{ all: "Tất cả", mine: "Của tôi", shared: "Chia sẻ" }[f]}
            </button>
          ))}
        </div>
        {/* Summary */}
        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>
          {filtered.length} workspace
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {filtered.map(ws => (
          <WorkspaceCard
            key={ws.id}
            ws={ws}
            onOpen={() => onOpenWorkspace?.(ws)}
            onSettings={() => setDetailWs(ws)}
          />
        ))}

        {/* Create new card */}
        <div
          onClick={() => setShowCreate(true)}
          style={{
            background: "transparent", border: `1.5px dashed ${C.border}`,
            borderRadius: 16, padding: "20px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 10, minHeight: 200,
            transition: "all .2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.accent;
            (e.currentTarget as HTMLDivElement).style.background = C.accentGlow;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.35 }}>+</div>
          <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Tạo workspace mới</div>
          <div style={{ fontSize: 11, color: C.textMuted, opacity: 0.6, textAlign: "center" }}>
            Nhóm tài liệu theo chủ đề hoặc dự án
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
          <img src="/icon/magnifyingGlass.png" alt="" style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Không tìm thấy workspace</div>
          <div style={{ fontSize: 13 }}>Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc</div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={onCreate} />}
      {detailWs   && <DetailDrawer ws={detailWs} onClose={() => setDetailWs(null)} />}
    </div>
  );
}
