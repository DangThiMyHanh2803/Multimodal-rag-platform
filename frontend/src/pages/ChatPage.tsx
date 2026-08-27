import { useEffect, useState } from "react";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatMessages from "../components/chat/ChatMessages";
import ChatInput from "../components/chat/ChatInput";
import type { Conversation, DocFile } from "../types/chat";
import { useChat } from "../hooks/useChat";
import { uploadFile, listWorkspaceFiles } from "../services/fileService";
import "../styles/chat.css";

interface ChatPageProps { workspaceId?: string; onNavigateLogin?: () => void; onNavigateDashboard?: () => void; }

const QUICK_SUGGESTIONS = ["Tóm tắt nội dung chính của tài liệu", "So sánh các khái niệm trong tài liệu", "Liệt kê các ý chính", "Giải thích thuật ngữ quan trọng", "Tìm thông tin liên quan đến câu hỏi"];

function getFileType(fileName: string): DocFile["type"] {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "doc" || extension === "docx") return "docx";
  if (extension === "ppt" || extension === "pptx") return "pptx";
  if (["mp3", "wav", "m4a"].includes(extension ?? "")) return "audio";
  if (["jpg", "jpeg", "png"].includes(extension ?? "")) return "image";
  return "pdf";
}

function formatSize(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

export default function ChatPage({ workspaceId, onNavigateLogin, onNavigateDashboard }: ChatPageProps) {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const { messages, typing, conversationId, sendMessage, newConversation } = useChat({ workspaceId, files, setFiles });
  const selectedCount = files.filter((file) => file.selected && file.status === "ready").length;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || typing) return;
    try { await sendMessage(text); setInput(""); } catch (error) { console.error("Chat error:", error); }
  };
  useEffect(() => {
    if (!workspaceId) {
      setFiles([]);
      return;
    }

    const loadFiles = async () => {
      try {
        const result = await listWorkspaceFiles(workspaceId);

        const mappedFiles: DocFile[] = result.map((item) => ({
          id: item.id,
          name: item.file_name,
          type: getFileType(item.file_name),
          size: formatSize(item.file_size ?? 0),
          selected: item.status === "ready",
          status: item.status === "ready" ? "ready" : item.status === "error" ? "error" : "indexing",
        }));
  
        setFiles(mappedFiles);
      } catch (error) {
        console.error("Load files error:", error);
      }
    };

    loadFiles();
  }, [workspaceId]);
  const handleFilesSelected = async (selectedFiles: File[]) => {
  for (const file of selectedFiles) {
    const tempId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const tempFile: DocFile = {
      id: tempId,
      name: file.name,
      type: getFileType(file.name),
      size: formatSize(file.size),
      selected: true,
      status: "indexing",
    };

    setFiles((current) => [...current, tempFile]);

    try {
      if (!workspaceId) {
        throw new Error("Không tìm thấy workspace.");
      }
      const result = await uploadFile(file, workspaceId);

      setFiles((current) =>
        current.map((item) =>
          item.id === tempId
            ? {
                ...item,
                id: result.document_id,
                status: "ready",
              }
            : item
        )
      );

      console.log("Upload thành công:", result);
    } catch (error) {
      console.error("Upload thất bại:", error);

      setFiles((current) =>
        current.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: "error",
              }
            : item
        )
      );
    }
  }
};
  const handleNewConversation = () => {
    newConversation();
    const id = `local-conversation-${Date.now()}`;
    setConversations((current) => [{ id, title: "Cuộc trò chuyện mới", updatedAt: new Date(), messageCount: 0 }, ...current]);
  };

  const toggleFile = (fileId: string) => setFiles((current) => current.map((file) => file.id === fileId ? { ...file, selected: !file.selected } : file));
  const selectAllFiles = () => setFiles((current) => current.map((file) => file.status === "ready" ? { ...file, selected: true } : file));

  return (
    <div className="chat-page">
      <ChatSidebar files={files} 
        conversations={conversations} 
        activeConversationId={conversationId} 
        onToggleFile={toggleFile} 
        onSelectAllFiles={selectAllFiles} 
        onFilesSelected={handleFilesSelected} 
        onSelectConversation={() => {}} 
        onNewConversation={handleNewConversation} />
      <main className="chat-main">
        <header className="chat-header">
          <img className="chat-header-logo" src="/logo2.png" alt="logo" />
          <div className="chat-header-title">Trợ lý tài liệu</div>
          <div className="chat-header-separator">·</div>
          <div className="chat-header-info">{selectedCount} tài liệu · {Math.max(0, messages.length - 1)} tin nhắn</div>
          <div className="chat-header-actions">
            <button type="button" className="chat-header-button">
              <img src="/icon/export.png" alt="" />
              <span>Xuất chat</span>
            </button>
            <button type="button" className="chat-header-button teal"
              onClick={handleNewConversation}>+ Chat mới
            </button>
            {onNavigateDashboard && 
              <button type="button" className="chat-header-button" onClick={onNavigateDashboard}>
                <img src="/icon/dashboard.png" alt="" />
                <span>Dashboard</span>
              </button>
            }
            {onNavigateLogin && 
              <button type="button" className="chat-header-button primary" onClick={onNavigateLogin}>
                <span>Đăng nhập</span>
              </button>
            }
          </div>
        </header>
        <ChatMessages messages={messages} isTyping={typing} suggestions={QUICK_SUGGESTIONS} onSuggestion={setInput} />
        {messages.length > 1 && <div className="chat-ragas-bar"><div className="chat-ragas-item">Faithfulness: <span className="chat-ragas-value">--</span></div><div className="chat-ragas-item">Relevance: <span className="chat-ragas-value">--</span></div><div className="chat-ragas-item">Precision: <span className="chat-ragas-value">--</span></div><span className="chat-ragas-note">RAGAS</span></div>}
        <ChatInput value={input} onChange={setInput} onSend={handleSend} onFileSelect={(file) => handleFilesSelected([file])} disabled={typing} isTyping={typing} hasSelectedFiles={selectedCount > 0} />
      </main>
    </div>
  );
}
