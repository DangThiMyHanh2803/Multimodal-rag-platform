import type {DashboardData,} from "../types/dashboard";
const API_BASE_URL = "http://localhost:8000";

export async function getDashboardData(workspaceId?: string): Promise<DashboardData> {
  const params = new URLSearchParams();

  if (workspaceId) {
    params.append("workspace_id", workspaceId);
  }
  const url =`${API_BASE_URL}/api/dashboard` + (params.toString() ? `?${params.toString()}` : "");
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error( error || "Không thể lấy dữ liệu Dashboard");
  }

  return response.json();
}