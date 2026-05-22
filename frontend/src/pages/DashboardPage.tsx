import { useState, useEffect, useRef } from "react";
import { C } from "../styles/theme";
import { Btn, Badge } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatCard {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: string;
  trend?: number; // % change
}

interface RagasPoint {
  date: string;        // "MM/DD"
  faithfulness: number;
  relevance: number;
  precision: number;
  recall: number;
}

interface ActivityItem {
  id: string;
  type: "upload" | "chat" | "workspace" | "share" | "export";
  text: string;
  sub?: string;
  time: Date;
  color: string;
  icon: string;
}

interface TopFile {
  name: string;
  type: string;
  questions: number;
  avgScore: number;
  icon: string;
}

interface WorkspaceStat {
  name: string;
  icon: string;
  bg: string;
  files: number;
  questions: number;
  lastActive: Date;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const RAGAS_HISTORY: RagasPoint[] = [
  { date: "05/12", faithfulness: 0.78, relevance: 0.72, precision: 0.74, recall: 0.68 },
  { date: "05/13", faithfulness: 0.81, relevance: 0.76, precision: 0.77, recall: 0.71 },
  { date: "05/14", faithfulness: 0.80, relevance: 0.78, precision: 0.75, recall: 0.73 },
  { date: "05/15", faithfulness: 0.85, relevance: 0.82, precision: 0.80, recall: 0.76 },
  { date: "05/16", faithfulness: 0.83, relevance: 0.80, precision: 0.82, recall: 0.75 },
  { date: "05/17", faithfulness: 0.88, relevance: 0.84, precision: 0.85, recall: 0.79 },
  { date: "05/18", faithfulness: 0.87, relevance: 0.86, precision: 0.83, recall: 0.80 },
  { date: "05/19", faithfulness: 0.90, relevance: 0.87, precision: 0.86, recall: 0.82 },
  { date: "05/20", faithfulness: 0.91, relevance: 0.88, precision: 0.87, recall: 0.83 },
  { date: "05/21", faithfulness: 0.93, relevance: 0.90, precision: 0.89, recall: 0.85 },
];

const ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "upload",    icon: "/icon/up.png",     color: C.accent, time: new Date(Date.now() - 300000),   text: "Upload file thành công",        sub: "Giao_trinh_moi_truong.pdf · 4.2 MB"   },
  { id: "a2", type: "chat",      icon: "/icon/chat.png",   color: C.teal,   time: new Date(Date.now() - 900000),   text: "Câu hỏi được trả lời",          sub: "Faithfulness: 0.94 · 3 nguồn trích dẫn" },
  { id: "a3", type: "workspace", icon: "/icon/fordel.png", color: C.purple, time: new Date(Date.now() - 3600000),  text: "Tạo workspace mới",             sub: "Tiểu luận RAG"                          },
  { id: "a4", type: "upload",    icon: "/icon/up.png",     color: C.accent, time: new Date(Date.now() - 7200000),  text: "Audio transcript hoàn tất",     sub: "Ghi_am_bai_hoc.mp3 → 142 chunks"       },
  { id: "a5", type: "share",     icon: "/icon/link.png",   color: C.amber,  time: new Date(Date.now() - 18000000), text: "Tạo link chia sẻ workspace",    sub: "Giáo trình CNMT K22 · chỉ xem"         },
  { id: "a6", type: "chat",      icon: "/icon/chat.png",   color: C.teal,   time: new Date(Date.now() - 25200000), text: "Phiên hỏi đáp 12 câu hỏi",     sub: "Đề tài môi trường · avg 0.91"          },
  { id: "a7", type: "export",    icon: "/icon/export.png", color: C.green,  time: new Date(Date.now() - 86400000), text: "Xuất tóm tắt PDF",              sub: "Bài giảng BOD/COD"                     },
];

