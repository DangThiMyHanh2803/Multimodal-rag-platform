import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "../../types/chat";

interface ChatMessagesProps {
  messages: Message[];
  isTyping?: boolean;
  suggestions?: string[];
  onSuggestion?: (suggestion: string) => void;
}

export default function ChatMessages({ messages, isTyping = false, suggestions = [], onSuggestion }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  return (
    <div className="chat-messages">
      {messages.length === 0 ? <div className="chat-empty-state"><h2>Bạn muốn hỏi gì?</h2><p>Hãy đặt câu hỏi dựa trên các tài liệu đã được chọn.</p></div> : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
      {isTyping && <div className="message-row assistant-message"><img className="message-avatar bot" src="/bot.png" alt="bot" /><div className="message-bubble"><div className="typing-indicator"><span /><span /><span /></div></div></div>}
      {!isTyping && messages.length <= 1 && suggestions.length > 0 && <div className="chat-suggestions"><div className="chat-suggestions-title">Gợi ý câu hỏi:</div><div className="chat-suggestions-list">{suggestions.map((suggestion) => <button key={suggestion} type="button" className="chat-suggestion-button" onClick={() => onSuggestion?.(suggestion)}>{suggestion}</button>)}</div></div>}
      <div ref={bottomRef} />
    </div>
  );
}
