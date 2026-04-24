# Tính Năng Thống Kê Thiết Bị - Hướng Dẫn Triển Khai

## 📋 Tổng Quan

Đã chuyển danh sách thiết bị từ trang Dashboard sang một trang riêng biệt với các tính năng thống kê nâng cao và cập nhật real-time.

---

## 🎯 Các Tính Năng

### 1. **Thống Kê Real-Time**
- **Truy cập trong 1 giờ qua** - Số lần truy cập trong 60 phút gần nhất
- **Truy cập trong 24 giờ** - Tổng truy cập trong 1 ngày
- **Tổng truy cập** - Theo khoảng thời gian được chọn (24h, 7d, 30d)
- **IP duy nhất** - Số lượng địa chỉ IP khác nhau

### 2. **Phân Tích Thiết Bị**
- **Phân loại theo Thiết bị** - Mobile, Tablet, Desktop với biểu đồ thanh
- **Trình duyệt hàng đầu** - Chrome, Safari, Firefox, Edge, Opera
- **Hệ điều hành** - Windows, macOS, iOS, Android, Linux
- **Múi giờ** - Phân bố địa lý dựa trên múi giờ

### 3. **Xu Hướng Giờ**
- Biểu đồ truy cập theo giờ trong 24 giờ qua
- Hiển thị IP duy nhất mỗi giờ
- Giúp nhận diện mẫu sử dụng

### 4. **Bảng Thiết Bị Gần Đây**
- Danh sách 100 thiết bị truy cập gần nhất
- Chi tiết: IP, Loại thiết bị, Browser, OS, Độ phân giải màn hình, Múi giờ
- Cập nhật real-time, tự động refresh mỗi 10 giây

---

## 📁 Cấu Trúc Tệp

### Backend

```
back-end/src/
├── controllers/
│   └── deviceController.js          [CẬP NHẬT]
│       ├── identify()               [Có sẵn]
│       ├── getRecentLogs()         [Có sẵn]
│       ├── getDeviceStats()        [MỚI]
│       ├── getRealtimeStats()      [MỚI]
│       └── getHourlyTrend()        [MỚI]
└── routes/
    └── deviceRoutes.js              [CẬP NHẬT]
        ├── POST /identify
        ├── GET /logs
        ├── GET /stats              [MỚI]
        ├── GET /realtime          [MỚI]
        └── GET /trend/hourly      [MỚI]
```

### Frontend

```
front-end/
├── lib/
│   └── api.ts                       [CẬP NHẬT]
│       └── deviceApi                [MỞ RỘNG]
├── app/
│   └── admin/
│       ├── layout.tsx               [CẬP NHẬT]
│       ├── page.tsx                 [CẬP NHẬT]
│       └── devices/
│           └── page.tsx             [MỚI - 550+ dòng]
```

---

## 🔌 API Endpoints

### GET `/api/device/stats?range=24h|7d|30d`
```javascript
Response: {
  timeRange: "24h|7d|30d",
  summary: {
    totalAccess: number,
    uniqueIPs: number
  },
  statistics: {
    byDeviceType: [{device_type, count}],
    byBrowser: [{browser, count}],
    byOperatingSystem: [{operating_system, count}],
    byTimezone: [{timezone, count}]
  }
}
```

### GET `/api/device/realtime`
```javascript
Response: {
  realtime: {
    accessLast1Hour: number,
    accessLast24Hours: number,
    recentDevices: [/* 5 thiết bị gần nhất */],
    topBrowsers: [{browser, count}]
  }
}
```

### GET `/api/device/trend/hourly`
```javascript
Response: {
  data: [{
    hour: string (ISO datetime),
    count: number,
    unique_ips: number
  }]
}
```

---

## 🚀 Hướng Dẫn Sử Dụng

### 1. **Truy Cập Trang Thiết Bị**
- Đăng nhập với tài khoản Admin
- Từ Dashboard, click vào card "Quản lý Thiết bị"
- Hoặc truy cập trực tiếp: `/admin/devices`
- Hoặc từ Sidebar: Quản trị → Quản lý Thiết bị

### 2. **Chọn Khoảng Thời Gian**
```
Các tùy chọn: 24 giờ | 7 ngày | 30 ngày
```
Thống kê sẽ cập nhật tự động khi thay đổi khoảng thời gian

