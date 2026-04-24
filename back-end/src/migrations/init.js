const pool = require('../config/db');
const path = require('path');
const bcrypt = require('bcrypt');

const passwordhash = bcrypt.hashSync('123456', 10); // Mật khẩu mặc định

const migration = {
  // --- LỆNH TẠO (UP) ---
  up: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log("🚀 [MIGRATION] Đang khởi tạo cấu trúc Database toàn diện...");

      // 1. Khởi tạo Extensions & Types
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('admin', 'owner', 'visitor');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);

      // 2. Tạo các bảng cơ sở (Bao gồm các cột từ cả 2 file)
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
          is_trial_user BOOLEAN DEFAULT FALSE,
          trial_expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS trial_accounts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          max_devices INT NOT NULL DEFAULT 3,
          max_sessions INT NOT NULL DEFAULT 5,
          max_ips INT NOT NULL DEFAULT 5,
          max_duration_days INT NOT NULL DEFAULT 7,
          trial_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          trial_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
          trial_status VARCHAR(20) NOT NULL DEFAULT 'active',
          features JSONB DEFAULT '{"maxTours": 3, "maxPOIs": 10, "canUploadAudio": false, "canUploadThumbnail": false}'::jsonb,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Thêm FK trial_account_id vào users sau khi bảng trial_accounts tồn tại
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_account_id UUID REFERENCES trial_accounts(id) ON DELETE SET NULL;

        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          device_id VARCHAR(255),
          ip_address VARCHAR(100),
          device_type VARCHAR(20),
          browser VARCHAR(50),
          operating_system VARCHAR(50),
          user_agent TEXT,
          timezone VARCHAR(80),
          screen_resolution VARCHAR(40),
          is_active BOOLEAN DEFAULT TRUE,
          last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          logout_at TIMESTAMP WITH TIME ZONE,
          session_duration_minutes INT,
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

        CREATE TABLE IF NOT EXISTS tours (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          price DECIMAL(15, 2) DEFAULT 0.00,
          thumbnail_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tour_translations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
          language_code VARCHAR(10) NOT NULL,
          title VARCHAR(255) NOT NULL,
          summary TEXT,
          UNIQUE(tour_id, language_code)
        );

        CREATE TABLE IF NOT EXISTS tour_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
          poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
          step_order INT NOT NULL,
          UNIQUE(tour_id, step_order),
          UNIQUE(tour_id, poi_id)
        );

        CREATE TABLE IF NOT EXISTS tour_purchases (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
          purchase_price DECIMAL(15, 2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'paid',
          progress_step INT DEFAULT 0,
          completed_at TIMESTAMP WITH TIME ZONE,
          purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, tour_id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          txn_type VARCHAR(30) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          balance_before DECIMAL(15, 2) NOT NULL,
          balance_after DECIMAL(15, 2) NOT NULL,
          ref_type VARCHAR(30),
          ref_id UUID,
          note TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payment_orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          provider VARCHAR(30) NOT NULL DEFAULT 'zalopay',
          app_trans_id VARCHAR(64) UNIQUE NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15, 2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          gateway_response JSONB,
          paid_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS owner_plans (
          key VARCHAR(20) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          short_description TEXT,
          price_vnd DECIMAL(15, 2) NOT NULL DEFAULT 0,
          duration_days INT,
          max_thumbnail_uploads INT NOT NULL DEFAULT 3,
          max_audio_radius_meters INT NOT NULL DEFAULT 30,
          features JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          deleted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS owner_plan_subscriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          plan_key VARCHAR(20) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          payment_method VARCHAR(30) NOT NULL DEFAULT 'wallet',
          starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ends_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS device_access_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          ip_address VARCHAR(100),
          user_agent TEXT,
          device_type VARCHAR(20),
          browser VARCHAR(50),
          operating_system VARCHAR(50),
          accept_language VARCHAR(120),
          platform_hint VARCHAR(80),
          timezone VARCHAR(80),
          language VARCHAR(20),
          platform VARCHAR(80),
          screen_resolution VARCHAR(40),
          touch_points INT,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Khởi tạo Indexes (Tổng hợp từ cả 2 file)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tour_purchases_user_purchased_at ON tour_purchases (user_id, purchased_at DESC);
        CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created_at ON payment_orders (user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);
        CREATE INDEX IF NOT EXISTS idx_owner_plan_subscriptions_user_active ON owner_plan_subscriptions (user_id, status, ends_at DESC);
        CREATE INDEX IF NOT EXISTS idx_owner_plans_active ON owner_plans (is_active, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_device_access_logs_created_at ON device_access_logs (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_trial_accounts_user_id ON trial_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
      `);

      // 4. Chèn dữ liệu mẫu (Seeding)
      console.log("🌱 [SEEDING] Đang chèn dữ liệu mẫu...");

      // 4.1 Languages (Giữ nguyên toàn bộ 50 ngôn ngữ)
      const langData = [
        ['vi-VN', 'Tiếng Việt'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['ja-JP', '日本語 (Japanese)'],
        ['ko-KR', '한국어 (Korean)'], ['zh-CN', '简体中文 (Chinese Mainland)'], ['zh-TW', '繁體中文 (Chinese Taiwan)'],
        ['fr-FR', 'Français (French)'], ['de-DE', 'Deutsch (German)'], ['es-ES', 'Español (Spanish)'],
        ['it-IT', 'Italiano (Italian)'], ['ru-RU', 'Русский (Russian)'], ['pt-BR', 'Português (Brazil)'],
        ['pt-PT', 'Português (Portugal)'], ['th-TH', 'ไทย (Thai)'], ['id-ID', 'Bahasa Indonesia (Indonesian)'],
        ['ms-MY', 'Bahasa Melayu (Malay)'], ['hi-IN', 'हिन्दी (Hindi)'], ['ar-XA', 'العربية (Arabic)'],
        ['nl-NL', 'Nederlands (Dutch)'], ['tr-TR', 'Türkçe (Turkish)'], ['pl-PL', 'Polski (Polish)'],
        ['sv-SE', 'Svenska (Swedish)'], ['da-DK', 'Dansk (Danish)'], ['nb-NO', 'Norsk bokmål (Norwegian)'],
        ['fi-FI', 'Suomi (Finnish)'], ['cs-CZ', 'Čeština (Czech)'], ['hu-HU', 'Magyar (Hungarian)'],
        ['el-GR', 'Ελληνικά (Greek)'], ['ro-RO', 'Română (Romanian)'], ['uk-UA', 'Українська (Ukrainian)'],
        ['he-IL', 'עברית (Hebrew)'], ['fa-IR', 'فارسی (Persian)'], ['bn-BD', 'বাংলা (Bengali)'],
        ['pa-IN', 'ਪੰਜਾਬੀ (Punjabi)'], ['gu-IN', 'ગુજરાતી (Gujarati)'], ['ta-IN', 'தமிழ் (Tamil)'],
        ['te-IN', 'తెలుగు (Telugu)'], ['kn-IN', 'ಕನ್ನಡ (Kannada)'], ['ml-IN', 'മലയാളം (Malayalam)'],
        ['mr-IN', 'मराठी (Marathi)'], ['sk-SK', 'Slovenčina (Slovak)'], ['bg-BG', 'Български (Bulgarian)'],
        ['sr-RS', 'Српски (Serbian)'], ['hr-HR', 'Hrvatski (Croatian)'], ['lt-LT', 'Lietuvių (Lithuanian)'],
        ['lv-LV', 'Latviešu (Latvian)'], ['et-EE', 'Eesti (Estonian)'], ['is-IS', 'Íslenska (Icelandic)'],
        ['af-ZA', 'Afrikaans (Afrikaans)']
      ];
      const langIds = {};
      for (const [code, name] of langData) {
        const res = await client.query(
          `INSERT INTO languages (code, name, is_active) VALUES ($1, $2, false) 
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [code, name]
        );
        langIds[code] = res.rows[0].id;
      }

      // 4.2 Users
      const userData = [
        ['115e99e8-93b8-493e-94aa-5d3c81911820', 'admin', 'admin@foodtour.com', passwordhash, 'System Admin', 'admin', 'premium', 1000],
        ['225e99e8-93b8-493e-94aa-5d3c81911821', 'owner', 'owner@saigonmap.com', passwordhash, 'Saigon Guide Owner', 'owner', 'free', 500],
        ['335e99e8-93b8-493e-94aa-5d3c81911822', 'visitor', 'visitor@gmail.com', passwordhash, 'Nguyen Van A', 'visitor', 'free', 0]
      ];
      for (const u of userData) {
        await client.query(
          `INSERT INTO users (id, username, email, password_hash, full_name, role, owner_plan, points) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, owner_plan = EXCLUDED.owner_plan`, u
        );
      }

      // 4.3 Owner Plans
      const ownerPlans = [
        {
          key: 'free', title: 'Goi mien phi', shortDescription: 'Goi co ban danh cho chu quan moi bat dau',
          priceVnd: 0, durationDays: null, maxThumbnailUploads: 3, maxAudioRadiusMeters: 30,
          features: ['Toi da 3 anh thumbnail', 'Ban kinh audio toi da 30m', 'Ho tro tao QR co ban'], isActive: true
        },
        {
          key: 'premium', title: 'Goi tra phi', shortDescription: 'Mo rong han muc va uu tien hien thi tren ban do',
          priceVnd: 199000, durationDays: 30, maxThumbnailUploads: 30, maxAudioRadiusMeters: 120,
          features: ['Toi da 30 anh thumbnail', 'Ban kinh audio toi da 120m', 'Uu tien hien thi', 'Quan ly QR nang cao'], isActive: true
        }
      ];
      for (const plan of ownerPlans) {
        await client.query(
          `INSERT INTO owner_plans (key, title, short_description, price_vnd, duration_days, max_thumbnail_uploads, max_audio_radius_meters, features, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) ON CONFLICT (key) DO NOTHING`,
          [plan.key, plan.title, plan.shortDescription, plan.priceVnd, plan.durationDays, plan.maxThumbnailUploads, plan.maxAudioRadiusMeters, JSON.stringify(plan.features), plan.isActive]
        );
      }

      // 4.4 POIs & Translations
      const poiData = [
        {
          id: 'ae7e0dfd-e1ac-404b-81a2-69eb9fff124a', lat: 10.7769, lng: 106.7009, cat: 'Ẩm thực',
          trans: [
            ['vi-VN', 'Bánh Mì Huỳnh Hoa', 'Tiệm bánh mì nổi tiếng nhất Sài Gòn.'],
            ['en-US', 'Huynh Hoa Bakery', 'Famous banh mi shop.'],
            ['ja-JP', 'フインホア・バインミー', 'サイゴンで最も有名なバインミー店。']
          ]
        },
        {
          id: 'be7e0dfd-e1ac-404b-81a2-69eb9fff124b', lat: 10.7797, lng: 106.6990, cat: 'Kiến trúc',
          trans: [
            ['vi-VN', 'Nhà Thờ Đức Bà', 'Biểu tượng kiến trúc Pháp.'],
            ['en-US', 'Notre-Dame Cathedral', 'French architectural symbol.'],
            ['ja-JP', 'サイゴン大聖堂', '歴史的なフランス様式の教会。']
          ]
        },
        {
          id: 'ce7e0dfd-e1ac-404b-81a2-69eb9fff124c', lat: 10.7799, lng: 106.7000, cat: 'Di tích',
          trans: [
            ['vi-VN', 'Bưu Điện Thành Phố', 'Công trình kiến trúc đẹp thời Pháp.'],
            ['en-US', 'Saigon Central Post Office', 'Beautiful French-era architecture.'],
            ['ja-JP', 'サイゴン中央郵便局', 'フランス統治時代に建設。']
          ]
        }
      ];
      for (const poi of poiData) {
        await client.query(`INSERT INTO pois (id, owner_id, latitude, longitude, category) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [poi.id, userData[0][0], poi.lat, poi.lng, poi.cat]);
        for (const [langCode, name, desc] of poi.trans) {
          await client.query(`INSERT INTO poi_translations (poi_id, language_id, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT (poi_id, language_id) DO NOTHING`, [poi.id, langIds[langCode], name, desc]);
        }
      }

      // 4.5 Tours & Items
      const sampleTourId = 'de7e0dfd-e1ac-404b-81a2-69eb9fff124d';
      await client.query(`INSERT INTO tours (id, price, thumbnail_url, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`, [sampleTourId, 99000, '/uploads/thumbnails/tour-q1.jpg', true]);
      const tourTrans = [
        ['vi-VN', 'Food Tour Quan 1', 'Hanh trinh 3 diem.'],
        ['en-US', 'District 1 Food Tour', 'Curated route.'],
        ['ja-JP', '1区フードツアー', '人気スポット巡り。']
      ];
      for (const [lCode, title, summary] of tourTrans) {
        await client.query(`INSERT INTO tour_translations (tour_id, language_code, title, summary) VALUES ($1, $2, $3, $4) ON CONFLICT (tour_id, language_code) DO NOTHING`, [sampleTourId, lCode, title, summary]);
      }
      const items = [['ae7e0dfd-e1ac-404b-81a2-69eb9fff124a', 1], ['be7e0dfd-e1ac-404b-81a2-69eb9fff124b', 2], ['ce7e0dfd-e1ac-404b-81a2-69eb9fff124c', 3]];
      for (const [pId, order] of items) {
        await client.query(`INSERT INTO tour_items (tour_id, poi_id, step_order) VALUES ($1, $2, $3) ON CONFLICT (tour_id, step_order) DO NOTHING`, [sampleTourId, pId, order]);
      }

      await client.query('COMMIT');
      console.log('✅ UP thành công! Hệ thống đã sẵn sàng với đầy đủ tính năng và dữ liệu mẫu.');
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
        ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS trial_account_id;
        DROP TABLE IF EXISTS user_sessions CASCADE;
        DROP TABLE IF EXISTS trial_accounts CASCADE;
        DROP TABLE IF EXISTS payment_orders CASCADE;
        DROP TABLE IF EXISTS wallet_transactions CASCADE;
        DROP TABLE IF EXISTS tour_purchases CASCADE;
        DROP TABLE IF EXISTS tour_items CASCADE;
        DROP TABLE IF EXISTS tour_translations CASCADE;
        DROP TABLE IF EXISTS tours CASCADE;
        DROP TABLE IF EXISTS owner_plan_subscriptions CASCADE;
        DROP TABLE IF EXISTS owner_plans CASCADE;
        DROP TABLE IF EXISTS poi_translations CASCADE;
        DROP TABLE IF EXISTS pois CASCADE;
        DROP TABLE IF EXISTS languages CASCADE;
        DROP TABLE IF EXISTS device_access_logs CASCADE;
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
  if (action === 'up') { await migration.up(); process.exit(0); }
  else if (action === 'down') { await migration.down(); process.exit(0); }
  else { console.log(`⚠️ Sử dụng: node ${path.basename(__filename)} [up|down]`); process.exit(1); }
};

if (require.main === module) run();
module.exports = migration;