# Hệ Thống Quản Lý Trial Account & Device Online

## 📋 Tổng Quan

Tôi đã triển khai một hệ thống hoàn chỉnh để:
1. **Biết thiết bị nào đang kết nối** - Real-time online device tracking
2. **Quản lý trial account** - Với thời gian giới hạn, expiration date, và feature limit

---

## 🎯 Tính Năng Chính

### 1. Trial Account System
- ✅ Tạo tài khoản dùng thử với duration (ngày)
- ✅ Auto-expiration khi hết hạn
- ✅ Giới hạn features theo gói (maxTours, maxPOIs, canUploadAudio, etc.)
- ✅ Theo dõi IP thiết bị của trial user
- ✅ Gia hạn trial account
- ✅ Hủy trial account
- ✅ Thống kê trial (tổng, đang hoạt động, hết hạn)
- ✅ Check trial status khi user login

### 2. Online Device Tracking
- ✅ Tạo session khi user login
- ✅ Update activity (heartbeat) để update last_activity_at
- ✅ End session khi user logout
- ✅ Lấy danh sách tất cả device đang online
- ✅ Theo dõi idle time (phút không hoạt động)
- ✅ Thống kê online devices (by device type, by role)
- ✅ Peak hours analytics
- ✅ Admin có thể kick out session

### 3. Liên Kết Device + Trial Account
- ✅ Biết device nào đang sử dụng trial account nào
- ✅ Hiển thị trial status & ngày còn lại trên device list
- ✅ Giới hạn max devices per trial account

---

## 📁 Cấu Trúc File

### Backend

```
back-end/src/
├── migrations/
│   └── trial_accounts.js              [MỚI - Migration]
├── controllers/
│   ├── trialController.js            [MỚI]
│   └── onlineDeviceController.js     [MỚI]
├── routes/
│   ├── trialRoutes.js                [MỚI]
│   └── onlineDeviceRoutes.js         [MỚI]
└── server.js                         [CẬP NHẬT]
```

### Frontend

```
front-end/
├── lib/
│   └── api.ts                        [CẬP NHẬT - thêm trialApi, onlineDeviceApi]
├── app/
│   └── admin/
│       ├── layout.tsx                [CẬP NHẬT - add 2 links]
│       ├── trial-accounts/
│       │   └── page.tsx              [MỚI - 400+ lines]
│       └── online-devices/
│           └── page.tsx              [MỚI - 400+ lines]
```

---

## 🗄️ Database Schema

### trial_accounts table
```sql
CREATE TABLE trial_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  device_ip VARCHAR(100) NOT NULL,
  device_id VARCHAR(255),
  trial_duration_days INT NOT NULL DEFAULT 7,
  trial_start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_end_at TIMESTAMP NOT NULL,
  trial_status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
  features JSONB DEFAULT {...},
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_sessions table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  ip_address VARCHAR(100),
  device_type VARCHAR(20), -- mobile, tablet, desktop
  browser VARCHAR(50),
  operating_system VARCHAR(50),
  user_agent TEXT,
  timezone VARCHAR(80),
  screen_resolution VARCHAR(40),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP,
  session_duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### users table - columns added
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  trial_account_id UUID REFERENCES trial_accounts(id),
  is_trial_user BOOLEAN DEFAULT FALSE,
  trial_expires_at TIMESTAMP;
```

---

## 🔌 API Endpoints

### Trial Account Endpoints

**Admin APIs:**
```bash
# Tạo trial account mới
POST /api/trial/create
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "device_ip": "192.168.1.100",
  "device_id": "device-uuid",
  "trial_duration_days": 7,
  "features": {...}
}

# Lấy danh sách trial accounts
GET /api/trial/list?status=active&limit=50
Response: { data: [...], count: N }

# Lấy thống kê
GET /api/trial/stats
Response: {
  total_trials,
  active_trials,
  expired_trials,
  cancelled_trials,
  unexpired_active,
  avg_trial_duration_days
}

# Lấy chi tiết trial của user
GET /api/trial/:userId

# Gia hạn trial
POST /api/trial/:userId/extend
{ "additionalDays": 7 }

# Hủy trial
POST /api/trial/:userId/cancel
{ "reason": "User paid" }
```

**User APIs:**
```bash
# Check trạng thái trial của chính mình
GET /api/trial/check-status
Response: {
  isTrialUser: true,
  trialStatus: "active",
  isExpired: false,
  expiresAt: "2024-05-01T...",
  daysRemaining: 5,
  features: {...}
}
```

### Online Device Endpoints

**User APIs:**
```bash
# Tạo session khi login
POST /api/online-devices/session/create
{
  "device_id": "unique-device-id",
  "timezone": "Asia/Ho_Chi_Minh",
  "screen_resolution": "1920x1080",
  "platform": "Windows 10"
}

# Update activity (heartbeat - call mỗi 30s)
POST /api/online-devices/session/activity
{ "session_id": "..." }

# Kết thúc session khi logout
POST /api/online-devices/session/end
{ "session_id": "..." }

# Lấy sessions của user
GET /api/online-devices/my-sessions?includeInactive=false
```

