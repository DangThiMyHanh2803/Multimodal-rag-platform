import {useCallback, useEffect, useState} from "react";
import {getDashboardData} from "../services/dashboardService";
import type {DashboardData} from "../types/dashboard";

interface UseDashboardProps {
  workspaceId?: string;
}

export function useDashboard({workspaceId,}: UseDashboardProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadDashboard = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDashboardData(workspaceId);
        setData(result);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError( err instanceof Error ? err.message : "Không thể tải Dashboard");
      } finally {
        setLoading(false);
      }
    }, [workspaceId]);

  useEffect(() => {loadDashboard();}, [loadDashboard]);
  return {data, loading, error, reload: loadDashboard,};
}