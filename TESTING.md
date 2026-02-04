# 🧪 API Testing Guide

## 📦 Cài đặt và Khởi động

### 1. Clone project và cài dependencies
```bash
git clone https://github.com/Giaugg/Automatic-present-for-food-tour.git
cd Automatic-present-for-food-tour/back-end
npm install
```

### 2. Cấu hình Database
Tạo file `.env` trong thư mục `back-end`:
```env
DATABASE_URL=postgres://postgres:123456@localhost:5432/Automatic-present-for-food-tour
PORT=5000
JWT_SECRET=your_secret_key_here
```

### 3. Khởi động server
```bash
npm start
```

Server chạy tại: `http://localhost:5000`

---

## 🚀 Test API với REST Client

### Bước 1: Cài đặt Extension
1. Mở VS Code
2. Nhấn `Ctrl+Shift+X` (hoặc `Cmd+Shift+X` trên Mac)
3. Tìm **"REST Client"** (tác giả: Huachao Mao)
4. Click **Install**

### Bước 2: Mở file test
```
📁 back-end/api-tests.http
```

### Bước 3: Test API
- Click **"Send Request"** phía trên mỗi test case
- Kết quả hiển thị ngay bên cạnh
- Không cần rời khỏi VS Code!

---

## 📋 Danh sách API (19 endpoints)

### 🔐 Authentication API (`/api/auth`)

| # | Method | Endpoint | Mô tả | Auth |
|---|--------|----------|-------|------|
| 1 | POST | `/api/auth/register` | Đăng ký visitor | ❌ |
| 2 | POST | `/api/auth/register` | Đăng ký owner | ❌ |
| 3 | POST | `/api/auth/register` | Đăng ký admin | ❌ |
| 4 | POST | `/api/auth/login` | Đăng nhập (lấy JWT token) | ❌ |
| 5 | POST | `/api/auth/login` | Test sai password | ❌ |
| 6 | POST | `/api/auth/login` | Test user không tồn tại | ❌ |
| 7 | POST | `/api/auth/register` | Test duplicate email | ❌ |
| 8 | POST | `/api/auth/register` | Test invalid role | ❌ |

**✨ Feature:** Password được hash bằng **bcrypt** trước khi lưu database!

### 📍 POI API (`/api/pois`)

| # | Method | Endpoint | Mô tả | Auth |
|---|--------|----------|-------|------|
| 9 | GET | `/api/pois` | Lấy tất cả POIs (English) | ❌ |
| 10 | GET | `/api/pois?lang=vi` | Lấy tất cả POIs (Vietnamese) | ❌ |
| 11 | GET | `/api/pois/:id` | Lấy chi tiết POI | ❌ |

### 🗺️ Tour API - Public (`/api/tours`)

| # | Method | Endpoint | Mô tả | Auth |
|---|--------|----------|-------|------|
| 12 | GET | `/api/tours` | Lấy tất cả tours | ❌ |
| 13 | GET | `/api/tours/:id` | Chi tiết tour (English) | ❌ |
| 14 | GET | `/api/tours/:id?lang=vi` | Chi tiết tour (Vietnamese) | ❌ |

### 🔒 Tour API - Protected (`/api/tours`)

| # | Method | Endpoint | Mô tả | Auth |
|---|--------|----------|-------|------|
| 15 | POST | `/api/tours` | Tạo tour mới | ✅ JWT |
| 16 | PUT | `/api/tours/:id` | Cập nhật tour | ✅ JWT |
| 17 | POST | `/api/tours/:id/items` | Thêm POIs vào tour | ✅ JWT |
| 18 | DELETE | `/api/tours/:id/items/:poi_id` | Xóa POI khỏi tour | ✅ JWT |
| 19 | DELETE | `/api/tours/:id` | Xóa tour | ✅ JWT |

---

## 🔑 Cách test API có Authentication

### Bước 1: Login để lấy JWT token
Mở `api-tests.http`, chạy **test #4**:
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "visitor1@test.com",
  "password": "password123"
}
```

### Bước 2: Copy token từ response
```json
{
  "message": "Đăng nhập thành công",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI3YjAzZmFk...",
  "user": { ... }
}
```

### Bước 3: Paste token vào dòng 2 của file
```http
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI3YjAzZmFk...
```

### Bước 4: Test các API protected
Giờ có thể chạy **test #15-19** với Authorization header!

---

## 🎯 Quick Start Demo

```bash
# 1. Khởi động server
cd back-end
npm start

# 2. Mở VS Code
code .

# 3. Mở file test
# File: back-end/api-tests.http

# 4. Click "Send Request" để test!
```

---

## ❗ Lưu ý quan trọng

### ✅ Before Testing
- ✅ PostgreSQL đang chạy
- ✅ Database đã được tạo
- ✅ Đã chạy migrations
- ✅ Server đang chạy (`npm start`)

### 🔧 Thay đổi ID trong tests
Một số test cần ID thực từ database:
- `YOUR_TOUR_ID_HERE` → Lấy từ test #12
- `YOUR_POI_ID_HERE` → Lấy từ test #9
- File đã có sẵn ID mẫu, nhưng có thể cần update

### ⏰ JWT Token expires sau 1 ngày
Nếu gặp lỗi **401 Unauthorized**, login lại để lấy token mới!

---

## 🐛 Troubleshooting

### Lỗi: Connection refused
```bash
# Kiểm tra server
cd back-end
npm start
```

### Lỗi: 401 Unauthorized
- Token hết hạn → Login lại (test #4)
- Chưa thêm token → Kiểm tra `@token` ở đầu file

### Lỗi: 500 Invalid UUID
- Đang dùng nhầm JWT token làm ID
- Thay bằng UUID thực từ response test khác

### Lỗi: Cannot find module 'bcrypt'
```bash
cd back-end
npm install bcrypt
npm rebuild bcrypt
```

---

## 🤝 Chia sẻ với Team

1. **Push code lên GitHub:**
```bash
git add .
git commit -m "Add API testing file and guide"
git push
```

2. **Chia sẻ hướng dẫn:**
- File test: `back-end/api-tests.http`
- Hướng dẫn này: `TESTING.md`

3. **Team member chỉ cần:**
```bash
git pull
cd back-end
npm install
npm start
# Mở api-tests.http và click "Send Request"
```

---

## 📚 Tài liệu thêm

- [REST Client Extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/) - Debug JWT tokens

---

✨ **Happy Testing!** ✨
