import { useState, useRef, useEffect } from "react";
import { C } from "../styles/theme";
import { Btn, Badge } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Source {
  fileName: string;
  page?: number;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sources: Source[];
  ragas?: { faithfulness: number; relevance: number };
  timestamp: Date;
}

interface SharedMeta {
  workspaceName: string;
  ownerName: string;
  ownerAvatar: string;      // initials
  ownerColor: string;
  description: string;
  fileCount: number;
  createdAt: Date;
  expiresAt?: Date;
  allowQuestions: boolean;  // true = viewer có thể tự hỏi
  token: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SHARED_META: SharedMeta = {
  workspaceName:  "Đề tài môi trường — QCVN 40:2011",
  ownerName:      "Nguyễn Văn A",
  ownerAvatar:    "N",
  ownerColor:     C.accent,
  description:    "Tài liệu nghiên cứu về tiêu chuẩn nước thải công nghiệp QCVN 40:2011/BTNMT kèm giáo trình kỹ thuật xử lý nước thải. Chia sẻ để tham khảo, không chỉnh sửa được.",
  fileCount:      5,
  createdAt:      new Date("2025-05-15"),
  expiresAt:      new Date("2025-06-15"),
  allowQuestions: true,
  token:          "k22cnmt-abc123",
};

const DEMO_MESSAGES: Message[] = [
  {
    id: "m1", role: "user", sources: [], timestamp: new Date(Date.now() - 3600000),
    text: "Tiêu chuẩn BOD₅ trong QCVN 40 là bao nhiêu?",
  },
  {
    id: "m2", role: "ai", timestamp: new Date(Date.now() - 3590000),
    sources: [
      { fileName: "QCVN_40_2011_BTNMT.pdf", page: 6,  score: 0.94 },
      { fileName: "Giao_trinh_moi_truong.pdf", page: 45, score: 0.88 },
    ],
    ragas: { faithfulness: 0.94, relevance: 0.91 },
    text: "Theo **QCVN 40:2011/BTNMT**, giới hạn BOD₅ trong nước thải công nghiệp:\n\n• **Cột A** (xả vào nguồn nước dùng cho cấp nước sinh hoạt): ≤ **30 mg/L**\n• **Cột B** (xả vào nguồn nước không dùng cho cấp nước sinh hoạt): ≤ **50 mg/L**\n\nKhi nồng độ BOD₅ vượt ngưỡng này, nước thải bắt buộc phải qua xử lý sinh học hoặc hóa học bổ sung trước khi xả thải.",
  },
  {
    id: "m3", role: "user", sources: [], timestamp: new Date(Date.now() - 1800000),
    text: "Phương pháp sinh học nào hiệu quả nhất để giảm BOD?",
  },
  {
    id: "m4", role: "ai", timestamp: new Date(Date.now() - 1790000),
    sources: [
      { fileName: "Giao_trinh_moi_truong.pdf", page: 112, score: 0.91 },
      { fileName: "Giao_trinh_moi_truong.pdf", page: 118, score: 0.85 },
    ],
    ragas: { faithfulness: 0.92, relevance: 0.89 },
    text: "Theo giáo trình, các phương pháp sinh học hiếu khí phổ biến để giảm BOD:\n\n**1. Bể Aerotank (ASP):**\n• Hiệu quả khử BOD: 85–95%\n• Phù hợp nước thải có BOD₅ = 200–500 mg/L\n• Chi phí vận hành cao do sục khí liên tục\n\n**2. Lọc sinh học (Biofilter):**\n• Hiệu quả: 75–90%\n• Ít tiêu thụ năng lượng hơn Aerotank\n• Phù hợp quy mô vừa và nhỏ\n\n**3. MBBR (Moving Bed Biofilm Reactor):**\n• Hiệu quả cao nhất: 90–98%\n• Chiếm ít diện tích, dễ nâng công suất\n• Được khuyến nghị cho khu công nghiệp mới",
  },
];

const SUGGESTED_QS = [
  "So sánh COD và BOD trong đánh giá nước thải",
  "Ngưỡng COD cho phép theo QCVN 40",
  "Phương pháp xử lý bùn thải trong khu công nghiệp",
  "Tần suất lấy mẫu kiểm tra nước thải theo quy định",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderText(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ color: C.text, fontWeight: 600 }}>{p}</strong>
            : <span key={j}>{p}</span>
        )}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourceChip({ source }: { source: Source }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: hover ? C.tealDim : C.surface,
        border: `1px solid ${hover ? C.teal : C.border}`,
        borderRadius: 20, padding: "3px 10px", fontSize: 11,
        color: hover ? C.teal : C.textSub, cursor: "default", transition: "all .15s",
      }}>
      📎 {source.fileName.replace(/\.[^.]+$/, "")}
      {source.page && <span style={{ color: C.textMuted }}>tr.{source.page}</span>}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <img src="/bot.png" alt="bot" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "contain", flexShrink: 0 }} />
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

