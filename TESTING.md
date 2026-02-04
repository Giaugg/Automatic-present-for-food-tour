# 🧪 API Testing Guide

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
- Khởi động server
- Click **"Send Request"** phía trên mỗi test case

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

---

✨ **Happy Testing!** ✨
