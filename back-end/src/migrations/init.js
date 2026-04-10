const pool = require('../config/db');
const path = require('path');
const bcrypt = require('bcrypt');

const passwordhash = bcrypt.hashSync('123456', 10); // Mật khẩu mặc định cho tất cả người dùng mẫu

const migration = {
  // --- LỆNH TẠO (UP) ---
  up: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("🚀 [MIGRATION] Đang khởi tạo cấu trúc Database...");

      // 1. Khởi tạo Extensions & Types
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('admin', 'owner', 'visitor');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);

      // 2. Tạo các bảng cơ sở
      await client.query(`
        CREATE TABLE IF NOT EXISTS languages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(50) UNIQUE, 
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name VARCHAR(100),
          avatar_url TEXT,
          role user_role DEFAULT 'visitor',
          owner_plan VARCHAR(20) DEFAULT 'free',
          balance DECIMAL(15, 2) DEFAULT 0.00,
          points INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pois (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          trigger_radius_meters INT DEFAULT 30,
          category VARCHAR(50),
          thumbnail_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS poi_translations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
          language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          audio_url TEXT DEFAULT NULL,
          UNIQUE(poi_id, language_id)
        );
      `);

      // 2.1. Đồng bộ schema cho database cũ đã tạo trước đó
      await client.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS owner_plan VARCHAR(20) DEFAULT 'free';

        ALTER TABLE users
          DROP CONSTRAINT IF EXISTS users_owner_plan_check;

        ALTER TABLE users
          ADD CONSTRAINT users_owner_plan_check CHECK (owner_plan IN ('free', 'premium'));

        ALTER TABLE pois
          ADD COLUMN IF NOT EXISTS trigger_radius_meters INT DEFAULT 30;
      `);

      // 3. Chèn dữ liệu mẫu (Seeding)
      console.log("🌱 [SEEDING] Đang chèn dữ liệu mẫu thực tế...");

      // --- 3.1 Languages (3 ngôn ngữ) ---
      const langData = [
        ['vi-VN', 'Tiếng Việt'],
        ['en-US', 'English (US)'],
        ['en-GB', 'English (UK)'],
        ['ja-JP', '日本語 (Japanese)'],
        ['ko-KR', '한국어 (Korean)'],
        ['zh-CN', '简体中文 (Chinese Mainland)'],
        ['zh-TW', '繁體中文 (Chinese Taiwan)'],
        ['fr-FR', 'Français (French)'],
        ['de-DE', 'Deutsch (German)'],
        ['es-ES', 'Español (Spanish)'],
        ['it-IT', 'Italiano (Italian)'],
        ['ru-RU', 'Русский (Russian)'],
        ['pt-BR', 'Português (Brazil)'],
        ['pt-PT', 'Português (Portugal)'],
        ['th-TH', 'ไทย (Thai)'],
        ['id-ID', 'Bahasa Indonesia (Indonesian)'],
        ['ms-MY', 'Bahasa Melayu (Malay)'],
        ['hi-IN', 'हिन्दी (Hindi)'],
        ['ar-XA', 'العربية (Arabic)'],
        ['nl-NL', 'Nederlands (Dutch)'],
        ['tr-TR', 'Türkçe (Turkish)'],
        ['pl-PL', 'Polski (Polish)'],
        ['sv-SE', 'Svenska (Swedish)'],
        ['da-DK', 'Dansk (Danish)'],
        ['nb-NO', 'Norsk bokmål (Norwegian)'],
        ['fi-FI', 'Suomi (Finnish)'],
        ['cs-CZ', 'Čeština (Czech)'],
        ['hu-HU', 'Magyar (Hungarian)'],
        ['el-GR', 'Ελληνικά (Greek)'],
        ['ro-RO', 'Română (Romanian)'],
        ['uk-UA', 'Українська (Ukrainian)'],
        ['he-IL', 'עברית (Hebrew)'],
        ['fa-IR', 'فارسی (Persian)'],
        ['bn-BD', 'বাংলা (Bengali)'],
        ['pa-IN', 'ਪੰਜਾਬੀ (Punjabi)'],
        ['gu-IN', 'ગુજરાતી (Gujarati)'],
        ['ta-IN', 'தமிழ் (Tamil)'],
        ['te-IN', 'తెలుగు (Telugu)'],
        ['kn-IN', 'ಕನ್ನಡ (Kannada)'],
        ['ml-IN', 'മലയാളം (Malayalam)'],
        ['mr-IN', 'मराठी (Marathi)'],
        ['sk-SK', 'Slovenčina (Slovak)'],
        ['bg-BG', 'Български (Bulgarian)'],
        ['sr-RS', 'Српски (Serbian)'],
        ['hr-HR', 'Hrvatski (Croatian)'],
        ['lt-LT', 'Lietuvių (Lithuanian)'],
        ['lv-LV', 'Latviešu (Latvian)'],
        ['et-EE', 'Eesti (Estonian)'],
        ['is-IS', 'Íslenska (Icelandic)'],
        ['af-ZA', 'Afrikaans (Afrikaans)']
      ];
      const langIds = {};
      for (const [code, name] of langData) {
        const res = await client.query(
          `INSERT INTO languages (code, name) VALUES ($1, $2) 
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [code, name]
        );
        langIds[code] = res.rows[0].id;
      }

      // --- 3.2 Users (3 users) ---
      // 4. Seed Users (Bổ sung username và points)
      const userData = [
        ['115e99e8-93b8-493e-94aa-5d3c81911820', 'admin', 'admin@foodtour.com', passwordhash, 'System Admin', 'admin', 'premium', 1000],
        ['225e99e8-93b8-493e-94aa-5d3c81911821', 'owner', 'owner@saigonmap.com', passwordhash, 'Saigon Guide Owner', 'owner', 'free', 500],
        ['335e99e8-93b8-493e-94aa-5d3c81911822', 'visitor', 'visitor@gmail.com', passwordhash, 'Nguyen Van A', 'visitor', 'free', 0]
      ];

      for (const u of userData) {
        await client.query(
          `INSERT INTO users (id, username, email, password_hash, full_name, role, owner_plan, points) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, owner_plan = EXCLUDED.owner_plan`,
          u
        );
      }

      // --- 3.3 POIs & Translations (3 POIs quanh Quận 1) ---
      const poiData = [
        {
          id: 'ae7e0dfd-e1ac-404b-81a2-69eb9fff124a',
          lat: 10.7769, lng: 106.7009, cat: 'Ẩm thực',
          trans: [
            ['vi-VN', 'Bánh Mì Huỳnh Hoa', 'Tiệm bánh mì nổi tiếng nhất Sài Gòn với lớp bơ và pate đặc trưng.'],
            ['en-US', 'Huynh Hoa Bakery', 'The most famous banh mi shop in Saigon with signature butter and pate.'],
            ['ja-JP', 'フインホア・バインミー', 'サイゴンで最も有名なバインミー店で、秘伝のバターとパテが特徴です。']
          ]
        },
        {
          id: 'be7e0dfd-e1ac-404b-81a2-69eb9fff124b',
          lat: 10.7797, lng: 106.6990, cat: 'Kiến trúc',
          trans: [
            ['vi-VN', 'Nhà Thờ Đức Bà', 'Biểu tượng kiến trúc Pháp cổ kính tại trung tâm Quận 1.'],
            ['en-US', 'Notre-Dame Cathedral', 'An ancient French architectural symbol in the heart of District 1.'],
            ['ja-JP', 'サイゴン大聖堂', 'ホーチミン市1区の中心部にある歴史的なフランス様式の教会。']
          ]
        },
        {
          id: 'ce7e0dfd-e1ac-404b-81a2-69eb9fff124c',
          lat: 10.7799, lng: 106.7000, cat: 'Di tích',
          trans: [
            ['vi-VN', 'Bưu Điện Thành Phố', 'Một trong những công trình kiến trúc đẹp nhất Sài Gòn, xây dựng thời Pháp.'],
            ['en-US', 'Saigon Central Post Office', 'One of the most beautiful architectural works in Saigon, built in the French era.'],
            ['ja-JP', 'サイゴン中央郵便局', 'サイゴンで最も美しい建築作品の一つで、フランス統治時代に建設されました。']
          ]
        }
      ];

      for (const poi of poiData) {
        await client.query(
          `INSERT INTO pois (id, owner_id, latitude, longitude, category) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [poi.id, userData[0][0], poi.lat, poi.lng, poi.cat]
        );

        for (const [langCode, name, desc] of poi.trans) {
          await client.query(
            `INSERT INTO poi_translations (poi_id, language_id, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT (poi_id, language_id) DO NOTHING`,
            [poi.id, langIds[langCode], name, desc]
          );
        }
      }

      await client.query('COMMIT');
      console.log('✅ UP thành công! Database đã sẵn sàng với 3 địa điểm tại Quận 1.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ UP thất bại:', err.message);
      throw err;
    } finally {
      client.release();
    }
  },

  // --- LỆNH XÓA (DOWN) ---
  down: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("🗑️ [MIGRATION] Đang dọn dẹp Database...");
      await client.query(`
        DROP TABLE IF EXISTS poi_translations CASCADE;
        DROP TABLE IF EXISTS pois CASCADE;
        DROP TABLE IF EXISTS languages CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS user_role CASCADE;
      `);
      await client.query('COMMIT');
      console.log('✅ DOWN thành công!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ DOWN thất bại:', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
};

const run = async () => {
  const action = process.argv[2];
  if (action === 'up') {
    await migration.up();
    process.exit(0);
  } else if (action === 'down') {
    await migration.down();
    process.exit(0);
  } else {
    console.log(`⚠️ Sử dụng: node ${path.basename(__filename)} [up|down]`);
    process.exit(1);
  }
};

run();