export interface Language {
  id: string;           // UUID từ Postgres
  code: string;         // 'vi-VN', 'en-US', 'ja-JP'...
  name: string;         // 'Tiếng Việt', 'English'...
  is_active: boolean;    // Trạng thái bật/tắt
  created_at?: string;  // ISO Date string
}

/**
 * Type dùng cho các Dropdown hoặc Select chọn ngôn ngữ trên UI
 */
export type LanguageOption = Pick<Language, 'id' | 'code' | 'name'>;

/**
 * Type dùng cho trang Admin khi muốn cập nhật trạng thái
 */
export interface UpdateLanguageDTO {
  is_active?: boolean;
  name?: string;
  code?: string;
}

/**
 * Cấu trúc Response chuẩn từ Backend cho Language
 */
export interface LanguageResponse {
  success: boolean;
  data: Language | Language[];
  message?: string;
}