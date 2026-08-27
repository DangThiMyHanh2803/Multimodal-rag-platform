export interface DashboardStats {
  files: number;
  questions: number;
  chunks: number;
  workspaces: number;
}

export interface RagasPoint {
  date: string;
  faithfulness: number;
  relevance: number;
  precision: number;
  recall: number;
}

export interface RagasMetrics {
  faithfulness: number;
  relevance: number;
  precision: number;
  recall: number;
}

export interface TopFile {
  name: string;
  type: string;
  questions: number;
  avgScore: number;
  icon: string;
}

export interface WorkspaceStat {
  id?: string;
  name: string;
  icon: string;
  bg: string;
  files: number;
  questions: number;
  lastActive: string | Date;
}

export type ActivityType =
  | "upload"
  | "chat"
  | "workspace"
  | "share"
  | "export";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  sub?: string;
  time: string | Date;
  color?: string;
  icon: string;
}

export interface StorageStats {
  used: number;
  total: number;
  pdfDocx: number;
  audio: number;
  image: number;
  other: number;
}

export interface DashboardData {
  stats: DashboardStats;
  ragasHistory: RagasPoint[];
  topFiles: TopFile[];
  workspaces: WorkspaceStat[];
  activities: ActivityItem[];
  storage: StorageStats;
}