**Admin APIs:**
```bash
# Lấy danh sách device đang online
GET /api/online-devices/active-devices?timeout=30&limit=200
Response: {
  stats: {
    total: N,
    byDeviceType: {...},
    byBrowser: {...},
    byRole: {...}
  },
  data: [...]
}

# Lấy thống kê
GET /api/online-devices/stats
Response: {
  stats: {
    total_active_sessions,
    unique_users_online,
    mobile_count,
    desktop_count,
    tablet_count,
    avg_idle_minutes
  },
  peakHours: [...]
}

# Kick out session
POST /api/online-devices/kick-session/:sessionId
{ "reason": "Policy violation" }
```

---

## 🚀 Cách Sử Dụng

### 1. Triển Khai Trial Account

**Frontend (Admin):**
1. Vào `/admin/trial-accounts`
2. Click "Tạo Trial Mới"
3. Điền form:
   - Email
   - Tên đầy đủ
   - IP thiết bị (để biết thiết bị nào sẽ dùng trial)
   - Device ID (tùy chọn)
   - Thời gian dùng thử (1, 3, 7, 14, 30 ngày)
4. Click "Tạo"

**Dữ liệu được tạo:**
- Tài khoản user mới (email + password: 123456)
- Trial account record
- trial_expires_at tự động set

### 2. Theo Dõi Thiết Bị Online

**Frontend (Admin):**
1. Vào `/admin/online-devices`
2. Xem danh sách thiết bị đang online
3. Thông tin hiển thị:
   - Email, Tên user
   - IP address
   - Loại thiết bị (mobile/tablet/desktop)
   - Browser, OS
   - Thời gian login
   - Idle time (phút không hoạt động)
   - Session duration
   - Trial status & ngày còn lại
4. Admin có thể "Kick out" user

**Auto-refresh:** Mỗi 10 giây (có thể toggle on/off)

### 3. Frontend Implementation (Client-side)

**Login flow:**
```typescript
// 1. Create session
const sessionData = await onlineDeviceApi.createSession({
  device_id: "unique-id",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
});

// 2. Heartbeat (mỗi 30 giây)
setInterval(() => {
  onlineDeviceApi.updateActivity(sessionData.data.id);
}, 30000);

// 3. Check trial status
const trialStatus = await trialApi.checkTrialStatus();
if (trialStatus.data.isExpired) {
  // Redirect to payment page
  router.push('/payment');
}

// 4. Logout
await onlineDeviceApi.endSession(sessionData.data.id);
```

---

## 📊 Admin Dashboards

### Trial Accounts Page (`/admin/trial-accounts`)
- **Stats Cards:** Total, Active, Expired, Unexpired
- **Filter Tabs:** Active, Expired, Cancelled, All
- **Table:** Email, Name, Device IP, Start Date, End Date, Days Left, Status, Actions
- **Actions:** Extend, Cancel
- **Create Modal:** Form để tạo trial account mới

### Online Devices Page (`/admin/online-devices`)
- **Stats Cards:** Active Sessions, Users Online, Mobile/Desktop/Tablet count, Avg Idle
- **Peak Hours:** Chart giờ cao điểm (24h)
- **Auto-refresh Toggle:** ON/OFF
- **Device Table:** Email, IP, Device Type, Browser, OS, Login Time, Idle, Session Duration, Trial, Actions
- **Actions:** Kick out session

---

## ⚙️ Configuration

### Trial Features (mặc định)
```javascript
{
  maxTours: 3,
  maxPOIs: 10,
  canUploadAudio: false,
  canUploadThumbnail: false,
  maxDevices: 1
}
```

### Session Timeout
- Default: 30 phút không hoạt động → session tự động vô hiệu
- Customizable: `/api/online-devices/active-devices?timeout=30`

### Trial Status Values
- `active` - Đang chạy
- `expired` - Hết hạn tự động
- `cancelled` - Admin hủy
- `pending` - Chưa bắt đầu (tùy chọn)

---

## 🔒 Bảo Mật

- ✅ Chỉ Admin có thể tạo/quản lý trial account
- ✅ Chỉ Admin có thể view online devices
- ✅ Auto-logout sau 30 phút idle
- ✅ Admin có thể kick out bất kỳ session nào
- ✅ Trial account tự động expire
- ✅ IP address được lưu để track abuse

---

## 💻 Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Bcrypt (password hashing)

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Lucide React (icons)

---

## 📝 Migration & Setup

### 1. Database Migration
```bash
# Auto-run khi server start (từ init.js)
# Hoặc manual:
node back-end/src/migrations/trial_accounts.js
```

### 2. Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost/foodtour
JWT_SECRET=your-secret
PORT=5000
```

### 3. Start Server
```bash
cd back-end
npm run dev

cd front-end
npm run dev
```

---

## 🧪 Testing

### Test Trial Account Creation
```bash
curl -X POST http://localhost:5000/api/trial/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "device_ip": "192.168.1.100",
    "trial_duration_days": 7
  }'
```

### Test Online Devices
```bash
curl -X GET http://localhost:5000/api/online-devices/active-devices \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🐛 Troubleshooting

### Issue: Trial account không expire
- Check: Database timezone setting
- Fix: Ensure `trial_end_at` comparison sử dụng NOW()

### Issue: Online device không hiện
- Check: User đã call `createSession` chưa?
- Fix: Kiểm tra request body có đủ `device_id` không

### Issue: Heartbeat không update
- Check: `updateActivity` được call đều đặn?
- Fix: Setup interval mỗi 30s trên client

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra server logs: `docker logs backend`
2. Kiểm tra browser console (DevTools)
3. Xác nhận token còn hạn
4. Kiểm tra database connection

---

**Last Updated:** April 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
