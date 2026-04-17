const pool = require('../config/db');

const OWNER_PLAN = {
  FREE: 'free',
  PREMIUM: 'premium'
};

const OWNER_PLAN_CONFIG = {
  [OWNER_PLAN.FREE]: {
    key: OWNER_PLAN.FREE,
    title: 'Goi mien phi',
    priceVnd: 0,
    durationDays: null,
    shortDescription: 'Goi co ban danh cho chu quan moi bat dau',
    maxThumbnailUploads: 3,
    maxAudioRadiusMeters: 30,
    features: [
      'Toi da 3 anh thumbnail',
      'Ban kinh audio toi da 30m',
      'Ho tro tao QR co ban'
    ],
    isActive: true
  },
  [OWNER_PLAN.PREMIUM]: {
    key: OWNER_PLAN.PREMIUM,
    title: 'Goi tra phi',
    priceVnd: 199000,
    durationDays: 30,
    shortDescription: 'Mo rong han muc va uu tien hien thi tren ban do',
    maxThumbnailUploads: 30,
    maxAudioRadiusMeters: 120,
    features: [
      'Toi da 30 anh thumbnail',
      'Ban kinh audio toi da 120m',
      'Uu tien hien thi trong danh sach gan day',
      'Quan ly QR nang cao'
    ],
    isActive: true
  }
};

const normalizePlanKey = (value) => String(value || '').trim().toLowerCase();

const parseFeatures = (value) => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string');
    } catch (e) {
      return [];
    }
  }
  return [];
};

const mapPlanRow = (row) => ({
  key: row.key,
  title: row.title,
  shortDescription: row.short_description || '',
  priceVnd: Number(row.price_vnd || 0),
  durationDays: row.duration_days === null ? null : Number(row.duration_days),
  maxThumbnailUploads: Number(row.max_thumbnail_uploads || 0),
  maxAudioRadiusMeters: Number(row.max_audio_radius_meters || 0),
  features: parseFeatures(row.features),
  isActive: Boolean(row.is_active)
});

const ensureOwnerPlansInfrastructure = async (client = pool) => {
  await client.query(`
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
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_owner_plans_active ON owner_plans (is_active, deleted_at)`);

  // Bo rang buoc cu de cho phep admin dinh nghia them nhieu plan key moi.
  await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_owner_plan_check`);

  for (const plan of Object.values(OWNER_PLAN_CONFIG)) {
    await client.query(
      `INSERT INTO owner_plans (
         key, title, short_description, price_vnd, duration_days,
         max_thumbnail_uploads, max_audio_radius_meters, features, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       ON CONFLICT (key) DO NOTHING`,
      [
        plan.key,
        plan.title,
        plan.shortDescription,
        plan.priceVnd,
        plan.durationDays,
        plan.maxThumbnailUploads,
        plan.maxAudioRadiusMeters,
        JSON.stringify(plan.features || []),
        true
      ]
    );
  }
};

const listOwnerPlans = async ({ includeInactive = false } = {}, client = pool) => {
  await ensureOwnerPlansInfrastructure(client);

  const result = await client.query(
    `SELECT key, title, short_description, price_vnd, duration_days,
            max_thumbnail_uploads, max_audio_radius_meters, features, is_active, created_at, updated_at
     FROM owner_plans
     WHERE deleted_at IS NULL
       AND ($1::BOOLEAN = TRUE OR is_active = TRUE)
     ORDER BY price_vnd ASC, created_at ASC`,
    [includeInactive]
  );

  return result.rows.map(mapPlanRow);
};

const getOwnerPlanConfig = async (planKey, client = pool, { includeInactive = true } = {}) => {
  await ensureOwnerPlansInfrastructure(client);

  const normalizedKey = normalizePlanKey(planKey) || OWNER_PLAN.FREE;
  const planRes = await client.query(
    `SELECT key, title, short_description, price_vnd, duration_days,
            max_thumbnail_uploads, max_audio_radius_meters, features, is_active
     FROM owner_plans
     WHERE key = $1
       AND deleted_at IS NULL
       AND ($2::BOOLEAN = TRUE OR is_active = TRUE)
     LIMIT 1`,
    [normalizedKey, includeInactive]
  );

  if (planRes.rows.length > 0) {
    return mapPlanRow(planRes.rows[0]);
  }

  const freeRes = await client.query(
    `SELECT key, title, short_description, price_vnd, duration_days,
            max_thumbnail_uploads, max_audio_radius_meters, features, is_active
     FROM owner_plans
     WHERE key = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [OWNER_PLAN.FREE]
  );

  if (freeRes.rows.length > 0) {
    return mapPlanRow(freeRes.rows[0]);
  }

  return OWNER_PLAN_CONFIG[OWNER_PLAN.FREE];
};

