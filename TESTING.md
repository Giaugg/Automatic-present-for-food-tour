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

## 📋 Danh sách API (33 test cases)

### 🔐 Authentication API (`/api/auth`) - 8 tests

| # | Method | Endpoint | Mô tả | Expected |
|---|--------|----------|-------|----------|
| 1 | POST | `/api/auth/register` | Đăng ký visitor | 201 ✅ |
| 2 | POST | `/api/auth/register` | Đăng ký owner | 201 ✅ |
| 3 | POST | `/api/auth/register` | Đăng ký admin | 201 ✅ |
| 4 | POST | `/api/auth/login` | Đăng nhập (lấy JWT token) | 200 ✅ |
| 5 | POST | `/api/auth/login` | Test sai password | 401 ❌ |
| 6 | POST | `/api/auth/login` | Test user không tồn tại | 401 ❌ |
| 7 | POST | `/api/auth/register` | Test duplicate email | 409 ❌ |
| 8 | POST | `/api/auth/register` | Test invalid role | 400 ❌ |

**✨ Feature:** Password được hash bằng **bcrypt** trước khi lưu database!

### 📍 POI API (`/api/pois`) - 5 tests

| # | Method | Endpoint | Mô tả | Expected |
|---|--------|----------|-------|----------|
| 9 | GET | `/api/pois` | Lấy tất cả POIs (English) | 200 ✅ |
| 10 | GET | `/api/pois?lang=vi` | Lấy tất cả POIs (Vietnamese) | 200 ✅ |
| 11 | GET | `/api/pois/:id` | Lấy chi tiết POI - Success | 200 ✅ |
| 12 | GET | `/api/pois/invalid-uuid` | Invalid UUID format | 500 ❌ |
| 13 | GET | `/api/pois/00000000-...` | Non-existent POI | 404 ❌ |

### 🗺️ Tour API - Public (`/api/tours`) - 5 tests

| # | Method | Endpoint | Mô tả | Expected |
|---|--------|----------|-------|----------|
| 14 | GET | `/api/tours` | Lấy tất cả tours | 200 ✅ |
| 15 | GET | `/api/tours/:id` | Chi tiết tour - Success | 200 ✅ |
| 16 | GET | `/api/tours/:id?lang=vi` | Chi tiết tour (Vietnamese) | 200 ✅ |
| 17 | GET | `/api/tours/invalid-uuid` | Invalid UUID format | 500 ❌ |
| 18 | GET | `/api/tours/00000000-...` | Non-existent tour | 404 ❌ |

### 🔒 Tour API - Protected (`/api/tours`) - 15 tests

| # | Method | Endpoint | Mô tả | Expected |
|---|--------|----------|-------|----------|
| 19 | POST | `/api/tours` | Tạo tour - Success (with auth) | 201 ✅ |
| 20 | POST | `/api/tours` | Tạo tour - Without auth | 401 ❌ |
| 21 | POST | `/api/tours` | Tạo tour - Missing fields | 400/500 ❌ |
| 22 | PUT | `/api/tours/:id` | Cập nhật tour - Success | 200 ✅ |
| 23 | PUT | `/api/tours/:id` | Cập nhật - Without auth | 401 ❌ |
| 24 | PUT | `/api/tours/00000000-...` | Cập nhật - Non-existent | 404 ❌ |
| 25 | POST | `/api/tours/:id/items` | Thêm POIs - Success | 200 ✅ |
| 26 | POST | `/api/tours/:id/items` | Thêm POIs - Without auth | 401 ❌ |
| 27 | POST | `/api/tours/:id/items` | Empty items array | 400 ❌ |
| 28 | POST | `/api/tours/:id/items` | Invalid items format | 400 ❌ |
| 29 | DELETE | `/api/tours/:id/items/:poi_id` | Xóa POI - Success | 200 ✅ |
| 30 | DELETE | `/api/tours/:id/items/:poi_id` | Xóa POI - Without auth | 401 ❌ |
| 31 | DELETE | `/api/tours/:id` | Xóa tour - Success | 200 ✅ |
| 32 | DELETE | `/api/tours/:id` | Xóa tour - Without auth | 401 ❌ |
| 33 | DELETE | `/api/tours/00000000-...` | Xóa tour - Non-existent | 404 ❌ |

**📊 Test Coverage:**
- ✅ Success cases: 13 tests
- ❌ Error cases: 20 tests (401, 404, 400, 500)
- 🔐 Protected routes: 15 tests

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
Giờ có thể chạy **test #19-33** với Authorization header!

---

## 📊 Test Cases Overview

### Success Cases (✅ 13 tests)
Tests that should return 2xx status codes when executed correctly.

### Error Cases (❌ 20 tests)
Tests designed to verify error handling:
- **401 Unauthorized**: Missing/invalid JWT token (7 tests)
- **404 Not Found**: Non-existent resources (5 tests)  
- **400 Bad Request**: Invalid data format (4 tests)
- **409 Conflict**: Duplicate resources (1 test)
- **500 Internal Error**: Invalid UUID format (2 tests)

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
