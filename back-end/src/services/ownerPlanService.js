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
    ]
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
    ]
  }
};

const getOwnerPlanConfig = (planKey) => {
  return OWNER_PLAN_CONFIG[planKey] || OWNER_PLAN_CONFIG[OWNER_PLAN.FREE];
};

module.exports = {
  OWNER_PLAN,
  OWNER_PLAN_CONFIG,
  getOwnerPlanConfig
};
