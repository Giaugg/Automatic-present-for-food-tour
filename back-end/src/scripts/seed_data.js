const bcrypt = require('bcrypt');
const pool = require('../config/db');

const seedData = async () => {
  const passwordHash = await bcrypt.hash("123456", 10);
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Xóa dữ liệu cũ theo thứ tự phụ thuộc khóa ngoại
    await client.query('DELETE FROM tracking_logs');
    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM tour_items');
    await client.query('DELETE FROM tours');
    await client.query('DELETE FROM poi_images');
    await client.query('DELETE FROM poi_translations');
    await client.query('DELETE FROM pois');
    await client.query('DELETE FROM users');
    
    console.log('🗑️  Đã xóa dữ liệu cũ');

    // 1. TẠO USER
    const adminResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin_system', 'admin@vinhkhanh.com', '${passwordHash}', 'admin')
      RETURNING id
    `);
    const adminId = adminResult.rows[0].id;

    const ownerResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('chuquan_ocoanh', 'oanh@gmail.com', '${passwordHash}', 'owner')
      RETURNING id
    `);
    const ownerId = ownerResult.rows[0].id;

    const visitorResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('john_traveler', 'john@example.com', '${passwordHash}', 'visitor')
      RETURNING id
    `);
    const visitorId = visitorResult.rows[0].id;

    // 2. TẠO POI
    const poi1Result = await client.query(`
      INSERT INTO pois (owner_id, latitude, longitude, trigger_radius, thumbnail_url, category)
      VALUES ($1, 10.760829, 106.703245, 25, 'https://example.com/images/ocoanh_thumb.jpg', 'Hải sản')
      RETURNING id
    `, [ownerId]);
    const poi1Id = poi1Result.rows[0].id;

    const poi2Result = await client.query(`
      INSERT INTO pois (owner_id, latitude, longitude, trigger_radius, thumbnail_url, category)
      VALUES ($1, 10.759500, 106.704100, 20, 'https://example.com/images/sushiko_thumb.jpg', 'Đồ Nhật')
      RETURNING id
    `, [ownerId]);
    const poi2Id = poi2Result.rows[0].id;

    // 3. TẠO TRANSLATIONS
    await client.query(`
      INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url, audio_duration_seconds, audio_size_bytes)
      VALUES ($1, 'vi', 'Ốc Oanh - Đặc sản Vĩnh Khánh', 'Quán ốc nổi tiếng nhất khu phố với món ốc hương rang muối ớt trứ danh.', 'https://storage.cloud.com/audio/ocoanh_vi.m4a', 120, 1048576)
    `, [poi1Id]);

    await client.query(`
      INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url, audio_duration_seconds, audio_size_bytes)
      VALUES ($1, 'en', 'Oc Oanh Seafood', 'The most famous snail restaurant in the street.', 'https://storage.cloud.com/audio/ocoanh_en.m4a', 120, 1024000)
    `, [poi1Id]);

    await client.query(`
      INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url)
      VALUES ($1, 'vi', 'Sushi Ko', 'Sushi đường phố giá rẻ nhưng chất lượng chuẩn Nhật Bản.', 'https://audio.com/sushiko_vi.m4a')
    `, [poi2Id]);

    await client.query(`
      INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url)
      VALUES ($1, 'en', 'Sushi Ko Street Food', 'Affordable street sushi with high quality.', 'https://audio.com/sushiko_en.m4a')
    `, [poi2Id]);

    // 4. TẠO IMAGES
    await client.query(`
      INSERT INTO poi_images (poi_id, thumbnail_url, full_image_url, caption)
      VALUES 
        ($1, 'thumb_oc1.webp', 'full_oc1.jpg', 'Món ốc hương nướng'),
        ($1, 'thumb_oc2.webp', 'full_oc2.jpg', 'Không gian quán buổi tối')
    `, [poi1Id]);

    // 5. TẠO TOUR
    const tourResult = await client.query(`
      INSERT INTO tours (name, description, thumbnail_url, total_duration_minutes)
      VALUES (
        '{"vi": "Food Tour No Bụng", "en": "Full Belly Food Tour"}'::jsonb,
        '{"vi": "Khám phá 2 quán ngon nhất từ đầu đường đến cuối đường", "en": "Explore top 2 best spots"}'::jsonb,
        'https://img.com/tour_banner.jpg',
        120
      )
      RETURNING id
    `);
    const tourId = tourResult.rows[0].id;

    await client.query(`
      INSERT INTO tour_items (tour_id, poi_id, step_order) VALUES ($1, $2, 1)
    `, [tourId, poi1Id]);

    await client.query(`
      INSERT INTO tour_items (tour_id, poi_id, step_order) VALUES ($1, $2, 2)
    `, [tourId, poi2Id]);

    // 6. TẠO REVIEW & LOGS
    await client.query(`
      INSERT INTO reviews (poi_id, user_id, rating, comment)
      VALUES ($1, $2, 5, 'Ốc rất ngon, phục vụ nhanh!')
    `, [poi1Id, visitorId]);

    await client.query(`
      INSERT INTO tracking_logs (user_id, poi_id, event_type, language_code, device_info)
      VALUES ($1, $2, 'PLAY_AUDIO', 'en', 'iPhone 14 Pro Max')
    `, [visitorId, poi1Id]);

    await client.query('COMMIT');
    console.log('✅ Seed data thành công!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi seed data:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seedData();
