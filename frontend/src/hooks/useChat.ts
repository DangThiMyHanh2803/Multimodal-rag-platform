import {useCallback, useState,} from "react";
import {sendChatMessage,} from "../services/chatService";
import type {ChatQueryResponse,} from "../services/chatService";
import type {DocFile, Message, Source,} from "../types/chat";

interface UseChatProps {
  workspaceId?: string;
  files: DocFile[];
  setFiles: React.Dispatch<React.SetStateAction<DocFile[]>>;
}

export function useChat({workspaceId, files,}: UseChatProps) {
  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "welcome",
        role: "ai",
        text: "Xin chào! Tôi ở đây để giúp bạn trả lời câu hỏi dựa trên tài liệu đã chọn. Hãy nhập câu hỏi của bạn ở ô bên dưới.",
        sources: [],
        timestamp: new Date(),
      },
    ]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  
  const sendMessage = useCallback(
    async (question: string) => {
      const text = question.trim();

      if (!text || typing) {
        return;
      }

      const selectedFiles =
        files.filter(file => file.selected && file.status === "ready");

      if (selectedFiles.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một tài liệu.");
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        text,
        sources: [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setTyping(true);

      try {
        console.log("CHAT WORKSPACE ID:", workspaceId);
        if (!workspaceId) {
          throw new Error("Không tìm thấy workspace.");
        }
        console.log("CHAT REQUEST:", {
          question: text,
          document_ids: selectedFiles.map(file => file.id),
          workspace_id: workspaceId,
          conversation_id: conversationId,
        });
        const result: ChatQueryResponse = await sendChatMessage({
            question: text,
            document_ids:selectedFiles.map(file => file.id),
            workspace_id: workspaceId,
            conversation_id:conversationId
          });

        const sources: Source[] =
          result.sources.map(source => {
            const file =
              files.find(f =>f.id ===source.document_id);

            return {
              fileId:source.document_id,
              fileName:file?.name ?? "Tài liệu",
              page:source.page_number ?? undefined,
              chunk:source.chunk_id,
              chunkId:source.chunk_id,
              content:source.content,
            };
          });

        const assistantMessage: Message = {
          id: result.message_id,
          role: "ai",
          text: result.answer,
          sources,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage ]);
        setConversationId(result.conversation_id );

        return result;
      } finally {
        setTyping(false);
      }
    },
    [files, workspaceId, conversationId, typing,]
  );

  const newConversation =
    useCallback(() => {
      setConversationId(null);

      setMessages([
        {
          id: "welcome",
          role: "ai",
          text:"Xin chào! Tôi ở đây để giúp bạn trả lời câu hỏi dựa trên tài liệu đã chọn. Hãy nhập câu hỏi của bạn ở ô bên dưới.",
          sources: [],
          timestamp: new Date(),
        },
      ]);
    }, []);

  return {messages, typing, conversationId, sendMessage, newConversation,};
}