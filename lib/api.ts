import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Language } from '../types/language';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth';
import { User, UpdateProfileDTO } from '../types/user';
import { POIWithTranslation } from '../types/pois';
import { Tour, CreateTourDTO, UpdateTourScheduleDTO } from '../types/tour';


let dynamicApiUrl: string | null = null;

const getBaseUrl = async () => {
  // 1. Ưu tiên lấy từ biến đã fetch thành công
  if (dynamicApiUrl) return dynamicApiUrl;
  
  // 2. Fetch từ GitHub Raw (Thay link của bạn vào đây)
  const GITHUB_RAW_URL = "https://raw.githubusercontent.com/user/repo/main/urls.json";
  
  try {
    const response = await axios.get(GITHUB_RAW_URL);
    dynamicApiUrl = response.data.apiUrl;
    console.log("📡 Đã cập nhật API URL từ GitHub:", dynamicApiUrl);
    return dynamicApiUrl;
  } catch (error) {
    console.error("❌ Không thể lấy URL từ GitHub, dùng mặc định");
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  }
};

const api: AxiosInstance = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Sửa lại Interceptor để hỗ trợ Async (Bất đồng bộ)
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const baseUrl = await getBaseUrl(); // Chờ lấy URL từ GitHub
  config.baseURL = `${baseUrl}/api`;

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * 3. EXPORT CÁC API MODULES
 */

export const authApi = {
  register: (data: RegisterCredentials) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginCredentials) => api.post<AuthResponse>('/auth/login', data),
  getMe: () => api.get<User>('/auth/me'),
  updateProfile: (data: UpdateProfileDTO) => api.put<User>('/auth/profile', data),
};

export const languageApi = {
  getActive: () => api.get<{ success: boolean; data: Language[] }>('/languages/active'),
  getAdminAll: () => api.get<{ success: boolean; data: Language[] }>('/languages/admin/all'),
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: Language }>(`/languages/${id}/status`, { is_active: isActive }),
  update: (id: string, data: Partial<Language>) =>
    api.put<{ success: boolean; data: Language }>(`/languages/${id}`, data),
  syncAudio: (id: string) => api.post(`/languages/${id}/sync-audio`),
  syncTranslate: (id: string) => api.post(`/languages/${id}/sync-translate`),
};

export const poiApi = {
  getAll: (lang: string = 'vi-VN') => api.get<POIWithTranslation[]>(`/pois`, { params: { lang } }),
  getMyPOIs: () => api.get<POIWithTranslation[]>('/pois/my-pois'),
  getById: (id: string, lang: string) => api.get<POIWithTranslation>(`/pois/${id}`, { params: { lang } }),
  getDetails: (id: string) => api.get<{ success: boolean; data: { translations: any[] } }>(`/pois/${id}/details`),
  create: (formData: FormData) =>
    api.post<{ success: boolean; id: string }>('/pois', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  update: (id: string, formData: FormData) =>
    api.put(`/pois/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/pois/${id}`),
  syncMissingAudio: (id: string) => api.post(`/pois/${id}/sync-audio`),
  rebuildAudio: (id: string) => api.post(`/pois/${id}/rebuild-audio`),
};

export const tourApi = {
  getAll: (lang: string = 'vi-VN') => api.get<Tour[]>('/tours', { params: { lang } }),
  getDetails: (id: string, lang: string = 'vi-VN') => api.get<Tour>(`/tours/${id}`, { params: { lang } }),
  create: (data: CreateTourDTO) => api.post<{ id: string; message: string }>('/tours', data),
  update: (id: string, data: Partial<CreateTourDTO>) => api.put<{ message: string }>(`/tours/${id}`, data),
  updateSchedule: (tourId: string, data: UpdateTourScheduleDTO) => api.put<{ message: string }>(`/tours/${tourId}/schedule`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/tours/${id}`),
};

export const userApi = {
  getAll: (params?: { role?: string; search?: string }) => api.get<User[]>('/admin/users', { params }),
  getById: (id: string) => api.get<User>(`/admin/users/${id}`),
  update: (id: string, data: Partial<User>) => api.put<{ message: string; user: User }>(`/admin/users/${id}`, data),
  adminTopUp: (id: string, amount: number) => api.post<{ message: string; newBalance: number }>(`/admin/users/${id}/topup`, { amount }),
  delete: (id: string) => api.delete<{ message: string }>(`/admin/users/${id}`),
};

export const systemApi = {
  checkAudioStatus: () => api.get('/admin/system/check-audio'),
};

export const dashboardApi = {
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getOwnerStats: () => api.get('/dashboard/owner/stats'),
};

/**
 * 4. HELPER FUNCTIONS
 */
export const getFileUrl = (path: string | null) => {
  if (!path) return "/placeholder.png";
  if (path.startsWith('http')) return path;
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;