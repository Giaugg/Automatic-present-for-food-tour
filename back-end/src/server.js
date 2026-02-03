const express = require('express');
const pool = require('./config/db'); 
require('dotenv').config();

const app = express();

// 1. Phải đặt body-parser lên đầu
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Định nghĩa các Router
// Hãy đảm bảo các file này đã có module.exports = router;
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pois', require('./routes/poiRoutes'));
app.use('/api/tours', require('./routes/tourRoutes'));

// 3. Xử lý lỗi tập trung (Optional nhưng nên có)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Có lỗi xảy ra từ phía Server!' });
});

const port = process.env.PORT || 5000;

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server đang chạy trên port ${port}`);
});