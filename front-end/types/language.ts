export interface Language {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  locale: string; // Thêm dòng này nếu API thực tế có trả về hoặc UI cần dùng
  created_at?: string;
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