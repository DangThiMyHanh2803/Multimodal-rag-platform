export interface BackendWorkspace {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const API_BASE = "http://127.0.0.1:8000/api/workspaces";

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
    throw new Error(message || "Không thể kết nối backend.");
  }

  return data as T;
}

export async function listWorkspaces(): Promise<BackendWorkspace[]> {
  const response = await fetch(`${API_BASE}/`);
  return parseResponse<BackendWorkspace[]>(response);
}

export async function createWorkspace(name: string, description: string): Promise<BackendWorkspace> {
  const response = await fetch(`${API_BASE}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
    }),
  });

  return parseResponse<BackendWorkspace>(response);
}