const express = require('express');
const pool = require('./config/db'); 
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES HỆ THỐNG ---

// Cấu hình CORS linh hoạt hơn (hỗ trợ cả môi trường Dev và Production sau này)
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Chặn bởi chính sách CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware - Hiển thị chi tiết hơn để dễ fix lỗi Front-end
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// --- 2. KIỂM TRA KẾT NỐI (HEALTH CHECK) ---
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            database: 'Connected',
            server_time: dbStatus.rows[0].now
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

// --- 3. ĐỊNH NGHĨA CÁC ROUTERS ---

// Các routes công khai & người dùng
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pois', require('./routes/poiRoutes'));
app.use('/api/tours', require('./routes/tourRoutes'));

// Route Quản trị (Dành cho trang Quản lý hồ sơ/tài khoản)
// Lưu ý: File này chứa các chức năng adminTopUp, getAllUsers...
app.use('/api/admin/users', require('./routes/userRoutes')); 

// --- 4. XỬ LÝ LỖI (ERROR HANDLING) ---

// Xử lý Route không tồn tại (404)
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint không tồn tại!' });
});

// Xử lý lỗi hệ thống tập trung (500)
app.use((err, req, res, next) => {
    console.error('🔥 SERVER ERROR:', err.stack);
    res.status(err.status || 500).json({ 
        error: err.message || 'Có lỗi xảy ra từ phía Server!',
        // Chỉ hiện chi tiết lỗi khi đang ở môi trường Development
        dev_stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// --- 5. KHỞI CHẠY SERVER ---
const port = process.env.PORT || 5000;

// Lắng nghe trên 0.0.0.0 để có thể truy cập từ thiết bị khác trong cùng mạng LAN (để test mobile app)
app.listen(port, '0.0.0.0', () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
    console.log(`📡 API Health Check: http://localhost:${port}/api/health`);
    console.log('--------------------------------------------------');
});