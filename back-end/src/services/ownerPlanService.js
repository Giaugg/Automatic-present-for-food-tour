const OWNER_PLAN = {
  FREE: 'free',
  PREMIUM: 'premium'
};

const OWNER_PLAN_CONFIG = {
  [OWNER_PLAN.FREE]: {
    key: OWNER_PLAN.FREE,
    title: 'Goi mien phi',
    maxThumbnailUploads: 3,
    maxAudioRadiusMeters: 30
  },
  [OWNER_PLAN.PREMIUM]: {
    key: OWNER_PLAN.PREMIUM,
    title: 'Goi tra phi',
    maxThumbnailUploads: 30,
    maxAudioRadiusMeters: 120
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
