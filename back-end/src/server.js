const express = require('express');
const pool = require('./config/db'); 
require('dotenv').config();

const app = express();

// 1. Phải đặt body-parser lên đầu
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1.5. Logging middleware - Log tất cả requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// 2. Health check route
app.get('/', async (req, res) => {
    try {
        const dbStatus = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            message: 'Backend đang chạy!',
            database: 'Connected',
            timestamp: dbStatus.rows[0].now
        });
    } catch (err) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Backend đang chạy nhưng KHÔNG kết nối được Database.',
            error: err.message
        });
    }
});

// 3. Định nghĩa các Router
// Hãy đảm bảo các file này đã có module.exports = router;
console.log('Loading authRoutes...');
app.use('/api/auth', require('./routes/authRoutes'));
console.log('Loading poiRoutes...');
app.use('/api/pois', require('./routes/poiRoutes'));
console.log('Loading tourRoutes...');
app.use('/api/tours', require('./routes/tourRoutes'));
console.log('All routes loaded');

// 4. Xử lý lỗi tập trung (Optional nhưng nên có)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Có lỗi xảy ra từ phía Server!' });
});

const port = process.env.PORT || 5000;

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server đang chạy trên port ${port}`);
});