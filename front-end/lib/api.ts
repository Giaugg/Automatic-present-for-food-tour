import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
// Giả định bạn đã thêm type Language vào file types
import { Language } from '../types/language'; 
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth';
import { User, UpdateProfileDTO } from '../types/user';
import { 
  POIWithTranslation, 
  POIDetail, 
  CreatePOIDTO, 
} from '../types/pois';
import { 
  Tour, 
  CreateTourDTO, 
  UpdateTourScheduleDTO 
} from '../types/tour';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`, // Sử dụng biến môi trường
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * 1. AUTH API
 */
export const authApi = {
  register: (data: RegisterCredentials) => 
    api.post<AuthResponse>('/auth/register', data),
    
  login: (data: LoginCredentials) => 
    api.post<AuthResponse>('/auth/login', data),
    
  getMe: () => 
    api.get<User>('/auth/me'),

  updateProfile: (data: UpdateProfileDTO) =>
    api.put<User>('/auth/profile', data),
};

/**
 * 2. LANGUAGE API (Mới thêm)
 */
export const languageApi = {
  getActive: () => api.get<{ success: boolean; data: Language[] }>('/languages/active'),
  getAdminAll: () => api.get<{ success: boolean; data: Language[] }>('/languages/admin/all'),
  toggleStatus: (id: string, isActive: boolean) => 
    api.patch<{ success: boolean; data: Language }>(`/languages/${id}/status`, { is_active: isActive }),
  update: (id: string, data: Partial<Language>) =>
    api.put<{ success: boolean; data: Language }>(`/languages/${id}`, data),
  // Mới thêm
  syncAudio: (id: string) => 
    api.post<{ success: boolean; data: any }>(`/languages/${id}/sync-audio`),
  syncTranslate: (id: string) =>
    api.post<{ success: boolean; data: any }>(`/languages/${id}/sync-translate`),
};

/**
 * 3. POI API (Điều chỉnh)
 */
export const poiApi = {
  // 1. Lấy danh sách cho User (mặc định tiếng Việt)
  getAll: (lang: string = 'vi-VN') => 
    api.get<POIWithTranslation[]>(`/pois`, { params: { lang } }),

  getMyPOIs: () =>
    api.get<POIWithTranslation[]>('/pois/my-pois'),

  // 2. Lấy chi tiết cho User (1 ngôn ngữ)
  getById: (id: string, lang: string) => 
    api.get<POIWithTranslation>(`/pois/${id}`, { params: { lang } }),

  // 3. Lấy TẤT CẢ bản dịch cho Admin (Cần khớp với route mới thêm ở Backend)
  getDetails: (id: string) => 
    api.get<{ success: boolean; data: { translations: any[] } }>(`/pois/${id}/details`),

  // 4. Các thao tác CRUD
  create: (data: any) => api.post<{ success: boolean; id: string }>('/pois', data),
  update: (id: string, data: any) => api.put<{ success: boolean; message: string }>(`/pois/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/pois/${id}`),
  
  // 5. Thao tác Audio (Đã khớp với router.post('/:id/sync-audio', ...))
  syncMissingAudio: (id: string) => api.post(`/pois/${id}/sync-audio`),
  rebuildAudio: (id: string) => api.post(`/pois/${id}/rebuild-audio`),
};
/**
 * 4. TOUR API
 */
export const tourApi = {
  getAll: (lang: string = 'vi-VN') => 
    api.get<Tour[]>('/tours', { params: { lang } }),
    
  getDetails: (id: string, lang: string = 'vi-VN') => 
    api.get<Tour>(`/tours/${id}`, { params: { lang } }),
    
  create: (data: CreateTourDTO) => 
    api.post<{ id: string; message: string }>('/tours', data),

  update: (id: string, data: Partial<CreateTourDTO>) =>
    api.put<{ message: string }>(`/tours/${id}`, data),

  updateSchedule: (tourId: string, data: UpdateTourScheduleDTO) => 
    api.put<{ message: string }>(`/tours/${tourId}/schedule`, data),
    
  delete: (id: string) => 
    api.delete<{ message: string }>(`/tours/${id}`),
};


export const userApi = {
  // GET /api/admin/users?role=...&search=...
  getAll: (params?: { role?: string; search?: string }) => 
    api.get<User[]>('/admin/users', { params }),

  // GET /api/admin/users/:id
  getById: (id: string) => 
    api.get<User>(`/admin/users/${id}`),

  // PUT /api/admin/users/:id
  // Dùng cho việc Admin sửa Role, Points, Balance hoặc FullName
  update: (id: string, data: Partial<User>) => 
    api.put<{ message: string; user: User }>(`/admin/users/${id}`, data),

  // POST /api/admin/users/:id/topup
  adminTopUp: (id: string, amount: number) => 
    api.post<{ message: string; newBalance: number }>(`/admin/users/${id}/topup`, { amount }),

  // DELETE /api/admin/users/:id
  delete: (id: string) => 
    api.delete<{ message: string }>(`/admin/users/${id}`),
};

export const systemApi = {
  checkAudioStatus: () => 
    api.get<{ 
      success: boolean; 
      total_in_db: number; 
      missing_files: number; 
      details: any[] 
    }>('/admin/system/check-audio'),
};

export const dashboardApi = {
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getOwnerStats: () => api.get('/dashboard/owner/stats'),
};


export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export default api;