import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
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

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
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
 * 2. USER/ADMIN API
 */
export const userApi = {
  getAll: (params?: { role?: string; search?: string }) => 
    api.get<User[]>('/admin/users', { params }),

  getById: (id: string) => 
    api.get<User>(`/admin/users/${id}`),

  update: (id: string, data: Partial<User>) => 
    api.put<{ message: string; user: User }>(`/admin/users/${id}`, data),

  adminTopUp: (id: string, amount: number) => 
    api.post<{ message: string; newBalance: number }>(`/admin/users/${id}/topup`, { amount }),

  delete: (id: string) => 
    api.delete<{ message: string }>(`/admin/users/${id}`),
};

/**
 * 3. POI API
 */
export const poiApi = {
  getAll: (lang: string = 'vi') => 
    api.get<POIWithTranslation[]>(`/pois`, { params: { lang } }),
    
  getDetails: (id: string) => 
    api.get<POIDetail>(`/pois/${id}`),

  create: (data: CreatePOIDTO) => 
    api.post<{ id: string; message: string }>('/pois', data),

  // Sử dụng Partial để chỉ gửi những trường cần cập nhật
  update: (id: string, data: Partial<CreatePOIDTO> & { status?: boolean }) =>
    api.put<{ message: string }>(`/pois/${id}`, data),

  delete: (id: string) => 
    api.delete<{ message: string }>(`/pois/${id}`),
};

/**
 * 4. TOUR API
 */
export const tourApi = {
  getAll: (lang: string = 'vi') => 
    api.get<Tour[]>('/tours', { params: { lang } }),
    
  getDetails: (id: string, lang: string = 'vi') => 
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

export default api;