// src/types/user.ts

export type UserRole = "admin" | "owner" | "visitor";

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  role: UserRole;

  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface UserSummaryDTO {
  id: string;
  username: string;
  role: UserRole;
}