### 3. **Cập Nhật Dữ Liệu**
- Nhấn nút "Cập nhật" ở góc trên phải
- Real-time stats tự động refresh mỗi 10 giây
- Bảng thiết bị cập nhật theo chu kỳ

### 4. **Xem Chi Tiết**
- Hover vào bảng để xem highlight hàng
- Click biểu đồ thanh để xem tỷ lệ phần trăm
- Thông tin IP, OS, Browser hiển thị dưới dạng badge

---

## 🔐 Quyền Truy Cập

```javascript
// Yêu cầu: Admin role
// Middleware: authMiddleware + authorize('admin')
// Header: Authorization: Bearer {token}
```

---

## 📊 Database Schema

Dữ liệu được lưu trữ trong bảng `device_access_logs`:

```sql
CREATE TABLE device_access_logs (
  id UUID PRIMARY KEY,
  ip_address VARCHAR,
  user_agent TEXT,
  device_type VARCHAR,
  browser VARCHAR,
  operating_system VARCHAR,
  accept_language VARCHAR,
  platform_hint VARCHAR,
  timezone VARCHAR,
  language VARCHAR,
  platform VARCHAR,
  screen_resolution VARCHAR,
  touch_points INT,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chỉ mục để tối ưu hiệu suất
CREATE INDEX idx_device_logs_created_at ON device_access_logs(created_at DESC);
CREATE INDEX idx_device_logs_device_type ON device_access_logs(device_type);
CREATE INDEX idx_device_logs_browser ON device_access_logs(browser);
```

---

## ⚡ Hiệu Suất

### Query Optimization
- ✅ Sử dụng `DATE_TRUNC` cho grouping theo giờ
- ✅ Lược bỏ các cột không cần thiết trong SELECT
- ✅ Giới hạn kết quả bằng LIMIT
- ✅ Sử dụng DISTINCT cho counting IP duy nhất

### Frontend Optimization
- ✅ Parallel data fetching (Promise.all)
- ✅ Auto-refresh chỉ cập nhật real-time stats
- ✅ Lazy loading các component lớn
- ✅ Memoization của data transformations

---

## 🐛 Troubleshooting

### Không thể tải dữ liệu
1. Kiểm tra token có hợp lệ không
2. Kiểm tra user có role admin không
3. Xem log server: `docker logs backend`

### Real-time stats không cập nhật
1. Kiểm tra kết nối network
2. Xem console browser (F12)
3. Refresh lại trang

### Dữ liệu lỗi hoặc trống
1. Kiểm tra database connection
2. Xác nhận bảng `device_access_logs` có dữ liệu
3. Kiểm tra date range filter

---

## 🧪 Kiểm Tra

### Manual Testing
```bash
# 1. Truy cập trang device
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/device/stats?range=24h

# 2. Kiểm tra real-time stats
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/device/realtime

# 3. Kiểm tra hourly trend
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/device/trend/hourly
```

### Browser DevTools
1. Mở F12 → Network tab
2. Lọc requests đến `/device/`
3. Kiểm tra response time và data

---

## 📝 Ghi Chú

- 🔄 Real-time stats cập nhật mỗi 10 giây (có thể thay đổi)
- 📊 Hiển thị tối đa 5 items cho "Top Timezones" và "Top Browsers"
- 🔗 Trang device được bảo vệ bởi auth middleware
- 📱 Responsive design cho mobile, tablet, desktop
- 🎨 Sử dụng Tailwind CSS cho styling

---

## 🔄 Các Bước Triển Khai

1. **Backend**: 
   - Cập nhật `deviceController.js` với 3 hàm mới
   - Cập nhật `deviceRoutes.js` thêm 3 route mới
   
2. **Frontend**:
   - Cập nhật `api.ts` với 3 method mới
   - Tạo trang `/admin/devices/page.tsx` mới
   - Cập nhật `admin/layout.tsx` thêm navigation
   - Cập nhật `admin/page.tsx` thay thế device logs

3. **Testing**:
   - Kiểm tra tất cả endpoints
   - Xác nhận real-time updates
   - Kiểm tra auth protection

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra console browser (DevTools)
2. Kiểm tra server logs
3. Xác nhận database connection
4. Đọc error message chi tiết từ API response

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: ✅ Active
