export type UserRole = "admin" | "owner" | "visitor";
export type OwnerPlan = string;

export interface User {
  id: string;
  google_id?: string;    // Hỗ trợ đăng nhập Google
  username: string;
  email: string;
  full_name?: string;     // Hiển thị trên Header và Profile
  avatar_url?: string;
  role: UserRole;
  owner_plan?: OwnerPlan;
  
  // Các trường tài chính & tương tác
  balance: number | string; // Decimal từ Postgres thường là string, cần parseFloat
  points: number;           // Điểm tích lũy khi đi Tour
  
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

// DTO dùng cho việc hiển thị danh sách rút gọn (ví dụ: Danh sách Admin, Chủ quán)
export interface UserSummaryDTO {
  id: string;
  username: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
}

// DTO dùng cho việc cập nhật hồ sơ
export interface UpdateProfileDTO {
  full_name?: string;
  avatar_url?: string;
  // Không cho phép cập nhật email/role tại đây để bảo mật
}