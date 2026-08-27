import { useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  isTyping?: boolean;
  hasSelectedFiles?: boolean;
}

const SHORTCUTS = ["Tóm tắt tài liệu này", "So sánh các phương pháp", "Giải thích thuật ngữ"];

export default function ChatInput({ value, onChange, onSend, onFileSelect, disabled = false, isTyping = false, hasSelectedFiles = true }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { const textarea = textareaRef.current; if (!textarea) return; textarea.style.height = "auto"; textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`; }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (value.trim() && !disabled && hasSelectedFiles) onSend(); }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
    event.target.value = "";
  };

  return (
    <div className="chat-input-container">
      {!hasSelectedFiles && <div className="chat-input-warning">⚠️ Chưa chọn tài liệu nào — hãy thêm hoặc chọn ít nhất 1 tài liệu trong panel bên trái</div>}
      <div className="chat-input-wrapper">
        {onFileSelect && <label className="chat-file-button" title="Thêm tài liệu">+<input type="file" hidden accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} disabled={disabled} /></label>}
        <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} placeholder="Đặt câu hỏi về tài liệu... (Enter để gửi, Shift+Enter xuống dòng)" disabled={disabled} rows={1} />
        <button type="button" className="chat-send-button" onClick={onSend} disabled={disabled || isTyping || !value.trim() || !hasSelectedFiles} aria-label="Gửi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></button>
      </div>
      <div className="chat-input-shortcuts">{SHORTCUTS.map((shortcut) => <button key={shortcut} type="button" onClick={() => onChange(shortcut)}><img src="/icon/light.png" alt="" />{shortcut}</button>)}</div>
    </div>
  );
}
