import SourceChip from "./SourceChip";
import type { Message } from "../../types/chat";

interface MessageBubbleProps { message: Message; }

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = message.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`message-row ${isUser ? "user-message" : "assistant-message"}`}>
      {!isUser && <img className="message-avatar bot" src="/bot.png" alt="bot" />}
      <div className="message-body">
        <div className="message-bubble">{message.text}</div>
        {!isUser && message.sources.length > 0 && <div className="message-sources"><span className="message-sources-label">Nguồn:</span>{message.sources.map((source, index) => <SourceChip key={source.chunkId ?? `${source.fileId}-${source.page}-${index}`} source={source} />)}</div>}
        <div className="message-time">{time}</div>
      </div>
      {isUser && <div className="message-avatar">👤</div>}
    </div>
  );
}
