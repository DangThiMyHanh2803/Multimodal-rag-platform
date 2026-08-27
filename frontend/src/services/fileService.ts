export interface BackendFileItem {
  document_id: string;
  workspace_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  chunk_count: number;
  status: string;
}
export interface BackendDocument {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  file_name: string;
  title: string;
  file_type: string;
  file_path: string;
  file_size: number | null;
  status: string;
  page_count: number | null;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}
const API_BASE = "http://127.0.0.1:8000/api/documents";

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Server trả về dữ liệu không hợp lệ.");
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || response.statusText;
    throw new Error(message || "Lỗi kết nối đến server.");
  }

  return data as T;
}

export async function listFiles(): Promise<BackendFileItem[]> {
  const response = await fetch(`${API_BASE}/`);

  return parseResponse<BackendFileItem[]>(response);
}

export async function uploadFile(
  file: File,
  workspaceId: string
): Promise<BackendFileItem> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("workspace_id", workspaceId);

  const response = await fetch(
    `${API_BASE}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  return parseResponse<BackendFileItem>(response);
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
    }
  );

  await parseResponse(response);
}
export async function listWorkspaceFiles(workspaceId: string): Promise<BackendDocument[]> {
  const response = await fetch(`${API_BASE}/workspace/${encodeURIComponent(workspaceId)}`);
  return parseResponse<BackendDocument[]>(response);
}