// ─── Expiry countdown ────────────────────────────────────────────────────────
function ExpiryBar({ expiresAt }: { expiresAt: Date }) {
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);
  const color = daysLeft <= 3 ? C.coral : daysLeft <= 7 ? C.amber : C.teal;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: `${color}12`, border: `1px solid ${color}30`,
      borderRadius: 8, padding: "6px 12px", fontSize: 12,
    }}>
      <span style={{ color }}>⏰</span>
      <span style={{ color: C.textSub }}>
        Link hết hạn trong{" "}
        <strong style={{ color }}>{daysLeft} ngày</strong>
        {" "}({expiresAt.toLocaleDateString("vi-VN")})
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SharedChatPage() {
  // In production: parse token from URL
  // const { token } = useParams<{ token: string }>();
  // Then fetch: GET /api/shared/:token → meta + messages

  const meta = SHARED_META;
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [copied, setCopied]     = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  const sendQuestion = () => {
    const text = input.trim();
    if (!text || typing || !meta.allowQuestions) return;

    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, role: "user", text, sources: [], timestamp: new Date(),
    }]);
    setInput("");
    setTyping(true);

    // TODO: POST /api/shared/:token/ask
    // const res = await fetch(`/api/shared/${token}/ask`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ question: text }),
    // });
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: `m${Date.now() + 1}`, role: "ai", timestamp: new Date(),
        text: "Dựa trên tài liệu trong workspace này, hệ thống đã truy xuất các đoạn văn bản liên quan và tổng hợp câu trả lời. Nếu thông tin không có trong tài liệu được chia sẻ, hệ thống sẽ thông báo rõ thay vì tự bịa.",
        sources: [{ fileName: "QCVN_40_2011_BTNMT.pdf", page: 8, score: 0.91 }],
        ragas: { faithfulness: 0.91, relevance: 0.88 },
      }]);
    }, 2000);
  };

  const copyLink = () => {
    // navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const daysActive = Math.floor((Date.now() - meta.createdAt.getTime()) / 86400000);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes bounce {
          0%,60%,100% { opacity:.25; transform:translateY(0); }
          30%          { opacity:1;   transform:translateY(-5px); }
        }
      `}</style>

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "0 24px", height: 58,
        display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/logo2.png" alt="logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.3 }}>DocRAG</span>
        </div>

        <div style={{ width: 1, height: 20, background: C.border }} />

        {/* Workspace name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta.workspaceName}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
            Chia sẻ bởi {meta.ownerName} · {meta.fileCount} tài liệu
          </div>
        </div>

        {/* Badges */}
        <Badge color={C.teal}>🔗 Chỉ xem</Badge>
        {meta.allowQuestions && <Badge color={C.accent}>💬 Hỏi đáp bật</Badge>}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setShowInfo(v => !v)}>
            ℹ Info
          </Btn>
          <Btn variant="ghost" style={{ fontSize: 12 }} onClick={copyLink}>
            {copied ? "✓ Đã copy" : "🔗 Copy link"}
          </Btn>
          <Btn variant="primary" style={{ fontSize: 12 }}
            onClick={() => window.open("https://docrag.app/register", "_blank")}>
            Đăng ký miễn phí →
          </Btn>
        </div>
      </div>

      {/* ── INFO PANEL (collapsible) ─────────────────────────────── */}
      {showInfo && (
        <div style={{
          background: C.surfaceHigh, borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px",
        }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Owner */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: meta.ownerColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: "white",
              }}>{meta.ownerAvatar}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{meta.ownerName}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Chủ workspace</div>
              </div>
            </div>

            <div style={{ width: 1, height: 40, background: C.border }} />

            {/* Description */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{meta.description}</p>
            </div>

            <div style={{ width: 1, height: 40, background: C.border }} />

            {/* Stats */}
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Tài liệu",   val: meta.fileCount,               color: C.accent },
                { label: "Câu hỏi",    val: messages.filter(m => m.role === "user").length, color: C.teal },
                { label: "Ngày hoạt động", val: daysActive,               color: C.amber  },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Expiry */}
            {meta.expiresAt && (
              <div style={{ alignSelf: "center" }}>
                <ExpiryBar expiresAt={meta.expiresAt} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN BODY ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 16px" }}>
        <div style={{ width: "100%", maxWidth: 780, display: "flex", flexDirection: "column" }}>

          {/* Banner: đây là link chia sẻ */}
          <div style={{
            margin: "20px 0 0",
            background: `${C.accent}0a`, border: `1px solid ${C.accent}25`,
            borderRadius: 12, padding: "12px 18px",
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 18 }}>🔗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                Đây là trang xem chia sẻ — chỉ xem, không chỉnh sửa được
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {meta.allowQuestions
                  ? "Bạn có thể đặt câu hỏi về tài liệu trong workspace này"
                  : "Workspace này không cho phép đặt câu hỏi mới"}
              </div>
            </div>
            <Btn variant="primary" style={{ fontSize: 12 }}
              onClick={() => window.open("https://docrag.app/register", "_blank")}>
              Tạo workspace của bạn →
            </Btn>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "24px 0", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Section divider for existing messages */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {messages.length} tin nhắn trong phiên chia sẻ này
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {messages.map(m => (
              <div key={m.id}>
                {m.role === "user" ? (
                  /* User bubble */
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{
                        background: C.accentDim, border: `1px solid rgba(79,124,255,.3)`,
                        borderRadius: "14px 14px 4px 14px",
                        padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: C.text,
                      }}>{m.text}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right", marginTop: 4 }}>
                        {m.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: C.surfaceHigh,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, flexShrink: 0, alignSelf: "flex-end",
                    }}>👤</div>
                  </div>
                ) : (
                  /* AI bubble */
                  <div style={{ display: "flex", gap: 10 }}>
                    <img src="/bot.png" alt="bot" style={{
                      width: 30, height: 30, borderRadius: "50%", objectFit: "contain",
                      flexShrink: 0, alignSelf: "flex-start", marginTop: 2,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        background: C.surfaceHigh, border: `1px solid ${C.border}`,
                        borderRadius: "4px 14px 14px 14px",
                        padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: C.textSub,
                      }}>
                        {renderText(m.text)}
                      </div>
                      {m.sources.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>Nguồn:</span>
                          {m.sources.map(s => <SourceChip key={`${s.fileName}-${s.page}`} source={s} />)}
                        </div>
                      )}
                      {m.ragas && (
                        <div style={{
                          display: "flex", gap: 14, marginTop: 8, padding: "7px 12px",
                          background: `${C.accent}08`, border: `1px solid ${C.border}`,
                          borderRadius: 8,
                        }}>
                          {[
                            { label: "Faithfulness", val: m.ragas.faithfulness, color: C.green  },
                            { label: "Relevance",    val: m.ragas.relevance,    color: C.accent },
                          ].map(r => (
                            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: r.color }} />
                              <span style={{ color: C.textMuted }}>{r.label}:</span>
                              <span style={{ color: r.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                                {r.val.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto" }}>RAGAS</span>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                        {m.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {typing && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* ── INPUT AREA ── */}
          {meta.allowQuestions ? (
            <div style={{
              position: "sticky", bottom: 0, background: C.bg,
              paddingBottom: 24, paddingTop: 12,
              borderTop: `1px solid ${C.border}`,
            }}>
              {/* Suggested questions (only shown when few messages) */}
              {messages.filter(m => m.role === "user").length < 2 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 7 }}>Gợi ý câu hỏi:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SUGGESTED_QS.map(q => (
                      <button key={q} onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                        style={{
                          background: C.surfaceHigh, border: `1px solid ${C.border}`,
                          borderRadius: 20, padding: "6px 14px", fontSize: 12, color: C.textSub,
                          cursor: "pointer", transition: "all .15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.text; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input row */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); } }}
                  placeholder="Đặt câu hỏi về tài liệu trong workspace... (Enter để gửi)"
                  rows={1}
                  style={{
                    flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: "12px 16px", fontSize: 14, color: C.text,
                    resize: "none", outline: "none", lineHeight: 1.5,
                    minHeight: 48, maxHeight: 120, transition: "border-color .15s",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
                />
                <button
                  onClick={sendQuestion}
                  disabled={!input.trim() || typing}
                  style={{
                    width: 44, height: 44, borderRadius: 11, border: "none",
                    background: !input.trim() || typing ? C.surfaceHigh : C.accent,
                    cursor: !input.trim() || typing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s", flexShrink: 0,
                  }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={!input.trim() || typing ? C.textMuted : "white"}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, textAlign: "center" }}>
                Câu hỏi của bạn sẽ được xử lý bởi hệ thống RAG trên tài liệu của workspace này · Không cần đăng nhập
              </div>
            </div>
          ) : (
            /* Questions disabled */
            <div style={{
              padding: "16px 20px", background: C.surfaceHigh,
              border: `1px solid ${C.border}`, borderRadius: 12,
              textAlign: "center", marginBottom: 24,
            }}>
              <div style={{ fontSize: 14, color: C.textSub, marginBottom: 10 }}>
                🔒 Workspace này không cho phép đặt câu hỏi mới
              </div>
              <Btn variant="primary" style={{ fontSize: 13 }}
                onClick={() => window.open("https://docrag.app/register", "_blank")}>
                Tạo workspace của bạn để hỏi đáp →
              </Btn>
            </div>
          )}

          {/* Footer CTA */}
          <div style={{
            textAlign: "center", padding: "16px 0 32px",
            borderTop: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
              Powered by{" "}
              <span style={{ color: C.accent, fontWeight: 600 }}>DocRAG</span>
              {" "}· Advanced RAG + Reranker · Hỏi đáp tài liệu thông minh
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <Btn variant="primary" style={{ fontSize: 13 }}
                onClick={() => window.open("https://docrag.app/register", "_blank")}>
                Đăng ký miễn phí
              </Btn>
              <Btn variant="ghost" style={{ fontSize: 13 }}>
                Tìm hiểu thêm
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
