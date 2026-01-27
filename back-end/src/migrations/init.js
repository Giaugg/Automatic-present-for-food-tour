const pool = require('../config/db');

const up = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Kích hoạt extension UUID
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Tạo enum user_role
    await client.query(`CREATE TYPE user_role AS ENUM ('admin', 'owner', 'visitor');`);

    // 1. Bảng USERS
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'visitor',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Bảng POIS
    await client.query(`
      CREATE TABLE pois (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        trigger_radius INT DEFAULT 20,
        thumbnail_url TEXT,
        category VARCHAR(50),
        status BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX idx_pois_lat_long ON pois (latitude, longitude);`);

    // 3. Bảng POI_TRANSLATIONS
    await client.query(`
      CREATE TABLE poi_translations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        language_code VARCHAR(5) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        audio_url TEXT,
        audio_duration_seconds INT,
        audio_size_bytes BIGINT,
        UNIQUE(poi_id, language_code)
      );
    `);

    // 4. Bảng POI_IMAGES
    await client.query(`
      CREATE TABLE poi_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        thumbnail_url TEXT NOT NULL,
        full_image_url TEXT NOT NULL,
        full_image_size_bytes BIGINT,
        caption VARCHAR(255),
        display_order INT DEFAULT 0
      );
    `);

    // 5. Bảng TOURS
    await client.query(`
      CREATE TABLE tours (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name JSONB NOT NULL,
        description JSONB,
        thumbnail_url TEXT,
        total_duration_minutes INT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // 6. Bảng TOUR_ITEMS
    await client.query(`
      CREATE TABLE tour_items (
        tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
        poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
        step_order INT NOT NULL,
        PRIMARY KEY (tour_id, poi_id)
      );
    `);

    // 7. Bảng REVIEWS
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

    // 8. Bảng TRACKING_LOGS
    await client.query(`
      CREATE TABLE tracking_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        poi_id UUID REFERENCES pois(id),
        event_type VARCHAR(50) NOT NULL,
        language_code VARCHAR(5),
        device_info VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 001_init thành công!');
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
    
    await client.query(`DROP TABLE IF EXISTS tracking_logs;`);
    await client.query(`DROP TABLE IF EXISTS reviews;`);
    await client.query(`DROP TABLE IF EXISTS tour_items;`);
    await client.query(`DROP TABLE IF EXISTS tours;`);
    await client.query(`DROP TABLE IF EXISTS poi_images;`);
    await client.query(`DROP TABLE IF EXISTS poi_translations;`);
    await client.query(`DROP TABLE IF EXISTS pois;`);
    await client.query(`DROP TABLE IF EXISTS users;`);
    await client.query(`DROP TYPE IF EXISTS user_role;`);

    await client.query('COMMIT');
    console.log('✅ Rollback 001_init thành công!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback thất bại:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

// Chạy trực tiếp từ command line
const action = process.argv[2];

if (action === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node 001_init.cjs [up|down]');
  process.exit(1);
}

module.exports = { up, down };