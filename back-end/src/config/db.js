const { Pool } = require('pg');
require('dotenv').config();

// Kiểm tra xem DATABASE_URL có tồn tại không
if (!process.env.DATABASE_URL) {
  console.error('❌ Lỗi: Biến môi trường DATABASE_URL không tồn tại trong .env hoặc Docker!');
  process.exit(1);
}

// Cấu hình kết nối
const pool = new Pool({
  // Ép kiểu String chắc chắn để tránh lỗi "password must be a string"
  connectionString: String(process.env.DATABASE_URL),
  // Thêm cấu hình SSL nếu bạn host trên các dịch vụ như Render/Supabase/Neon
  // ssl: { rejectUnauthorized: false } 
});

// Kiểm tra kết nối ngay khi khởi động
(async () => {
  const client = await pool.connect(); // Dùng connect() thay vì query('SELECT 1') để kiểm tra sâu hơn
  try {
    console.log('🚀 Đang kết nối tới PostgreSQL...');
    await client.query('SELECT NOW()');
    console.log('✅ Kết nối PostgreSQL thành công!');
  } catch (err) {
    console.error('❌ Lỗi kết nối PostgreSQL:', err.message);
    // In ra gợi ý nếu lỗi liên quan đến mật khẩu
    if (err.message.includes('SASL')) {
      console.error('💡 Gợi ý: Kiểm tra lại định dạng mật khẩu trong DATABASE_URL.');
    }
  } finally {
    client.release();
  }
})();

pool.on('error', (err) => {
  console.error('❌ Lỗi bất ngờ trên idle client:', err.message);
});

module.exports = pool;