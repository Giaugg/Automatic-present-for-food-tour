# Hệ Thống Quản Lý Trial Account & Device Online (Version 2.0)

## 📋 Tổng Quan

**Đã cập nhật:** Trial account không còn cố định IP/Device ID nữa!

- ❌ **Trước:** Cố định IP và Device ID (khó khăn cho khách hàng remote)
- ✅ **Sau:** Giới hạn linh hoạt số thiết bị, session, IP (phù hợp mọi use case)

Khách hàng có thể trải nghiệm từ nhiều thiết bị/IP khác nhau trong giới hạn cho phép.

---

## 🎯 Tính Năng Chính (Đã Cập Nhật)

### 1. Trial Account System (Flexible Limits)
- ✅ Tạo tài khoản dùng thử với **giới hạn linh hoạt**
- ✅ **Không cố định IP/Device** - Khách hàng dùng từ bất kỳ đâu
- ✅ **Giới hạn số lượng:**
  - `max_devices`: Số thiết bị tối đa (1-10)
  - `max_sessions`: Số phiên làm việc đồng thời (1-20)
  - `max_ips`: Số IP khác nhau tối đa (1-10)
- ✅ Auto-expiration khi hết hạn
- ✅ Gia hạn trial account
- ✅ Hủy trial account
- ✅ Thống kê trial chi tiết

### 2. Online Device Tracking (Với Kiểm Tra Giới Hạn)
- ✅ Theo dõi thiết bị đang online real-time
- ✅ **Kiểm tra giới hạn trial** khi user login
- ✅ **Từ chối login** nếu vượt quá giới hạn
- ✅ Admin kick out user
- ✅ Peak hours analytics

---

## 🗄️ Database Schema (Đã Cập Nhật)

### trial_accounts table
```sql
CREATE TABLE trial_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  max_devices INT NOT NULL DEFAULT 3,        -- Số thiết bị tối đa
  max_sessions INT NOT NULL DEFAULT 5,       -- Số session đồng thời
  max_ips INT NOT NULL DEFAULT 5,            -- Số IP khác nhau
  max_duration_days INT NOT NULL DEFAULT 7,  -- Thời gian trial
  trial_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trial_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_status VARCHAR(20) NOT NULL DEFAULT 'active',
  features JSONB DEFAULT '{"maxTours": 3, "maxPOIs": 10, "canUploadAudio": false, "canUploadThumbnail": false}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints (Đã Cập Nhật)

### Tạo Trial Account (Mới):
```bash
POST /api/trial/create
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "max_devices": 3,        # Số thiết bị tối đa
  "max_sessions": 5,       # Số session đồng thời
  "max_ips": 5,           # Số IP khác nhau
  "max_duration_days": 7   # Thời gian trial
}
```

**Response:**
```json
{
  "message": "Tạo tài khoản dùng thử thành công",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "limits": {
      "maxDevices": 3,
      "maxSessions": 5,
      "maxIPs": 5
    },
    "trialEndAt": "2024-05-01T...",
    "defaultPassword": "123456"
  }
}
```

---

## 🚀 Quy Trình Hoạt Động (Mới)

### 1. Admin Tạo Trial Account
```
Admin → /admin/trial-accounts → "Tạo Trial Mới"
├── Email: user@example.com
├── Max Devices: 3 (số thiết bị)
├── Max Sessions: 5 (đồng thời)
├── Max IPs: 5 (IP khác nhau)
├── Duration: 7 ngày
└── → Tạo user + trial account linh hoạt
```

### 2. User Login Từ Thiết Bị Bất Kỳ
```
User login → createSession()
├── Kiểm tra trial limits
├── Đếm số lượng đang sử dụng
├── Nếu dưới giới hạn → ✅ Cho phép
├── Nếu vượt giới hạn → ❌ Từ chối với message cụ thể
└── Tạo session hoặc báo lỗi
```

### 3. Ví Dụ Kịch Bản

**Khách hàng cá nhân:**
- max_devices: 2 (phone + laptop)
- max_sessions: 3
- max_ips: 2 (nhà + coffee shop)

**Doanh nghiệp nhỏ:**
- max_devices: 5 (nhân viên)
- max_sessions: 10
- max_ips: 3 (văn phòng + remote)

---

## 📊 Admin Dashboard (Đã Cập Nhật)

### Trial Accounts Page
```
┌─────────────────────────────────────────┐
│ Quản Lý Trial Accounts          [+ Tạo] │
├─────────────────────────────────────────┤
│ Email | Tên | Giới Hạn | Start | End | Ngày | Status │ Action │
├─────────────────────────────────────────┤
│ user@.. | John | Devices: 3  | ... | ... | 5d | Active │ [Gia hạn] [Hủy] │
│         |      | Sessions: 5 |     |     |     |        │                 │
│         |      | IPs: 5      |     |     |     |        │                 │
└─────────────────────────────────────────┘
```

### Online Devices Page (Với Trial Limits)
```
┌──────────────────────────────────────────┐
│ Thiết Bị Đang Online [Auto-refresh: ON] │
├──────────────────────────────────────────┤
│ Email | IP | Device | Browser | Idle | Session | Trial | [Kick Out] │
├──────────────────────────────────────────┤
│ user@.. | 192.168.. | Mobile | Chrome | 2p | 45p | 5d | [×] │
│ user@.. | 10.0.0.. | Desktop | Firefox | 8p | 120p | 5d | [×] │
│ user@.. | 203.0.113.. | Tablet | Safari | 15p | 30p | 5d | [×] │
└──────────────────────────────────────────┘
```

---

## ⚙️ Logic Kiểm Tra Giới Hạn (Mới)

### Khi User Login:
```javascript
// 1. Lấy thông tin trial
const trial = await pool.query(`
  SELECT max_devices, max_sessions, max_ips, trial_status, trial_end_at
  FROM trial_accounts WHERE user_id = $1
`, [userId]);