const createOwnerPlan = async (payload, client = pool) => {
  await ensureOwnerPlansInfrastructure(client);

  const planKey = normalizePlanKey(payload.key);
  const result = await client.query(
    `INSERT INTO owner_plans (
       key, title, short_description, price_vnd, duration_days,
       max_thumbnail_uploads, max_audio_radius_meters, features, is_active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
     ON CONFLICT (key) DO UPDATE SET
       title = EXCLUDED.title,
       short_description = EXCLUDED.short_description,
       price_vnd = EXCLUDED.price_vnd,
       duration_days = EXCLUDED.duration_days,
       max_thumbnail_uploads = EXCLUDED.max_thumbnail_uploads,
       max_audio_radius_meters = EXCLUDED.max_audio_radius_meters,
       features = EXCLUDED.features,
       is_active = EXCLUDED.is_active,
       deleted_at = NULL,
       updated_at = NOW()
     RETURNING key, title, short_description, price_vnd, duration_days,
               max_thumbnail_uploads, max_audio_radius_meters, features, is_active`,
    [
      planKey,
      payload.title,
      payload.shortDescription || '',
      payload.priceVnd,
      payload.durationDays,
      payload.maxThumbnailUploads,
      payload.maxAudioRadiusMeters,
      JSON.stringify(payload.features || []),
      payload.isActive !== false
    ]
  );

  return mapPlanRow(result.rows[0]);
};

const updateOwnerPlan = async (planKey, payload, client = pool) => {
  await ensureOwnerPlansInfrastructure(client);

  const normalizedKey = normalizePlanKey(planKey);
  const assignments = [];
  const values = [];

  if (payload.title !== undefined) {
    values.push(payload.title);
    assignments.push(`title = $${values.length}`);
  }
  if (payload.shortDescription !== undefined) {
    values.push(payload.shortDescription || '');
    assignments.push(`short_description = $${values.length}`);
  }
  if (payload.priceVnd !== undefined) {
    values.push(payload.priceVnd);
    assignments.push(`price_vnd = $${values.length}`);
  }
  if (payload.durationDays !== undefined) {
    values.push(payload.durationDays);
    assignments.push(`duration_days = $${values.length}`);
  }
  if (payload.maxThumbnailUploads !== undefined) {
    values.push(payload.maxThumbnailUploads);
    assignments.push(`max_thumbnail_uploads = $${values.length}`);
  }
  if (payload.maxAudioRadiusMeters !== undefined) {
    values.push(payload.maxAudioRadiusMeters);
    assignments.push(`max_audio_radius_meters = $${values.length}`);
  }
  if (payload.features !== undefined) {
    values.push(JSON.stringify(payload.features));
    assignments.push(`features = $${values.length}::jsonb`);
  }
  if (payload.isActive !== undefined) {
    values.push(payload.isActive);
    assignments.push(`is_active = $${values.length}`);
  }

  if (assignments.length === 0) {
    const existing = await getOwnerPlanConfig(normalizedKey, client, { includeInactive: true });
    return existing;
  }

  values.push(normalizedKey);
  const result = await client.query(
    `UPDATE owner_plans
     SET ${assignments.join(', ')},
         updated_at = NOW()
     WHERE key = $${values.length}
       AND deleted_at IS NULL
     RETURNING key, title, short_description, price_vnd, duration_days,
               max_thumbnail_uploads, max_audio_radius_meters, features, is_active`,
    values
  );

  if (result.rows.length === 0) return null;
  return mapPlanRow(result.rows[0]);
};

const deleteOwnerPlan = async (planKey, client = pool) => {
  await ensureOwnerPlansInfrastructure(client);

  const normalizedKey = normalizePlanKey(planKey);
  const result = await client.query(
    `UPDATE owner_plans
     SET is_active = FALSE,
         deleted_at = NOW(),
         updated_at = NOW()
     WHERE key = $1
       AND deleted_at IS NULL
     RETURNING key`,
    [normalizedKey]
  );

  return result.rowCount > 0;
};

const planExists = async (planKey, { activeOnly = false } = {}, client = pool) => {
  await ensureOwnerPlansInfrastructure(client);

  const normalizedKey = normalizePlanKey(planKey);
  const result = await client.query(
    `SELECT key
     FROM owner_plans
     WHERE key = $1
       AND deleted_at IS NULL
       AND ($2::BOOLEAN = FALSE OR is_active = TRUE)
     LIMIT 1`,
    [normalizedKey, activeOnly]
  );

  return result.rows.length > 0;
};

module.exports = {
  OWNER_PLAN,
  OWNER_PLAN_CONFIG,
  normalizePlanKey,
  ensureOwnerPlansInfrastructure,
  listOwnerPlans,
  getOwnerPlanConfig,
  createOwnerPlan,
  updateOwnerPlan,
  deleteOwnerPlan,
  planExists
};
