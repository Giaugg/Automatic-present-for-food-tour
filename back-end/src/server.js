const express = require('express');
const app = express();
const port = 3000||process.env.PORT;

// Middleware để đọc dữ liệu JSON từ request body
app.use(express.json());

// Route trang chủ
app.get('/', (req, res) => {
  res.send('Chào mừng đến với Express Server!');
});

// Ví dụ một API trả về JSON (thường dùng cho Frontend Next.js của bạn)
app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Học Express', status: 'Doing' },
    { id: 2, title: 'Kết nối Frontend', status: 'Todo' }
  ]);
});

// Lắng nghe port
app.listen(port, () => {
  console.log(`Express server đang chạy tại http://localhost:${port}`);
});