// 2. Kiểm tra trial còn active
if (trial.status !== 'active' || now > trial.end_at) {
  return { allowed: false, reason: 'Trial đã hết hạn' };
}

// 3. Đếm số lượng đang sử dụng
const deviceCount = await pool.query(`
  SELECT COUNT(DISTINCT device_id) FROM user_sessions
  WHERE user_id = $1 AND is_active = TRUE
`, [userId]);

const sessionCount = await pool.query(`
  SELECT COUNT(*) FROM user_sessions
  WHERE user_id = $1 AND is_active = TRUE
`, [userId]);

const ipCount = await pool.query(`
  SELECT COUNT(DISTINCT ip_address) FROM user_sessions
  WHERE user_id = $1 AND is_active = TRUE
`, [userId]);

// 4. Kiểm tra giới hạn
if (deviceCount >= trial.max_devices) {
  return { allowed: false, reason: \`Đã đạt giới hạn thiết bị (\${trial.max_devices})\` };
}
if (sessionCount >= trial.max_sessions) {
  return { allowed: false, reason: \`Đã đạt giới hạn phiên làm việc (\${trial.max_sessions})\` };
}
if (ipCount >= trial.max_ips) {
  return { allowed: false, reason: \`Đã đạt giới hạn IP (\${trial.max_ips})\` };
}

return { allowed: true };
```

---

## 💼 Ví Dụ Sử Dụng

### Trial Cho Khách Hàng Doanh Nghiệp
```
- max_devices: 10 (nhân viên dùng)
- max_sessions: 20 (đồng thời)
- max_ips: 3 (HQ + branch + remote)
- duration: 30 ngày
```

### Trial Cho Khách Hàng Cá Nhân
```
- max_devices: 2 (phone + laptop)
- max_sessions: 3 (đồng thời)
- max_ips: 2 (nhà + công ty)
- duration: 7 ngày
```

---

## 🔒 Bảo Mật & Kiểm Soát

- ✅ **Không cố định IP** - Linh hoạt cho khách hàng
- ✅ **Giới hạn chặt chẽ** - Ngăn lạm dụng tài nguyên
- ✅ **Real-time monitoring** - Admin theo dõi chi tiết
- ✅ **Auto-expiration** - Tự động hết hạn
- ✅ **Admin control** - Kick out, gia hạn, hủy bất kỳ lúc nào

---

## 📱 Frontend Implementation

### Tạo Trial Form (Mới):
```tsx
const [formData, setFormData] = useState({
  email: "",
  full_name: "",
  max_devices: 3,
  max_sessions: 5,
  max_ips: 5,
  max_duration_days: 7,
});

// Form inputs
<div className="grid grid-cols-3 gap-4">
  <input type="number" placeholder="Max Devices" value={max_devices} min="1" max="10" />
  <input type="number" placeholder="Max Sessions" value={max_sessions} min="1" max="20" />
  <input type="number" placeholder="Max IPs" value={max_ips} min="1" max="10" />
</div>
<select value={max_duration_days}>
  <option value="1">1 ngày</option>
  <option value="7">7 ngày</option>
  <option value="30">30 ngày</option>
</select>
```

### Login với Kiểm Tra Giới Hạn:
```tsx
const handleLogin = async () => {
  try {
    // 1. Login
    const loginRes = await authApi.login(credentials);

    // 2. Tạo session (tự động kiểm tra giới hạn)
    const sessionRes = await onlineDeviceApi.createSession({
      device_id: getDeviceId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
    });

    // 3. Thành công → redirect
    router.push('/map');

  } catch (error) {
    if (error.response?.status === 403) {
      // Vượt giới hạn trial
      alert(error.response.data.reason);
      router.push('/upgrade'); // Chuyển đến trang nâng cấp
    }
  }
};
```

---

## 🧪 Testing

### Test Tạo Trial:
```bash
curl -X POST http://localhost:5000/api/trial/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "max_devices": 2,
    "max_sessions": 3,
    "max_ips": 2,
    "max_duration_days": 7
  }'
```

### Test Login Vượt Giới Hạn:
```bash
# Login từ thiết bị 1 → 200 OK
# Login từ thiết bị 2 → 200 OK
# Login từ thiết bị 3 → 403 Forbidden
# Response: "Đã đạt giới hạn thiết bị (2)"
```

---

## 📈 Lợi Ích So Với Version Cũ

| Version 1.0 (Cố định IP) | Version 2.0 (Giới hạn linh hoạt) |
|--------------------------|----------------------------------|
| ❌ Khó khăn cho khách remote | ✅ Dễ dàng mọi khách hàng |
| ❌ Không linh hoạt | ✅ Phù hợp nhiều use case |
| ❌ Khó quản lý doanh nghiệp | ✅ Tốt cho team sử dụng |
| ❌ Dễ bị bypass | ✅ Kiểm soát chặt chẽ hơn |
| ❌ Chỉ 1 thiết bị | ✅ Multiple devices/sessions/IPs |

---

## 📁 Files Đã Cập Nhật

### Backend
- `back-end/src/migrations/init.js` - Schema mới với max_devices, max_sessions, max_ips
- `back-end/src/controllers/trialController.js` - Logic tạo trial mới
- `back-end/src/controllers/onlineDeviceController.js` - Thêm kiểm tra giới hạn

### Frontend
- `front-end/app/admin/trial-accounts/page.tsx` - Form và table mới
- `front-end/lib/api.ts` - API client cập nhật

---

**Last Updated:** April 24, 2026  
**Version:** 2.0 - Flexible Limits  
**Status:** ✅ Production Ready

**Migration đã chạy thành công!** 🎉</content>
<parameter name="filePath">c:\Users\1\Desktop\DA\Automatic-present-for-food-tour\TRIAL_AND_ONLINE_DEVICES_GUIDE_v2.md