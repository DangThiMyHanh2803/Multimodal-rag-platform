import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../styles/theme";
import { Btn, Badge } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "audio" | "image" | "pptx";
  size: string;
  pages?: number;
  selected: boolean;
  status: "ready" | "indexing" | "error";
}

interface Source {
  fileId: string;
  fileName: string;
  page?: number;
  chunk?: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sources: Source[];
  ragas?: { faithfulness: number; relevance: number; precision: number };
  timestamp: Date;
  isError?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

interface ChatPageProps {
  workspaceId?: string;
  workspaceName?: string;
  onNavigateLogin?: () => void;
  onNavigateDashboard?: () => void;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_FILES: DocFile[] = [
  { id: "f1", name: "Giao_trinh_moi_truong.pdf", type: "pdf",   size: "4.2 MB", pages: 312, selected: true,  status: "ready" },
  { id: "f2", name: "Bai_giang_BOD_COD.pdf",     type: "pdf",   size: "1.8 MB", pages: 48,  selected: true,  status: "ready" },
  { id: "f3", name: "QCVN_40_2011.pdf",           type: "pdf",   size: "0.9 MB", pages: 22,  selected: true,  status: "ready" },
  { id: "f4", name: "Ghi_am_bai_hoc_tuan3.mp3",   type: "audio", size: "18 MB",              selected: false, status: "ready" },
  { id: "f5", name: "So_do_xu_ly_nuoc.jpg",        type: "image", size: "1.1 MB",             selected: false, status: "ready" },
  { id: "f6", name: "Bao_cao_thi_nghiem.docx",     type: "docx",  size: "2.3 MB", pages: 28,  selected: false, status: "indexing" },
];

const SEED_CONVERSATIONS: Conversation[] = [
  { id: "c1", title: "Tiêu chuẩn BOD và COD",       updatedAt: new Date(Date.now() - 600000),  messageCount: 8  },
  { id: "c2", title: "Phương pháp xử lý bùn",       updatedAt: new Date(Date.now() - 7200000), messageCount: 12 },
  { id: "c3", title: "So sánh phương pháp sinh học", updatedAt: new Date(Date.now() - 86400000),messageCount: 5  },
];

const SEED_MESSAGES: Message[] = [
  {
    id: "m1", role: "ai", sources: [], timestamp: new Date(Date.now() - 300000),
    text: "Xin chào! Tôi đã đọc xong **3 tài liệu** bạn chọn (Giáo trình môi trường, Bài giảng BOD/COD, QCVN 40:2011).\n\nHãy đặt câu hỏi — tôi sẽ trả lời dựa trên nội dung tài liệu và chỉ rõ trang, chương nguồn trích dẫn.",
  },
  {
    id: "m2", role: "user", sources: [], timestamp: new Date(Date.now() - 240000),
    text: "BOD là gì và tiêu chuẩn BOD₅ trong QCVN 40 là bao nhiêu?",
  },
  {
    id: "m3", role: "ai", sources: [
      { fileId: "f1", fileName: "Giao_trinh_moi_truong.pdf", page: 45, score: 0.94 },
      { fileId: "f2", fileName: "Bai_giang_BOD_COD.pdf",     page: 12, score: 0.91 },
      { fileId: "f3", fileName: "QCVN_40_2011.pdf",           page: 6,  score: 0.87 },
    ],
    ragas: { faithfulness: 0.94, relevance: 0.91, precision: 0.89 },
    timestamp: new Date(Date.now() - 230000),
    text: "**BOD** (Biochemical Oxygen Demand — Nhu cầu oxy sinh hóa) là lượng oxy cần thiết để vi sinh vật phân hủy các chất hữu cơ trong nước ở điều kiện hiếu khí.\n\n**Quy trình đo BOD₅:**\n1. Lấy mẫu nước thải, pha loãng theo tỷ lệ\n2. Đo nồng độ oxy hòa tan (DO) ban đầu\n3. Ủ mẫu ở 20°C trong 5 ngày, tối hoàn toàn\n4. Đo lại DO sau 5 ngày\n5. BOD₅ = DO đầu − DO cuối (mg/L)\n\n**Theo QCVN 40:2011/BTNMT:**\n• Loại A: BOD₅ ≤ **30 mg/L**\n• Loại B: BOD₅ ≤ **50 mg/L**\n\nVượt ngưỡng này nước thải phải qua xử lý bổ sung trước khi xả vào nguồn tiếp nhận.",
  },
];

const QUICK_SUGGESTIONS = [
  "Tóm tắt nội dung chính của tài liệu",
  "So sánh BOD và COD",
  "Phương pháp xử lý nước thải sinh học",
  "Tiêu chuẩn xả thải công nghiệp",
  "Quy trình vận hành bể Aerotank",
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function FileTypeIcon({ type }: { type: DocFile["type"] }) {
  const map: Record<DocFile["type"], string> = {
    pdf:   "/icon/icon-pdf.svg",
    docx:  "/icon/icon-docx.svg",
    audio: "/icon/icon-audio.svg",
    image: "/icon/icon-image.svg",
    pptx:  "/icon/icon-pptx.svg",
  };
  return <img src={map[type]} alt="" style={{ width: 38, height: 38, objectFit: "contain", flexShrink: 0 }} />;
}

function RagasRow({ ragas }: { ragas: NonNullable<Message["ragas"]> }) {
  const items = [
    { label: "Faithfulness", val: ragas.faithfulness, color: C.green },
    { label: "Relevance",    val: ragas.relevance,    color: C.accent },
    { label: "Precision",    val: ragas.precision,    color: C.teal },
  ];
  return (
    <div style={{
      display: "flex", gap: 10, marginTop: 10, padding: "8px 12px",
      background: `rgba(79,124,255,.05)`, border: `1px solid ${C.border}`,
      borderRadius: 8, flexWrap: "wrap",
    }}>
      {items.map(({ label, val, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
          <span style={{ color: C.textMuted }}>{label}:</span>
          <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
            {val.toFixed(2)}
          </span>
        </div>
      ))}
      <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>RAGAS</span>
    </div>
  );
}

function SourceChip({ source }: { source: Source }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: hover ? C.tealDim : C.surface,
        border: `1px solid ${hover ? C.teal : C.border}`,
        borderRadius: 20, padding: "3px 10px", fontSize: 11,
        color: hover ? C.teal : C.textSub, cursor: "pointer",
        transition: "all .15s",
      }}
    >
      📎 {source.fileName.replace(/\.[^.]+$/, "")}
      {source.page && <span style={{ color: C.textMuted }}>— tr.{source.page}</span>}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  // Simple markdown-like rendering: **bold**, \n→<br>
  const renderText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((p, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: C.text, fontWeight: 600 }}>{p}</strong>
              : <span key={j}>{p}</span>
          )}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <div style={{ maxWidth: "72%" }}>
          <div style={{
            background: C.accentDim, border: `1px solid rgba(79,124,255,.3)`,
            borderRadius: "14px 14px 4px 14px",
            padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: C.text,
          }}>
            {msg.text}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right", marginTop: 4 }}>
            {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: C.surfaceHigh,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, alignSelf: "flex-end",
        }}>👤</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, maxWidth: "88%" }}>
      <img src="/bot.png" alt="bot" style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        alignSelf: "flex-start", marginTop: 2, objectFit: "contain",
      }} />
      <div style={{ flex: 1 }}>
        <div style={{
          background: C.surfaceHigh, border: `1px solid ${C.border}`,
          borderRadius: "4px 14px 14px 14px",
          padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: C.textSub,
        }}>
          {msg.isError
            ? <span style={{ color: C.coral }}>⚠️ {msg.text}</span>
            : renderText(msg.text)
          }
        </div>
        {msg.sources.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Nguồn:</span>
            {msg.sources.map(s => <SourceChip key={`${s.fileId}-${s.page}`} source={s} />)}
          </div>
        )}
        {msg.ragas && <RagasRow ragas={msg.ragas} />}
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
          {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <img src="/bot.png" alt="bot" style={{
        width: 30, height: 30, borderRadius: "50%", objectFit: "contain", flexShrink: 0,
      }} />
      <div style={{
        background: C.surfaceHigh, border: `1px solid ${C.border}`,
        borderRadius: "4px 14px 14px 14px", padding: "14px 18px",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: C.accent,
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatPage({ workspaceName = "Đề tài môi trường", onNavigateLogin, onNavigateDashboard }: ChatPageProps) {
  const [files, setFiles]               = useState<DocFile[]>(SEED_FILES);
  const [conversations, setConversations] = useState<Conversation[]>(SEED_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("c1");
  const [messages, setMessages]         = useState<Message[]>(SEED_MESSAGES);
  const [input, setInput]               = useState("");
  const [typing, setTyping]             = useState(false);
  const [leftPanel, setLeftPanel]       = useState<"files" | "history">("files");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  const selectedCount = files.filter(f => f.selected && f.status === "ready").length;

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || typing) return;
    setShowSuggestions(false);

    const userMsg: Message = {
      id: `m${Date.now()}`, role: "user", text, sources: [], timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // TODO: POST /api/chat
    // const res = await fetch("/api/chat", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    //   body: JSON.stringify({
    //     conversation_id: activeConvId,
    //     message: text,
    //     file_ids: files.filter(f => f.selected).map(f => f.id),
    //   }),
    // });
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: `m${Date.now() + 1}`, role: "ai", timestamp: new Date(),
        text: "Dựa trên tài liệu bạn đã cung cấp, hệ thống đã truy xuất các đoạn văn bản liên quan nhất qua Reranker (bge-reranker-v2-m3) và tổng hợp câu trả lời sau.\n\nNếu thông tin không có trong tài liệu được chọn, hệ thống sẽ thông báo rõ thay vì tự bịa.",
        sources: [
          { fileId: "f1", fileName: "Giao_trinh_moi_truong.pdf", page: 67, score: 0.92 },
          { fileId: "f2", fileName: "Bai_giang_BOD_COD.pdf", page: 8, score: 0.85 },
        ],
        ragas: { faithfulness: 0.91, relevance: 0.88, precision: 0.86 },
      }]);
    }, 2000);
  }, [input, typing, activeConvId, files]);

  const newConversation = () => {
    const id = `c${Date.now()}`;
    const conv: Conversation = { id, title: "Cuộc trò chuyện mới", updatedAt: new Date(), messageCount: 0 };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(id);
    setMessages(SEED_MESSAGES.slice(0, 1));
    setShowSuggestions(true);
  };

  const toggleFile = (id: string) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const newFiles: DocFile[] = picked.map(f => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const typeMap: Record<string, DocFile["type"]> = {
        pdf: "pdf", docx: "docx", doc: "docx",
        mp3: "audio", wav: "audio", m4a: "audio",
        jpg: "image", jpeg: "image", png: "image",
        pptx: "pptx", ppt: "pptx",
      };
      return {
        id: `f${Date.now()}-${Math.random()}`,
        name: f.name,
        type: typeMap[ext] ?? "pdf",
        size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        selected: true,
        status: "indexing",
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
    // TODO: gọi POST /api/files/upload rồi cập nhật status → "ready"
  };

  const formatRelTime = (d: Date) => {
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return `${Math.floor(diff / 86400000)} ngày trước`;
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: C.bg }}>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { opacity: .25; transform: translateY(0); }
          30%            { opacity: 1;   transform: translateY(-5px); }
        }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div style={{
        width: 230, minWidth: 230, background: C.surface,
        borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column",
      }}>
        {/* Tab switcher */}
        <div style={{
          display: "flex", borderBottom: `1px solid ${C.border}`,
          padding: "10px 10px 0",
        }}>
          {(["files", "history"] as const).map(tab => (
            <button key={tab} onClick={() => setLeftPanel(tab)} style={{
              flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 500, border: "none",
              background: "none", cursor: "pointer", borderRadius: "7px 7px 0 0",
              color: leftPanel === tab ? C.accent : C.textMuted,
              borderBottom: `2px solid ${leftPanel === tab ? C.accent : "transparent"}`,
              transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <img src={tab === "files" ? "/icon/doc.png" : "/icon/chat.png"} alt="" style={{ width: 24, height: 24, objectFit: "contain", marginRight: 5, opacity: leftPanel === tab ? 1 : 0.5 }} />
              {tab === "files" ? "Tài liệu" : "Lịch sử"}
            </button>
          ))}
        </div>

        {leftPanel === "files" && (
          <>
            <div style={{ padding: "10px 12px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {selectedCount}/{files.filter(f => f.status === "ready").length} đang dùng
              </span>
              <button style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setFiles(prev => prev.map(f => f.status === "ready" ? { ...f, selected: true } : f))}>
                Chọn tất cả
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
              {files.map(f => (
                <div key={f.id}
                  onClick={() => f.status === "ready" && toggleFile(f.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 9, cursor: f.status === "ready" ? "pointer" : "default",
                    marginBottom: 2, background: f.selected && f.status === "ready" ? C.accentDim : "transparent",
                    transition: "background .15s", opacity: f.status === "indexing" ? 0.5 : 1,
                  }}>
                  <FileTypeIcon type={f.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, color: f.selected && f.status === "ready" ? C.text : C.textSub,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>
                      {f.status === "indexing" ? "⏳ Đang xử lý..." : `${f.size}${f.pages ? ` · ${f.pages}tr` : ""}`}
                    </div>
                  </div>
                  {f.status === "ready" && (
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${f.selected ? C.accent : C.border}`,
                      background: f.selected ? C.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: "white", transition: "all .15s",
                    }}>{f.selected ? "✓" : ""}</div>
                  )}
                </div>
              ))}
            </div>
            {/* Upload shortcut */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.pptx,.ppt"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
            <div style={{
              margin: 8, border: `1.5px dashed ${C.border}`, borderRadius: 10,
              padding: "12px", textAlign: "center", cursor: "pointer",
            }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentGlow; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}>
              <div style={{ fontSize: 18, marginBottom: 3 }}>+</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Thêm tài liệu</div>
              <div style={{ fontSize: 10, color: C.textMuted, opacity: 0.6 }}>PDF · DOCX · MP3 · JPG</div>
            </div>
          </>
        )}

        {leftPanel === "history" && (
          <>
            <div style={{ padding: "10px 8px 6px" }}>
              <Btn variant="primary" fullWidth style={{ fontSize: 12, height: 34 }} onClick={newConversation}>
                + Cuộc trò chuyện mới
              </Btn>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
              {conversations.map(conv => (
                <div key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                    background: activeConvId === conv.id ? C.accentDim : "transparent",
                    border: `1px solid ${activeConvId === conv.id ? `rgba(79,124,255,.3)` : "transparent"}`,
                    marginBottom: 3, transition: "all .15s",
                  }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: activeConvId === conv.id ? C.text : C.textSub,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{conv.title}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                    <span>{conv.messageCount} tin nhắn</span>
                    <span>{formatRelTime(conv.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── CHAT AREA ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{
          height: 52, borderBottom: `1px solid ${C.border}`, background: C.surface,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
        }}>
          <img src="/logo2.png" alt="logo" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{workspaceName}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>·</div>
          <div style={{ fontSize: 12, color: C.textSub }}>
            {selectedCount} tài liệu · {messages.length - 1} tin nhắn
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Btn variant="ghost" style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
              <img src="/icon/export.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
              Xuất chat
            </Btn>
            <Btn variant="teal"  style={{ fontSize: 12, padding: "5px 12px" }} onClick={newConversation}>+ Chat mới</Btn>
            <Btn variant="ghost" style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={onNavigateDashboard}>
              <img src="/icon/dashboard.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
              Dashboard
            </Btn>
            <Btn variant="primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={onNavigateLogin}>Đăng nhập</Btn>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
          {typing && <TypingIndicator />}

          {/* Quick suggestions (chỉ hiện khi chat mới) */}
          {showSuggestions && !typing && messages.length <= 1 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Gợi ý câu hỏi:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QUICK_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    style={{
                      background: C.surfaceHigh, border: `1px solid ${C.border}`,
                      borderRadius: 20, padding: "6px 14px", fontSize: 13, color: C.textSub,
                      cursor: "pointer", transition: "all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* RAGAS status bar */}
        {messages.length > 1 && (
          <div style={{
            padding: "7px 28px", borderTop: `1px solid ${C.border}`,
            background: C.surface, display: "flex", gap: 18, alignItems: "center",
          }}>
            {[
              { label: "Faithfulness", val: 0.93, color: C.green },
              { label: "Relevance",    val: 0.89, color: C.accent },
              { label: "Precision",    val: 0.87, color: C.teal },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11 }}>
                <span style={{ color: C.textMuted }}>{m.label}:</span>
                <span style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  {m.val.toFixed(2)}
                </span>
              </div>
            ))}
            <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>avg session · RAGAS</span>
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: "14px 28px 20px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
          {selectedCount === 0 && (
            <div style={{
              fontSize: 12, color: C.amber, background: "rgba(245,158,11,.08)",
              border: `1px solid rgba(245,158,11,.2)`, borderRadius: 8,
              padding: "7px 12px", marginBottom: 10,
            }}>
              ⚠️ Chưa chọn tài liệu nào — hãy chọn ít nhất 1 tài liệu trong panel bên trái
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Đặt câu hỏi về tài liệu... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={1}
              style={{
                flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "12px 16px", fontSize: 14, color: C.text,
                resize: "none", outline: "none", lineHeight: 1.5,
                minHeight: 48, maxHeight: 140, transition: "border-color .15s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || typing || selectedCount === 0}
              style={{
                width: 44, height: 44, borderRadius: 11, border: "none",
                background: !input.trim() || typing || selectedCount === 0 ? C.surfaceHigh : C.accent,
                cursor: !input.trim() || typing || selectedCount === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s", flexShrink: 0,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={!input.trim() || typing || selectedCount === 0 ? C.textMuted : "white"}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {["Tóm tắt tài liệu này", "So sánh các phương pháp", "Giải thích thuật ngữ"].map(s => (
              <button key={s} onClick={() => setInput(s)}
                style={{
                  fontSize: 11, color: C.textMuted, background: C.surfaceHigh,
                  border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 10px",
                  cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}>
                <img src="/icon/light.png" alt="" style={{ width: 25, height: 25, objectFit: "contain", marginRight: 4 }} />{s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
