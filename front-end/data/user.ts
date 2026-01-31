// src/data/users.ts
import type { UserDTO, UserSummaryDTO } from "@/types/user";

export const users: UserDTO[] = [
  {
    id: "7b3b2c3a-3b91-4e7d-8e4a-111111111111",
    username: "admin01",
    email: "admin01@example.com",
    role: "admin",
    created_at: "2026-01-01T08:00:00.000Z",
    updated_at: "2026-01-20T08:00:00.000Z",
  },
  {
    id: "7b3b2c3a-3b91-4e7d-8e4a-222222222222",
    username: "owner01",
    email: "owner01@example.com",
    role: "owner",
    created_at: "2026-01-02T08:00:00.000Z",
    updated_at: "2026-01-18T08:00:00.000Z",
  },
  {
    id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    username: "visitor01",
    email: "visitor01@example.com",
    role: "visitor",
    created_at: "2026-01-05T08:00:00.000Z",
    updated_at: "2026-01-05T08:00:00.000Z",
  },
];

export const userSummaries: UserSummaryDTO[] = users.map((u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
}));
