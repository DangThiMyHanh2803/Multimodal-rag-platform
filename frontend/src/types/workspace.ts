export type Role = "owner" | "editor" | "viewer";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  fileCount: number;
  messageCount: number;
  members: Member[];
  createdAt: Date;
  updatedAt: Date;
  isOwner: boolean;
  sharedLink?: string;
}