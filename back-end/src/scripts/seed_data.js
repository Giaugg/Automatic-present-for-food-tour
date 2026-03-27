const pool = require('../config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mật khẩu hash của chuỗi "123456"
    const hashedPW = await bcrypt.hash('123456', 10);

    console.log('--- Đang tạo dữ liệu người dùng ---');
    const users = [
      { username: 'admin_sys', email: 'admin@foodtour.com', role: 'admin', name: 'Quản trị viên', balance: 1000000 },
      { username: 'chu_quan_q4', email: 'owner@foodtour.com', role: 'owner', name: 'Chủ quán Vĩnh Khánh', balance: 0 },
      { username: 'traveler_01', email: 'user@foodtour.com', role: 'visitor', name: 'Nguyễn Văn Du Khách', balance: 200000 }
    ];

    const userMap = {};
    for (const u of users) {
      const res = await client.query(`
        INSERT INTO users (username, email, password_hash, role, full_name, balance)
        VALUES ($1, $2, $3, $4, $5, $6::DECIMAL) 
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id, role;
      `, [u.username, u.email, hashedPW, u.role, u.name, u.balance]);
      userMap[res.rows[0].role] = res.rows[0].id;
    }

    console.log('--- Đang tạo danh sách địa điểm (POIs) ---');
    const poiData = [
      { name: "Ốc Oanh", lat: 10.760829, lng: 106.703245, cat: "Hải sản", desc: "Quán ốc hương trứng muối huyền thoại." },
      { name: "Sushi Ko", lat: 10.759500, lng: 106.704100, cat: "Đồ Nhật", desc: "Sushi đường phố chất lượng chuẩn nhà hàng." },
      { name: "Bánh Mì Huỳnh Hoa", lat: 10.771200, lng: 106.691200, cat: "Bánh mì", desc: "Ổ bánh mì đầy đặn bậc nhất Sài Gòn." },
      { name: "Phở Hòa Pasteur", lat: 10.787600, lng: 106.691700, cat: "Phở", desc: "Hương vị phở truyền thống lâu đời." },
      { name: "Cơm Tấm Bãi Rác", lat: 10.762100, lng: 106.702100, cat: "Cơm tấm", desc: "Món cơm tấm huyền thoại của Quận 4." }
    ];

    const poiIds = [];
    for (const p of poiData) {
      // SỬA LỖI TẠI ĐÂY: Thêm ::UUID, ::FLOAT để ép kiểu rõ ràng
      const res = await client.query(`
        INSERT INTO pois (owner_id, latitude, longitude, trigger_radius, category, thumbnail_url)
        VALUES ($1::UUID, $2::FLOAT, $3::FLOAT, $4::INT, $5::VARCHAR, $6::TEXT) 
        RETURNING id;
      `, [userMap['admin'], p.lat, p.lng, 25, p.cat, 'https://placehold.co/600x400?text=Food']);
      
      const poiId = res.rows[0].id;
      poiIds.push(poiId);

      await client.query(`
        INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url)
        VALUES ($1::UUID, $2::VARCHAR, $3::VARCHAR, $4::TEXT, $5::TEXT);
      `, [poiId, 'vi', p.name, p.desc, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3']);
    }

    console.log('--- Đang tạo Tour mẫu ---');
    const tourRes = await client.query(`
      INSERT INTO tours (price, is_active) 
      VALUES (150000::DECIMAL, true) 
      RETURNING id;
    `);
    const tourId = tourRes.rows[0].id;

    await client.query(`
      INSERT INTO tour_translations (tour_id, language_code, title, summary)
      VALUES ($1::UUID, 'vi', 'Food Tour Vĩnh Khánh Q4', 'Hành trình khám phá các món ăn đường phố nổi tiếng.');
    `, [tourId]);

    // Liên kết POI vào Tour
    for (let i = 0; i < 3; i++) {
      await client.query(`
        INSERT INTO tour_items (tour_id, poi_id, step_order)
        VALUES ($1::UUID, $2::UUID, $3::INT);
      `, [tourId, poiIds[i], i + 1]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed dữ liệu thành công!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed thất bại:', err.message);
  } finally {
    client.release();
    process.exit();
  }
};

seed();