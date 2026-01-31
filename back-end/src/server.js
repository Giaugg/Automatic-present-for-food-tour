const express = require('express');
const axios = require("axios");
const { Pool } = require('pg'); // Import thư viện kết nối PostgreSQL
const cors = require("cors");
require('dotenv').config(); // Để đọc biến môi trường từ file .env

const app = express();

// Chỉnh lại port: Ưu tiên lấy từ biến môi trường (Docker dùng)
const port = process.env.PORT || 5000;

// Cấu hình kết nối PostgreSQL
// DATABASE_URL sẽ được truyền từ file docker-compose.yml
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
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

app.listen(port, '0.0.0.0', () => {
  // Lưu ý: Thêm '0.0.0.0' để Docker có thể ánh xạ port ra bên ngoài máy thật
  console.log(`Server đang chạy trên port ${port}`);
});