const TOP_FILES: TopFile[] = [
  { name: "Giao_trinh_moi_truong.pdf", type: "pdf",   questions: 47, avgScore: 0.93, icon: "/icon/icon-pdf.svg"   },
  { name: "QCVN_40_2011_BTNMT.pdf",    type: "pdf",   questions: 34, avgScore: 0.91, icon: "/icon/icon-pdf.svg"   },
  { name: "Bai_giang_BOD_COD.pdf",     type: "pdf",   questions: 28, avgScore: 0.89, icon: "/icon/icon-pdf.svg"   },
  { name: "Ghi_am_bai_hoc_tuan3.mp3",  type: "audio", questions: 19, avgScore: 0.86, icon: "/icon/icon-audio.svg" },
  { name: "RAG_Survey_2024.pdf",        type: "pdf",   questions: 15, avgScore: 0.88, icon: "/icon/icon-pdf.svg"   },
];

const WS_STATS: WorkspaceStat[] = [
  { name: "Đề tài môi trường", icon: "/icon/lacay.png",     bg: "rgba(45,212,191,.12)",  files: 12, questions: 87,  lastActive: new Date(Date.now() - 600000)  },
  { name: "Tiểu luận RAG",     icon: "/icon/robot.png",     bg: "rgba(167,139,250,.12)", files: 8,  questions: 34,  lastActive: new Date(Date.now() - 7200000) },
  { name: "Giáo trình CNMT",   icon: "/icon/book.png",      bg: "rgba(245,158,11,.12)",  files: 24, questions: 203, lastActive: new Date(Date.now() - 86400000)},
  { name: "Lab xử lý nước",    icon: "/icon/microscope.png",bg: "rgba(248,113,113,.12)", files: 6,  questions: 19,  lastActive: new Date(Date.now() - 3600000) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relTime(d: Date) {
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return "Vừa xong";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
}

// ─── Mini sparkline SVG chart ─────────────────────────────────────────────────
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const w = 120;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const area = `M0,${height} L${pts.split(" ").map(p => p).join(" L")} L${w},${height} Z`;

  return (
    <svg width={w} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── RAGAS trend line chart ───────────────────────────────────────────────────
function RagasChart({ data }: { data: RagasPoint[] }) {
  const W = 560; const H = 160; const PAD = { t: 16, r: 16, b: 32, l: 44 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const metrics: Array<{ key: keyof Omit<RagasPoint,"date">; color: string; label: string }> = [
    { key: "faithfulness", color: C.green,  label: "Faithfulness" },
    { key: "relevance",    color: C.accent, label: "Relevance"    },
    { key: "precision",    color: C.teal,   label: "Precision"    },
    { key: "recall",       color: C.amber,  label: "Recall"       },
  ];

  const toX = (i: number) => PAD.l + (i / (data.length - 1)) * cw;
  const toY = (v: number) => PAD.t + (1 - (v - 0.6) / 0.4) * ch;

  const yTicks = [0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={toY(v)} x2={W - PAD.r} y2={toY(v)} stroke={C.border} strokeWidth="0.5" />
          <text x={PAD.l - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill={C.textMuted}>{v.toFixed(2)}</text>
        </g>
      ))}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle"
          fontSize="9" fill={C.textMuted}>{d.date}</text>
      ))}
      {/* Lines */}
      {metrics.map(m => {
        const pts = data.map((d, i) => `${toX(i)},${toY(d[m.key])}`).join(" ");
        return (
          <polyline key={m.key} points={pts} fill="none"
            stroke={m.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
      {/* Dots on last point */}
      {metrics.map(m => {
        const last = data[data.length - 1];
        return (
          <circle key={m.key} cx={toX(data.length - 1)} cy={toY(last[m.key])}
            r="3.5" fill={m.color} />
        );
      })}
    </svg>
  );
}

// ─── Donut chart for storage ──────────────────────────────────────────────────
function StorageDonut({ used, total }: { used: number; total: number }) {
  const pct  = used / total;
  const r    = 38;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = pct > 0.8 ? C.coral : pct > 0.6 ? C.amber : C.accent;

  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke={C.border} strokeWidth="10" />
        <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(pct * 100)}%
        </div>
        <div style={{ fontSize: 9, color: C.textMuted }}>dùng</div>
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.9 }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({ onNavigateChat }: { onNavigateChat?: () => void }) {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  // Animated counters
  const [counts, setCounts] = useState({ files: 0, questions: 0, chunks: 0, workspaces: 0 });
  const animRef = useRef(false);

  useEffect(() => {
    if (animRef.current) return;
    animRef.current = true;
    const targets = { files: 47, questions: 343, chunks: 952, workspaces: 4 };
    const steps   = 40;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const pct = step / steps;
      const ease = 1 - Math.pow(1 - pct, 3);
      setCounts({
        files:      Math.round(targets.files      * ease),
        questions:  Math.round(targets.questions  * ease),
        chunks:     Math.round(targets.chunks     * ease),
        workspaces: Math.round(targets.workspaces * ease),
      });
      if (step >= steps) clearInterval(iv);
    }, 20);
    return () => clearInterval(iv);
  }, []);

  const statCards: StatCard[] = [
    { label: "Tài liệu",    value: counts.files,      sub: "+3 tuần này",          color: C.accent, icon: "/icon/doc.png",       trend: +12 },
    { label: "Câu hỏi",     value: counts.questions,  sub: "+28 hôm nay",          color: C.teal,   icon: "/icon/chat.png",      trend: +8  },
    { label: "Chunks",      value: counts.chunks,     sub: "trong Vector DB",       color: C.purple, icon: "/icon/embedding.png", trend: +15 },
    { label: "Workspaces",  value: counts.workspaces, sub: "3 đang hoạt động",      color: C.amber,  icon: "/icon/fordel.png",    trend: 0   },
  ];

  const currentRagas = RAGAS_HISTORY[RAGAS_HISTORY.length - 1];
  const ragasMetrics = [
    { key: "faithfulness" as const, label: "Faithfulness", color: C.green  },
    { key: "relevance"    as const, label: "Relevance",    color: C.accent },
    { key: "precision"    as const, label: "Precision",    color: C.teal   },
    { key: "recall"       as const, label: "Recall",       color: C.amber  },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            Thống kê cá nhân · Thứ Năm, 22 tháng 5 năm 2025
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["7d","30d","all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: `1px solid ${period === p ? C.accent : C.border}`,
              background: period === p ? C.accentDim : "transparent",
              color: period === p ? C.accent : C.textSub, cursor: "pointer", transition: "all .15s",
            }}>{{ "7d": "7 ngày", "30d": "30 ngày", "all": "Tất cả" }[p]}</button>
          ))}
          <Btn variant="ghost" style={{ fontSize: 12, marginLeft: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <img src="/icon/export.png" alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
            Xuất báo cáo
          </Btn>
          <Btn variant="teal" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }} onClick={onNavigateChat}>
            <img src="/icon/chat.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
            Về Chat
          </Btn>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>
                {s.label}
              </div>
              <img src={s.icon} alt="" style={{ width: s.icon.includes("fordel") ? 24 : 40, height: s.icon.includes("fordel") ? 24 : 40, objectFit: "contain" }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1, margin: "8px 0 4px" }}>
              {s.value.toLocaleString()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {s.trend !== undefined && s.trend !== 0 && (
                <span style={{ fontSize: 11, color: s.trend > 0 ? C.green : C.coral, fontWeight: 500 }}>
                  {s.trend > 0 ? "▲" : "▼"} {Math.abs(s.trend)}%
                </span>
              )}
              <span style={{ fontSize: 11, color: C.textMuted }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: RAGAS trend + current scores ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 }}>
        {/* Trend chart */}
        <Section title="Xu hướng RAGAS (10 ngày gần nhất)">
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            {ragasMetrics.map(m => (
              <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSub }}>
                <div style={{ width: 16, height: 2.5, borderRadius: 2, background: m.color }} />
                {m.label}
              </div>
            ))}
          </div>
          <RagasChart data={RAGAS_HISTORY} />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, textAlign: "right" }}>
            Điểm đang cải thiện đều qua từng ngày ↗
          </div>
        </Section>

        {/* Current RAGAS scores */}
        <Section title="Điểm RAGAS hiện tại">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ragasMetrics.map(m => {
              const val = currentRagas[m.key];
              const hist = RAGAS_HISTORY.map(d => d[m.key]);
              return (
                <div key={m.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
                      <span style={{ fontSize: 12, color: C.textSub }}>{m.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkline data={hist} color={m.color} height={28} />
                      <span style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace", width: 36, textAlign: "right" }}>
                        {val.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: m.color, width: `${val * 100}%`, transition: "width 1s ease" }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              Avg:{" "}
              <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {((currentRagas.faithfulness + currentRagas.relevance + currentRagas.precision + currentRagas.recall) / 4).toFixed(2)}
              </span>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Row 3: Top files + Workspace stats ───────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Top files */}
        <Section title="File được hỏi nhiều nhất"
          action={<button style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>Xem tất cả →</button>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TOP_FILES.map((f, i) => (
              <div key={f.name} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 12px", background: C.surfaceHigh, borderRadius: 10,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: C.accentDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
                }}>{i + 1}</div>
                <img src={f.icon} alt="" style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                    {f.questions} câu hỏi
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>
                    {f.avgScore.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>avg score</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Workspace stats */}
        <Section title="Hoạt động theo Workspace">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {WS_STATS.map(ws => {
              const maxQ = Math.max(...WS_STATS.map(w => w.questions));
              return (
                <div key={ws.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, background: ws.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}><img src={ws.icon} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
                          {ws.name}
                        </span>
                        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600, flexShrink: 0 }}>
                          {ws.questions} câu
                        </span>
                      </div>
                      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                        <div style={{
                          height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`,
                          width: `${(ws.questions / maxQ) * 100}%`, transition: "width 1.2s ease",
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Row 4: Activity + Storage ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        {/* Activity feed */}
        <Section title="Hoạt động gần đây"
          action={<Badge color={C.accent}>{ACTIVITY.length} sự kiện</Badge>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ACTIVITY.map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Timeline connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", background: `${a.color}18`,
                    border: `1px solid ${a.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}><img src={a.icon} alt="" style={{ width: a.icon.includes("fordel") ? 16 : 28, height: a.icon.includes("fordel") ? 16 : 28, objectFit: "contain" }} /></div>
                  {i < ACTIVITY.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: C.border, minHeight: 14 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingTop: 5, paddingBottom: i < ACTIVITY.length - 1 ? 6 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{a.text}</span>
                    <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{relTime(a.time)}</span>
                  </div>
                  {a.sub && (
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{a.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Storage + quick stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Storage donut */}
          <Section title="Dung lượng">
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <StorageDonut used={312} total={500} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  312 MB
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>/ 500 MB (Free plan)</div>
                <Btn variant="teal" fullWidth style={{ fontSize: 12, height: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <img src="/icon/up.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
                  Nâng cấp
                </Btn>
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "PDF / DOCX", val: 198, color: C.coral   },
                { label: "Audio",      val: 84,  color: C.amber   },
                { label: "Ảnh",        val: 22,  color: C.teal    },
                { label: "Khác",       val: 8,   color: C.textMuted },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: C.textMuted }}>{s.label}</span>
                  <span style={{ color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{s.val} MB</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Quick actions */}
          <Section title="Thao tác nhanh">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "/icon/up.png",     label: "Upload tài liệu",  color: C.accent },
                { icon: "/icon/chat.png",   label: "Chat mới",         color: C.teal   },
                { icon: "/icon/fordel.png", label: "Tạo workspace",    color: C.purple },
                { icon: "/icon/export.png", label: "Xuất báo cáo PDF", color: C.green  },
              ].map(a => (
                <button key={a.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                  background: C.surfaceHigh, border: `1px solid ${C.border}`,
                  width: "100%", transition: "all .15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = a.color; (e.currentTarget as HTMLButtonElement).style.background = `${a.color}10`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHigh; }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, background: `${a.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}><img src={a.icon} alt="" style={{ width: a.icon.includes("fordel") ? 16 : 28, height: a.icon.includes("fordel") ? 16 : 28, objectFit: "contain" }} /></div>
                  <span style={{ fontSize: 13, color: C.textSub, fontWeight: 500 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
