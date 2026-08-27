//  import type {Source,} from "../types/chat";

export interface ChatQueryRequest {
  question: string;
  document_ids: string[];
  workspace_id: string;
  conversation_id?: string | null;
}

export interface SourceDocument {
  document_id: string;
  chunk_id: string;
  content: string;
  page_number?: number | null;
}

export interface ChatQueryResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  sources: SourceDocument[];
}

const API_BASE_URL = "http://localhost:8000";

export async function sendChatMessage(
  data: ChatQueryRequest
): Promise<ChatQueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/query`, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      error || "Không thể kết nối backend"
    );
  }

  return response.json();
}