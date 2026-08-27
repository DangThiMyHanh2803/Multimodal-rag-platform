import { useRef, useState } from "react";
import type { Conversation, DocFile } from "../../types/chat";

interface ChatSidebarProps {
  files: DocFile[];
  conversations: Conversation[];
  activeConversationId: string | null;
  onToggleFile: (fileId: string) => void;
  onSelectAllFiles: () => void;
  onFilesSelected: (files: File[]) => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

const FILE_ICONS: Record<DocFile["type"], string> = {
  pdf: "/icon/icon-pdf.svg",
  docx: "/icon/icon-docx.svg",
  audio: "/icon/icon-audio.svg",
  image: "/icon/icon-image.svg",
  pptx: "/icon/icon-pptx.svg",
};

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
}

export default function ChatSidebar({ files, conversations, activeConversationId, onToggleFile, onSelectAllFiles, onFilesSelected, onSelectConversation, onNewConversation }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<"files" | "history">("files");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readyFiles = files.filter((file) => file.status === "ready");
  const selectedCount = readyFiles.filter((file) => file.selected).length;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 0) onFilesSelected(selectedFiles);
    event.target.value = "";
  };

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-tabs">
        <button type="button" className={`chat-sidebar-tab ${activeTab === "files" ? "active" : ""}`} onClick={() => setActiveTab("files")}><img src="/icon/doc.png" alt="" />Tài liệu</button>
        <button type="button" className={`chat-sidebar-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}><img src="/icon/chat.png" alt="" />Lịch sử</button>
      </div>

      {activeTab === "files" ? (
        <>
          <div className="chat-files-toolbar"><span>{selectedCount}/{readyFiles.length} đang dùng</span><button type="button" onClick={onSelectAllFiles}>Chọn tất cả</button></div>
          <div className="chat-file-list">
            {files.length === 0 && <div className="chat-sidebar-empty">Chưa có tài liệu</div>}
            {files.map((file) => (
              <div key={file.id} className={`chat-file-item ${file.status} ${file.selected && file.status === "ready" ? "selected" : ""}`} onClick={() => file.status === "ready" && onToggleFile(file.id)}>
                <img className="chat-file-type-icon" src={FILE_ICONS[file.type]} alt="" />
                <div className="chat-file-info"><div className="chat-file-name">{file.name}</div><div className="chat-file-meta">{file.status === "indexing" ? "Đang xử lý..." : file.status === "error" ? "Xử lý thất bại" : `${file.size}${file.pages ? ` · ${file.pages}tr` : ""}`}</div></div>
                {file.status === "ready" && <div className="chat-file-check">{file.selected ? "✓" : ""}</div>}
              </div>
            ))}
          </div>
          <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
          <div className="chat-upload-box" onClick={() => fileInputRef.current?.click()}><div className="chat-upload-plus">+</div><div className="chat-upload-title">Thêm tài liệu</div><div className="chat-upload-types">PDF · DOCX · TXT</div></div>
        </>
      ) : (
        <>
          <div className="chat-history-new"><button type="button" className="new-chat-button" onClick={onNewConversation}>+ Cuộc trò chuyện mới</button></div>
          <div className="chat-conversation-list">
            {conversations.length === 0 && <div className="chat-sidebar-empty">Chưa có cuộc trò chuyện</div>}
            {conversations.map((conversation) => (
              <button key={conversation.id} type="button" className={`conversation-item ${activeConversationId === conversation.id ? "active" : ""}`} onClick={() => onSelectConversation(conversation.id)}>
                <span className="conversation-title">{conversation.title || "Cuộc trò chuyện mới"}</span>
                <span className="conversation-meta"><span>{conversation.messageCount} tin nhắn</span><span>{formatRelativeTime(conversation.updatedAt)}</span></span>
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
