import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Language } from '../types/language';
import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth';
import { User, UpdateProfileDTO } from '../types/user';
import { POIWithTranslation } from '../types/pois';
import { Tour, CreateTourDTO, UpdateTourScheduleDTO, TourPurchase } from '../types/tour';
import { getApiBaseUrl } from './apiBaseUrl';

export type DeviceIdentifyPayload = {
  timezone: string | null;
  language: string | null;
  platform: string | null;
  screenResolution: string;
  touchPoints: number;
};

export type OwnerPlanCatalogItem = {
  key: string;
  title: string;
  shortDescription: string;
  priceVnd: number;
  durationDays: number | null;
  maxThumbnailUploads: number;
  maxAudioRadiusMeters: number;
  features: string[];
  isActive?: boolean;
};


let dynamicApiUrl: string | null = null;

const getBaseUrl = async () => {
  if (dynamicApiUrl) return dynamicApiUrl;

  // Sử dụng link RAW và thêm timestamp để tránh cache
  const GITHUB_RAW_URL = `https://raw.githubusercontent.com/Giaugg/Automatic-present-for-food-tour/main/urls.json?t=${new Date().getTime()}`;
  
  try {
    // Sử dụng axios để lấy file JSON
    const response = await axios.get(GITHUB_RAW_URL);
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    
    // Kiểm tra cấu trúc dữ liệu trả về
    if (response.data && response.data.apiUrl) {
      dynamicApiUrl = response.data.apiUrl || getApiBaseUrl(); // Fallback nếu apiUrl rỗng
      console.log("✅ API link:", dynamicApiUrl);
      localStorage.setItem('apiUrl', dynamicApiUrl || ''); // Lưu vào localStorage để dùng cho các lần sau
      return dynamicApiUrl;
    }
    throw new Error("Invalid JSON structure");
  } catch (error) {
    console.error("❌ Failed to fetch URL from GitHub:", error);
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
  topUp: (amount: number) => api.post<{
    message: string;
    balance: number;
    transaction: {
      id: string;
      txn_type: string;
      amount: number | string;
      balance_before: number | string;
      balance_after: number | string;
      created_at: string;
    };
  }>('/auth/topup', { amount }),
  getWalletTransactions: (limit: number = 20) =>
    api.get<Array<{
      id: string;
      txn_type: string;
      amount: number | string;
      balance_before: number | string;
      balance_after: number | string;
      note?: string;
      created_at: string;
      ref_type?: string;
      ref_id?: string;
    }>>('/auth/wallet-transactions', { params: { limit } }),
};

export const paymentApi = {
  createZaloPayTopupOrder: (amount: number) =>
    api.post<{
      message: string;
      app_trans_id: string;
      order_url?: string;
      zp_trans_token?: string;
      qr_code?: string;
    }>('/payments/zalopay/topup-order', { amount }),
  queryZaloPayStatus: (appTransId: string) =>
    api.get<{
      message: string;
      app_trans_id: string;
      local_status: string;
      provider_response?: any;
    }>(`/payments/zalopay/status/${encodeURIComponent(appTransId)}`),
  getOwnerPlans: () =>
    api.get<{
      message: string;
      data: OwnerPlanCatalogItem[];
    }>('/payments/owner-plans'),
  getMyOwnerPlan: () =>
    api.get<{
      message: string;
      data: {
        currentPlan: string;
        balance: number;
        activeSubscription: {
          id: string;
          plan_key: string;
          status: string;
          starts_at: string;
          ends_at: string | null;
        } | null;
        history: Array<{
          id: string;
          plan_key: string;
          amount: number | string;
          status: string;
          payment_method: string;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
        }>;
      };
    }>('/payments/owner-plans/me'),
  subscribeOwnerPlan: (planKey: string) =>
    api.post<{
      message: string;
      data: {
        currentPlan: string;
        wallet: {
          previous_balance: number;
          current_balance: number;
          deducted: number;
        };
      };
    }>('/payments/owner-plans/subscribe', { planKey }),
  getAdminOwnerPlans: () =>
    api.get<{
      message: string;
      data: OwnerPlanCatalogItem[];
    }>('/payments/admin/owner-plans'),
  createAdminOwnerPlan: (data: OwnerPlanCatalogItem) =>
    api.post<{
      message: string;
      data: OwnerPlanCatalogItem;
    }>('/payments/admin/owner-plans', data),
  updateAdminOwnerPlan: (key: string, data: Partial<OwnerPlanCatalogItem>) =>
    api.put<{
      message: string;
      data: OwnerPlanCatalogItem;
    }>(`/payments/admin/owner-plans/${encodeURIComponent(key)}`, data),
  deleteAdminOwnerPlan: (key: string) =>
    api.delete<{ message: string }>(`/payments/admin/owner-plans/${encodeURIComponent(key)}`),
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
  getMyPOIs: () =>
    api.get<
      | {
          success: boolean;
          count: number;
          data: POIWithTranslation[];
        }
      | POIWithTranslation[]
    >('/pois/my-pois'),
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
  deleteAudio: (poiId: string, translationId: string) =>
    api.delete<{ success: boolean; message: string }>(`/pois/${poiId}/audio/${translationId}`),
  syncMissingAudio: (id: string) => api.post(`/pois/${id}/sync-audio`),
  rebuildAudio: (id: string) => api.post(`/pois/${id}/rebuild-audio`),
};

export const tourApi = {
  getAll: (lang: string = 'vi-VN', includeInactive: boolean = false) =>
    api.get<Tour[]>('/tours', { params: { lang, include_inactive: includeInactive } }),
  getDetails: (id: string, lang: string = 'vi-VN') => api.get<Tour>(`/tours/${id}`, { params: { lang } }),
  getMyPurchases: (lang: string = 'vi-VN') => api.get<TourPurchase[]>('/tours/my/purchases', { params: { lang } }),
  purchase: (id: string) => api.post<{
    message: string;
    purchase: { id: string; purchased_at: string; status: string };
    wallet: { previous_balance: number; current_balance: number };
    reward_points: number;
  }>(`/tours/${id}/purchase`),
  updateMyPurchaseProgress: (purchaseId: string, progressStep: number) =>
    api.patch<{
      message: string;
      purchase: {
        id: string;
        tour_id: string;
        progress_step: number;
        status: string;
        completed_at?: string | null;
        updated_at?: string;
      };
      total_steps: number;
    }>(`/tours/my/purchases/${purchaseId}/progress`, { progress_step: progressStep }),
  create: (data: CreateTourDTO) => api.post<{ id: string; message: string }>('/tours', data),
  update: (id: string, data: Partial<CreateTourDTO>) => api.put<{ message: string }>(`/tours/${id}`, data),
  updateSchedule: (tourId: string, data: UpdateTourScheduleDTO) => api.put<{ message: string }>(`/tours/${tourId}/schedule`, data),
  uploadThumbnail: (formData: FormData) =>
    api.post<{ message: string; thumbnail_url: string }>('/tours/upload-thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

// API trung tâm cho tracking thiết bị (đi qua interceptor để tự gắn token nếu có).
export const deviceApi = {
  identify: (payload: DeviceIdentifyPayload) => api.post('/device/identify', payload),
  getLogs: (limit: number = 30) => api.get('/device/logs', { params: { limit } }),
  getStats: (range: string = '24h') => api.get('/device/stats', { params: { range } }),
  getRealtimeStats: () => api.get('/device/realtime'),
  getHourlyTrend: () => api.get('/device/trend/hourly'),
};

// API quản lý tài khoản dùng thử (Trial Account)
export const trialApi = {
  createTrialAccount: (data: {
    email: string;
    full_name?: string;
    max_devices?: number;
    max_sessions?: number;
    max_ips?: number;
    max_duration_days?: number;
    features?: any;
  }) => api.post('/trial/create', data),
  
  getTrialAccounts: (status: string = 'active', limit: number = 50) =>
    api.get('/trial/list', { params: { status, limit } }),
  
  getTrialStats: () => api.get('/trial/stats'),
  
  getTrialDetail: (userId: string) => api.get(`/trial/${userId}`),
  
  extendTrialAccount: (userId: string, additionalDays: number = 7) =>
    api.post(`/trial/${userId}/extend`, { additionalDays }),
  
  cancelTrialAccount: (userId: string, reason?: string) =>
    api.post(`/trial/${userId}/cancel`, { reason }),
  
  checkTrialStatus: () => api.get('/trial/check-status'),
};

// API theo dõi thiết bị online
export const onlineDeviceApi = {
  createSession: (data: {
    device_id: string;
    timezone?: string;
    screen_resolution?: string;
    platform?: string;
  }) => api.post('/online-devices/session/create', data),
  
  updateActivity: (session_id: string) =>
    api.post('/online-devices/session/activity', { session_id }),
  
  endSession: (session_id: string) =>
    api.post(`/online-devices/end-session/${ session_id }`),
  
  getMySession: (user_id: string) =>
    api.get('/online-devices/my-sessions', { params: { user_id } }),
  
  // Admin endpoints
  getOnlineDevices: (timeout: number = 30, limit: number = 100) =>
    api.get('/online-devices/active-devices', { params: { timeout, limit } }),
  
  getOnlineStats: () => api.get('/online-devices/stats'),
  
  kickOutSession: (session_id: string, reason?: string) =>
    api.post(`/online-devices/kick-session/${session_id}`, { reason }),
};

/**
 * 4. HELPER FUNCTIONS
 */
export const getFileUrl = (path: string | null) => {
  if (!path) return "/placeholder.png";
  if (path.startsWith('http')) return path;

  const persistedApiBase = typeof window !== 'undefined' ? localStorage.getItem('apiUrl') : null;
  const baseUrl = persistedApiBase || dynamicApiUrl || getApiBaseUrl();
  
  // Chuẩn hóa đường dẫn: đảm bảo không bị double slash //
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // console.log(baseUrl,cleanPath);
  
  return `${baseUrl}${cleanPath}`;
};

export const getFullAudioUrl = (url: string | null | undefined) => {
  if (!url) return null;

  // 1. Kiểm tra nếu URL đã là link tuyệt đối (http...) thì trả về luôn
  if (url.startsWith('http')) return url;

  // 2. Chuẩn hóa đường dẫn: Đảm bảo có /uploads ở đầu
  // Ví dụ: url = "/poi-1.mp3" -> "/uploads/poi-1.mp3"
  // Ví dụ: url = "uploads/poi-1.mp3" -> "/uploads/poi-1.mp3"
  let path = url;
  if (!path.startsWith('/uploads') && !path.startsWith('uploads')) {
    path = `/uploads${path.startsWith('/') ? path : `/${path}`}`;
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // 3. Thêm tham số chống cache (v=timestamp) 
  // Rất quan trọng khi bạn dùng tính năng Rebuild Audio ở trang Admin
  const baseUrl = dynamicApiUrl || getApiBaseUrl();
  return `${baseUrl}${path}?v=${Date.now()}`;
};

export default api;