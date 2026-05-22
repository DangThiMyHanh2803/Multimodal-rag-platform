import React, { useState, useRef } from "react";
import { C } from "../styles/theme";
import { Btn, Badge } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
type FileStatus = "ready" | "uploading" | "indexing" | "error";
type FileType   = "pdf" | "docx" | "pptx" | "audio" | "image" | "txt";
type SortKey    = "name" | "size" | "date" | "status";

interface DocFile {
  id: string;
  name: string;
  type: FileType;
  size: number;      // bytes
  pages?: number;
  chunkCount?: number;
  status: FileStatus;
  progress?: number; // 0-100 for uploading/indexing
  uploadedAt: Date;
  workspaceId?: string;
  workspaceName?: string;
  error?: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_FILES: DocFile[] = [
  { id: "f1",  name: "Giao_trinh_moi_truong.pdf",      type: "pdf",   size: 4404019,  pages: 312, chunkCount: 624, status: "ready",    uploadedAt: new Date("2025-05-10"), workspaceId: "ws1", workspaceName: "Đề tài môi trường" },
  { id: "f2",  name: "Bai_giang_BOD_COD.pdf",          type: "pdf",   size: 1887437,  pages: 48,  chunkCount: 96,  status: "ready",    uploadedAt: new Date("2025-05-11"), workspaceId: "ws1", workspaceName: "Đề tài môi trường" },
  { id: "f3",  name: "QCVN_40_2011_BTNMT.pdf",         type: "pdf",   size: 943718,   pages: 22,  chunkCount: 44,  status: "ready",    uploadedAt: new Date("2025-05-12"), workspaceId: "ws1", workspaceName: "Đề tài môi trường" },
  { id: "f4",  name: "Ghi_am_bai_hoc_tuan3.mp3",       type: "audio", size: 18874368,              chunkCount: 142, status: "ready",    uploadedAt: new Date("2025-05-13"), workspaceId: "ws1", workspaceName: "Đề tài môi trường" },
  { id: "f5",  name: "So_do_xu_ly_nuoc_thai.jpg",      type: "image", size: 1153434,              chunkCount: 8,   status: "ready",    uploadedAt: new Date("2025-05-14"), workspaceId: "ws1", workspaceName: "Đề tài môi trường" },
  { id: "f6",  name: "Bao_cao_thi_nghiem_tuan2.docx",  type: "docx",  size: 2411725,  pages: 28,  chunkCount: 56,  status: "indexing", uploadedAt: new Date(),            workspaceId: "ws1", workspaceName: "Đề tài môi trường", progress: 62 },
  { id: "f7",  name: "RAG_Survey_2024.pdf",             type: "pdf",   size: 3145728,  pages: 45,  chunkCount: 90,  status: "ready",    uploadedAt: new Date("2025-05-15"), workspaceId: "ws2", workspaceName: "Tiểu luận RAG" },
  { id: "f8",  name: "VN-MTEB_preprint.pdf",            type: "pdf",   size: 1572864,  pages: 18,  chunkCount: 36,  status: "ready",    uploadedAt: new Date("2025-05-16"), workspaceId: "ws2", workspaceName: "Tiểu luận RAG" },
  { id: "f9",  name: "Slide_thuyet_trinh.pptx",         type: "pptx",  size: 5242880,              chunkCount: 32,  status: "error",    uploadedAt: new Date("2025-05-17"), error: "Không thể đọc file — định dạng bị hỏng" },
  { id: "f10", name: "Note_lab_hoa_nuoc.txt",           type: "txt",   size: 45056,    pages: 4,   chunkCount: 12,  status: "ready",    uploadedAt: new Date("2025-05-18") },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024)       return `${b} B`;
  if (b < 1048576)    return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function formatDate(d: Date) {
  const diff = Date.now() - d.getTime();
  if (diff < 60000)    return "Vừa xong";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

function getTypeInfo(type: FileType): { icon: string; bg: string; label: string } {
  const map: Record<FileType, { icon: string; bg: string; label: string }> = {
    pdf:   { icon: "/icon/icon-pdf.svg",   bg: "rgba(248,113,113,.15)", label: "PDF"   },
    docx:  { icon: "/icon/icon-docx.svg",  bg: "rgba(79,124,255,.15)",  label: "Word"  },
    pptx:  { icon: "/icon/icon-pptx.svg",  bg: "rgba(167,139,250,.15)", label: "PPT"   },
    audio: { icon: "/icon/icon-audio.svg", bg: "rgba(245,158,11,.15)",  label: "Audio" },
    image: { icon: "/icon/icon-image.svg", bg: "rgba(45,212,191,.15)",  label: "Image" },
    txt:   { icon: "/icon/icon-txt.svg",   bg: "rgba(74,222,128,.15)",  label: "Text"  },
  };
  return map[type];
}

function StatusBadge({ status, progress }: { status: FileStatus; progress?: number }) {
  if (status === "ready")    return <Badge color={C.green}>✓ Sẵn sàng</Badge>;
  if (status === "error")    return <Badge color={C.coral}>✕ Lỗi</Badge>;
  if (status === "uploading") return <Badge color={C.amber}>⬆ Upload {progress}%</Badge>;
  return <Badge color={C.amber}>⏳ Indexing {progress}%</Badge>;
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
function DropZone({
  accept, icon, label, hint, onDrop,
}: {
  accept: string; icon: React.ReactNode; label: string; hint: string;
  onDrop?: (files: FileList) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop?.(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${over ? C.accent : C.border}`,
        borderRadius: 14, padding: "28px 16px", textAlign: "center",
        cursor: "pointer", transition: "all .2s",
        background: over ? C.accentGlow : "transparent",
      }}
    >
      <input ref={inputRef} type="file" accept={accept} multiple hidden
        onChange={e => e.target.files && onDrop?.(e.target.files)} />
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: over ? C.accent : C.textSub }}>{label}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

// ─── Indexing Progress Bar ────────────────────────────────────────────────────
function IndexingBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
        <span style={{ color: C.textSub }}>{label}</span>
        <span style={{ color: C.amber, fontFamily: "'JetBrains Mono', monospace" }}>{progress}%</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`,
          width: `${progress}%`, transition: "width .5s ease",
        }} />
      </div>
    </div>
  );
}

// ─── File Detail Modal ────────────────────────────────────────────────────────
function FileDetailModal({ file, onClose, onDelete }: {
  file: DocFile; onClose: () => void; onDelete: (id: string) => void;
}) {
  const ti = getTypeInfo(file.type);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.65)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "28px", width: 460,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 22 }}>
          <div style={{
            flexShrink: 0,
          }}><img src={ti.icon} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, wordBreak: "break-all" }}>{file.name}</div>
            <div style={{ marginTop: 5 }}><StatusBadge status={file.status} progress={file.progress} /></div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</button>
        </div>

        {/* Error */}
        {file.error && (
          <div style={{
            background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.2)`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.coral,
          }}>⚠️ {file.error}</div>
        )}

        {/* Metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Loại file", val: ti.label },
            { label: "Kích thước", val: formatBytes(file.size) },
            { label: "Upload",    val: formatDate(file.uploadedAt) },
            ...(file.pages     ? [{ label: "Số trang",  val: `${file.pages} trang` }] : []),
            ...(file.chunkCount? [{ label: "Chunks",    val: `${file.chunkCount} chunks` }] : []),
            ...(file.workspaceName ? [{ label: "Workspace", val: file.workspaceName }] : [{ label: "Workspace", val: "— Chưa gán" }]),
          ].map(({ label, val }) => (
            <div key={label} style={{ background: C.surfaceHigh, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Indexing progress */}
        {(file.status === "indexing" || file.status === "uploading") && file.progress !== undefined && (
          <div style={{ marginBottom: 20 }}>
            <IndexingBar progress={file.progress} label={file.status === "uploading" ? "Đang tải lên..." : "Đang embed vào Vector DB..."} />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {file.status === "error" && (
            <Btn variant="teal" style={{ fontSize: 13 }}>🔄 Thử lại</Btn>
          )}
          {file.status === "ready" && (
            <Btn variant="ghost" style={{ fontSize: 13 }}>⬇ Tải xuống</Btn>
          )}
          <Btn variant="danger" style={{ fontSize: 13 }} onClick={() => { onDelete(file.id); onClose(); }}>
            🗑️ Xóa
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ file, selected, onSelect, onClick }: {
  file: DocFile; selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const ti = getTypeInfo(file.type);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "11px 16px", borderRadius: 10, cursor: "pointer",
        background: hover || selected ? C.surfaceHigh : "transparent",
        transition: "background .12s",
      }}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div onClick={e => { e.stopPropagation(); onSelect(file.id, !selected); }}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${selected ? C.accent : C.border}`,
          background: selected ? C.accent : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "white", transition: "all .15s", cursor: "pointer",
        }}>{selected ? "✓" : ""}</div>

      {/* Icon */}
      <div style={{
        flexShrink: 0,
      }}><img src={ti.icon} alt="" style={{ width: 38, height: 38, objectFit: "contain" }} /></div>

      {/* Name + workspace */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
          {file.workspaceName ?? "Chưa gán workspace"}
        </div>
      </div>

      {/* Indexing inline bar */}
      {(file.status === "indexing" || file.status === "uploading") && file.progress !== undefined && (
        <div style={{ width: 100, flexShrink: 0 }}>
          <IndexingBar progress={file.progress} label="" />
        </div>
      )}

      {/* Meta */}
      <div style={{ fontSize: 12, color: C.textMuted, width: 70, textAlign: "right", flexShrink: 0 }}>
        {formatBytes(file.size)}
      </div>
      {file.pages ? (
        <div style={{ fontSize: 12, color: C.textMuted, width: 60, textAlign: "right", flexShrink: 0 }}>
          {file.pages}tr
        </div>
      ) : <div style={{ width: 60 }} />}
      <div style={{ fontSize: 12, color: C.textMuted, width: 90, textAlign: "right", flexShrink: 0 }}>
        {formatDate(file.uploadedAt)}
      </div>
      <div style={{ width: 110, flexShrink: 0, textAlign: "right" }}>
        <StatusBadge status={file.status} progress={file.progress} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FilesPage() {
  const [files, setFiles]           = useState<DocFile[]>(SEED_FILES);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<FileType | "all">("all");
  const [sortKey, setSortKey]       = useState<SortKey>("date");
  const [sortAsc, setSortAsc]       = useState(false);
  const [detailFile, setDetailFile] = useState<DocFile | null>(null);
  const [activeTab, setActiveTab]   = useState<"list" | "upload">("list");

  // ─── Filtering + sorting
  const visible = files
    .filter(f => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                          (f.workspaceName ?? "").toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || f.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")   cmp = a.name.localeCompare(b.name);
      if (sortKey === "size")   cmp = a.size - b.size;
      if (sortKey === "date")   cmp = a.uploadedAt.getTime() - b.uploadedAt.getTime();
      if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map(f => f.id)));
  };

  const deleteFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const deleteSelected = () => {
    setFiles(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
  };

  // Simulate adding files from drop zone
  const handleDrop = (fileList: FileList) => {
    const newFiles: DocFile[] = Array.from(fileList).map(f => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const typeMap: Record<string, FileType> = {
        pdf: "pdf", docx: "docx", doc: "docx", pptx: "pptx",
        mp3: "audio", m4a: "audio", wav: "audio",
        jpg: "image", jpeg: "image", png: "image", webp: "image",
        txt: "txt",
      };
      return {
        id: `f${Date.now()}_${Math.random()}`,
        name: f.name,
        type: typeMap[ext] ?? "txt",
        size: f.size,
        status: "uploading" as FileStatus,
        progress: 0,
        uploadedAt: new Date(),
      };
    });
    setFiles(prev => [...newFiles, ...prev]);

    // Simulate upload → indexing
    newFiles.forEach(nf => {
      let prog = 0;
      const iv = setInterval(() => {
        prog += Math.floor(Math.random() * 15) + 5;
        if (prog >= 100) {
          clearInterval(iv);
          setFiles(prev => prev.map(f => f.id === nf.id ? { ...f, status: "indexing", progress: 0 } : f));
          let iprog = 0;
          const iv2 = setInterval(() => {
            iprog += Math.floor(Math.random() * 10) + 3;
            if (iprog >= 100) {
              clearInterval(iv2);
              setFiles(prev => prev.map(f => f.id === nf.id
                ? { ...f, status: "ready", progress: undefined, chunkCount: Math.floor(nf.size / 3000) }
                : f));
            } else {
              setFiles(prev => prev.map(f => f.id === nf.id ? { ...f, progress: Math.min(iprog, 99) } : f));
            }
          }, 300);
        } else {
          setFiles(prev => prev.map(f => f.id === nf.id ? { ...f, progress: Math.min(prog, 99) } : f));
        }
      }, 200);
    });
    setActiveTab("list");
  };

  // Stats
  const stats = {
    total:    files.length,
    ready:    files.filter(f => f.status === "ready").length,
    indexing: files.filter(f => f.status === "indexing" || f.status === "uploading").length,
    error:    files.filter(f => f.status === "error").length,
    totalSize: files.reduce((a, f) => a + f.size, 0),
    chunks:   files.reduce((a, f) => a + (f.chunkCount ?? 0), 0),
  };

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} style={{
      background: "none", border: "none", cursor: "pointer",
      fontSize: 11, color: sortKey === k ? C.accent : C.textMuted, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 3,
    }}>
      {children} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Kho tài liệu</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            Quản lý tất cả file đã upload — PDF, Word, ảnh, ghi âm
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selected.size > 0 && (
            <Btn variant="danger" style={{ fontSize: 13 }} onClick={deleteSelected}>
              🗑️ Xóa {selected.size} file
            </Btn>
          )}
          <Btn variant="primary" style={{ fontSize: 13 }} onClick={() => setActiveTab("upload")}>
            ⬆ Upload file
          </Btn>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Tổng file",   val: stats.total,    color: C.accent  },
          { label: "Sẵn sàng",   val: stats.ready,    color: C.green   },
          { label: "Đang xử lý", val: stats.indexing, color: C.amber   },
          { label: "Lỗi",        val: stats.error,    color: C.coral   },
          { label: "Tổng dung lượng", val: formatBytes(stats.totalSize), color: C.teal },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        <button onClick={() => setActiveTab("list")} style={{
          padding: "10px 18px", fontSize: 13, fontWeight: 500,
          border: "none", background: "none", cursor: "pointer",
          color: activeTab === "list" ? C.accent : C.textSub,
          borderBottom: `2px solid ${activeTab === "list" ? C.accent : "transparent"}`,
          transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
        }}>
          <img src="/icon/Catalogue.png" alt="" style={{ width: 28, height: 28, objectFit: "contain", opacity: activeTab === "list" ? 1 : 0.7 }} />
          Danh sách
        </button>
        <button onClick={() => setActiveTab("upload")} style={{
          padding: "10px 18px", fontSize: 13, fontWeight: 500,
          border: "none", background: "none", cursor: "pointer",
          color: activeTab === "upload" ? C.accent : C.textSub,
          borderBottom: `2px solid ${activeTab === "upload" ? C.accent : "transparent"}`,
          transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
        }}>
          <img src="/icon/up.png" alt="" style={{ width: 28, height: 28, objectFit: "contain", opacity: activeTab === "upload" ? 1 : 0.7 }} />
          Upload mới
        </button>
      </div>

      {/* ── UPLOAD TAB ── */}
      {activeTab === "upload" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <DropZone
              accept=".pdf,.docx,.doc,.pptx,.txt"
              icon={<img src="/icon/txt.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
              label="Văn bản"
              hint="PDF · DOCX · PPTX · TXT · tối đa 50MB"
              onDrop={handleDrop}
            />
            <DropZone
              accept=".mp3,.m4a,.wav,.ogg"
              icon={<img src="/icon/mic.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
              label="Ghi âm bài giảng"
              hint="MP3 · M4A · WAV → Whisper transcript"
              onDrop={handleDrop}
            />
            <DropZone
              accept=".jpg,.jpeg,.png,.webp"
              icon={<img src="/icon/cam.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />}
              label="Ảnh chụp tài liệu"
              hint="JPG · PNG · WEBP → OCR / Vision API"
              onDrop={handleDrop}
            />
          </div>

          {/* Pipeline diagram */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "20px 24px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Pipeline xử lý tự động
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {[
                { icon: <img src="/icon/up.png"             alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />, label: "Upload",     color: C.accent },
                { icon: <img src="/icon/magnifyingGlass.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />, label: "Trích xuất", color: C.teal   },
                { icon: <img src="/icon/drag.png"      alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />, label: "Chunking",  color: C.amber  },
                { icon: <img src="/icon/embedding.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />, label: "Embedding", color: C.purple },
                { icon: <img src="/icon/vectorDB.png"  alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />, label: "Vector DB", color: C.green  },
              ].map((step, i, arr) => (
                <>
                  <div key={step.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    flex: 1,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `${step.color}18`, border: `1.5px solid ${step.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{step.icon}</div>
                    <span style={{ fontSize: 11, color: C.textSub, fontWeight: 500 }}>{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div key={`arrow-${i}`} style={{ color: C.textMuted, fontSize: 16, flexShrink: 0, marginBottom: 18 }}>→</div>
                  )}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST TAB ── */}
      {activeTab === "list" && (
        <>
          {/* Search + type filter */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
              <img src="/icon/magnifyingGlass.png" alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, objectFit: "contain", opacity: 0.5 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm file..."
                style={{
                  width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: "9px 12px 9px 36px", fontSize: 13, color: C.text, outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all","pdf","docx","pptx","audio","image","txt"] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                  border: `1px solid ${typeFilter === t ? C.accent : C.border}`,
                  background: typeFilter === t ? C.accentDim : "transparent",
                  color: typeFilter === t ? C.accent : C.textMuted, cursor: "pointer",
                  transition: "all .15s",
                }}>
                  {t === "all" ? "Tất cả" : t.toUpperCase()}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>
              {visible.length}/{files.length} file
            </span>
          </div>

          {/* Table header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "8px 16px", borderBottom: `1px solid ${C.border}`,
          }}>
            <div onClick={toggleAll} style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${selected.size > 0 ? C.accent : C.border}`,
              background: selected.size === visible.length && visible.length > 0 ? C.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "white", cursor: "pointer", transition: "all .15s",
            }}>{selected.size > 0 && selected.size < visible.length ? "–" : selected.size === visible.length && visible.length > 0 ? "✓" : ""}</div>

            <div style={{ width: 34, flexShrink: 0 }} />
            <div style={{ flex: 1 }}><SortBtn k="name">Tên file</SortBtn></div>
            <div style={{ width: 70, textAlign: "right" }}><SortBtn k="size">Kích thước</SortBtn></div>
            <div style={{ width: 60, textAlign: "right" }}>Trang</div>
            <div style={{ width: 90, textAlign: "right" }}><SortBtn k="date">Upload</SortBtn></div>
            <div style={{ width: 110, textAlign: "right" }}><SortBtn k="status">Trạng thái</SortBtn></div>
          </div>

          {/* File rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {visible.map(f => (
              <FileRow
                key={f.id}
                file={f}
                selected={selected.has(f.id)}
                onSelect={toggleSelect}
                onClick={() => setDetailFile(f)}
              />
            ))}
          </div>

          {visible.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0", color: C.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>Không có file nào</div>
              <div style={{ fontSize: 12 }}>Upload file mới hoặc thay đổi bộ lọc</div>
            </div>
          )}

          {/* Bulk info bar */}
          {selected.size > 0 && (
            <div style={{
              position: "sticky", bottom: 0, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 -4px 20px rgba(0,0,0,.3)", marginTop: 16,
            }}>
              <span style={{ fontSize: 13, color: C.textSub }}>
                Đã chọn <strong style={{ color: C.text }}>{selected.size}</strong> file
                ({formatBytes(files.filter(f => selected.has(f.id)).reduce((a, f) => a + f.size, 0))})
              </span>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <Btn variant="ghost" style={{ fontSize: 12 }} onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
                <Btn variant="teal"  style={{ fontSize: 12 }}>📁 Gán workspace</Btn>
                <Btn variant="danger" style={{ fontSize: 12 }} onClick={deleteSelected}>🗑️ Xóa</Btn>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {detailFile && (
        <FileDetailModal
          file={detailFile}
          onClose={() => setDetailFile(null)}
          onDelete={deleteFile}
        />
      )}
    </div>
  );
}
