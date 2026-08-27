export interface DocFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "audio" | "image" | "pptx";
  size: string;
  pages?: number;
  selected: boolean;
  status: "ready" | "indexing" | "error";
}

export interface Source {
  fileId: string;
  fileName: string;
  page?: number;
  chunk?: string;
  chunkId?: string;
  content?: string;
  score?: number;
}

export interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sources: Source[];
  timestamp: Date;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}