const { Pool } = require('pg');
require('dotenv').config();

// Cấu hình kết nối PostgreSQL
// DATABASE_URL sẽ được truyền từ file docker-compose.yml
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Kiểm tra kết nối ngay khi khởi động
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Kết nối PostgreSQL thành công!');
  } catch (err) {
    console.error('❌ Lỗi kết nối PostgreSQL:', err.message);
  }
})();

pool.on('error', (err) => {
  console.error('❌ Lỗi kết nối PostgreSQL:', err.message);
});

module.exports = pool;
