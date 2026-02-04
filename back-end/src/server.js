const express = require('express');
<<<<<<< HEAD
const pool = require('./config/db'); 
=======
const pool = require('./config/db'); // Import kết nối PostgreSQL từ config
const authController = require('./controllers/authController');
>>>>>>> 1fe7ba4 (tạo controller để xử lý authentication với bcrypt và cập nhật server.js)
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

<<<<<<< HEAD
=======
app.use(express.json());

// Route kiểm tra trạng thái Server và Database
app.get('/', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT NOW()');
    res.send(`Backend đang chạy! Database kết nối thành công lúc: ${dbStatus.rows[0].now}`);
  } catch (err) {
    res.status(500).send('Backend đang chạy nhưng KHÔNG kết nối được Database.');
  }
});

// API trả về tasks (kết hợp lấy từ DB hoặc giả lập)
app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Học Express + Docker', status: 'Doing' },
    { id: 2, title: 'Kết nối Next.js', status: 'Todo' }
  ]);
});

// Auth routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

>>>>>>> 1fe7ba4 (tạo controller để xử lý authentication với bcrypt và cập nhật server.js)
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server đang chạy trên port ${port}`);
});