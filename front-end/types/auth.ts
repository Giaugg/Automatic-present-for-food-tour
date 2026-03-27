// --- USER & AUTH ---
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'owner' | 'visitor';
  balance: number | string; // Postgres DECIMAL thường về string, cần lưu ý khi dùng
  points: number;
  avatar_url?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  google_id?: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  full_name: string;
}