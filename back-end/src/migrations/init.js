const pool = require('../config/db');

const up = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 0. Dọn dẹp sạch sẽ trước khi tạo mới
    await client.query(`
      DROP TABLE IF EXISTS tracking_logs CASCADE;
      DROP TABLE IF EXISTS reviews CASCADE;
      DROP TABLE IF EXISTS tour_items CASCADE;
      DROP TABLE IF EXISTS tour_translations CASCADE;
      DROP TABLE IF EXISTS tours CASCADE;
      DROP TABLE IF EXISTS poi_images CASCADE;
      DROP TABLE IF EXISTS poi_translations CASCADE;
      DROP TABLE IF EXISTS pois CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
    `);

    // Kích hoạt extension UUID (vẫn nên giữ để định danh an toàn)
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Tạo enum user_role
    await client.query(`CREATE TYPE user_role AS ENUM ('admin', 'owner', 'visitor');`);

    // 1. Bảng USERS
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        google_id VARCHAR(255) UNIQUE, 
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(100),
        avatar_url TEXT,
        role user_role DEFAULT 'visitor',
        balance DECIMAL(15, 2) DEFAULT 0.00, -- Kiểu số thập phân đơn giản cho tiền
        points INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Bảng POIS (Điểm đến)
    await client.query(`
      CREATE TABLE pois (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        latitude DOUBLE PRECISION NOT NULL,  -- Kinh độ/Vĩ độ kiểu số thực
        longitude DOUBLE PRECISION NOT NULL,
        trigger_radius INT DEFAULT 25,       -- Bán kính (mét)
        thumbnail_url TEXT,
        category VARCHAR(50),
        status BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Index để tìm kiếm tọa độ nhanh hơn
    await client.query(`CREATE INDEX idx_pois_coords ON pois (latitude, longitude);`);

    // 3. Bảng POI_TRANSLATIONS (Đa ngôn ngữ)
    await client.query(`
      CREATE TABLE poi_translations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        language_code VARCHAR(5) NOT NULL, -- 'vi', 'en', 'ja'
        name VARCHAR(255) NOT NULL,
        description TEXT,
        audio_url TEXT,
        audio_duration_seconds INT,
        UNIQUE(poi_id, language_code)
      );
    `);

    // 4. Bảng POI_IMAGES
    await client.query(`
      CREATE TABLE poi_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        full_image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption VARCHAR(255),
        display_order INT DEFAULT 0
      );
    `);

    // 5. Bảng TOURS
    await client.query(`
      CREATE TABLE tours (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        price DECIMAL(15, 2) DEFAULT 0.00,
        thumbnail_url TEXT,
        total_duration_minutes INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Bảng TOUR_TRANSLATIONS
    await client.query(`
      CREATE TABLE tour_translations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
        language_code VARCHAR(5) NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        UNIQUE(tour_id, language_code)
      );
    `);

    // 7. Bảng TOUR_ITEMS (Liên kết POI vào Tour)
    await client.query(`
      CREATE TABLE tour_items (
        tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        step_order INT NOT NULL,
        PRIMARY KEY (tour_id, poi_id)
      );
    `);

    // 8. Bảng REVIEWS
    await client.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Bảng TRACKING_LOGS (Lịch sử người dùng)
    await client.query(`
      CREATE TABLE tracking_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        poi_id UUID REFERENCES pois(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        language_code VARCHAR(5),
        device_info TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration thành công với kiểu dữ liệu đơn giản!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration thất bại:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

const down = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DROP TABLE IF EXISTS tracking_logs CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS reviews CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS tour_items CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS tour_translations CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS tours CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS poi_images CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS poi_translations CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS pois CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS user_role CASCADE;`);
    await client.query('COMMIT');
    console.log('✅ Rollback thành công!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const action = process.argv[2];
if (action === 'up') up().then(() => process.exit(0)).catch(() => process.exit(1));
else if (action === 'down') down().then(() => process.exit(0)).catch(() => process.exit(1));

module.exports = { up, down };