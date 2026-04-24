const express = require('express');
const pool = require('./config/db'); 
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const app = express();
const audioService = require('./services/audioService'); // Đường dẫn tới file trên
const { apiLimiter } = require('./middlewares/rateLimitMiddleware');

// --- 1. MIDDLEWARES HỆ THỐNG ---

// Cấu hình CORS linh hoạt hơn (hỗ trợ cả môi trường Dev và Production sau này)
const corsOptions = {
  origin: '*', // Trong quá trình dev bạn có thể để '*', khi deploy nên để domain cụ thể
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'ngrok-skip-browser-warning', // Thêm dòng này để fix lỗi hiện tại
    'Accept'
  ]
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Áp dụng rate limit cho toàn bộ nhóm API `/api`.
app.use('/api', apiLimiter);

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
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/languages', require('./routes/languageRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
// API nhận diện thiết bị khi client truy cập.
app.use('/api/device', require('./routes/deviceRoutes'));
// API quản lý tài khoản dùng thử
app.use('/api/trial', require('./routes/trialRoutes'));
// API theo dõi thiết bị online
app.use('/api/online-devices', require('./routes/onlineDeviceRoutes'));

// Route Quản trị (Dành cho trang Quản lý hồ sơ/tài khoản)
// Lưu ý: File này chứa các chức năng adminTopUp, getAllUsers...
app.use('/api/admin/users', require('./routes/userRoutes')); 

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.listen(port, '0.0.0.0', async () => {
    console.log('--------------------------------------------------');
    console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
    console.log(`📡 API Health Check: http://localhost:${port}/api/health`);
    // await audioService.runTest();
    // http://localhost:5000/uploads/audio/poi_test_en_en_1774191115536.mp3
    console.log('--------------------------------------------------');
});