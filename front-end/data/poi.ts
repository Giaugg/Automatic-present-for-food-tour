// src/data/pois.ts
import type { POI, POIDetail, POIImage, POITranslation, Review, TrackingLog } from "@/types/poi";

// ====== POI LIST (dùng cho map markers / list) ======
export const pois: POI[] = [
  {
    id: "vk000001-0000-0000-0000-000000000001",
    owner_id: null,
    latitude: 10.75842,
    longitude: 106.70731,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000002-0000-0000-0000-000000000002",
    owner_id: null,
    latitude: 10.75788,
    longitude: 106.70802,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000003-0000-0000-0000-000000000003",
    owner_id: null,
    latitude: 10.75895,
    longitude: 106.70786,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1604908177522-4297b88d3a2a?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000004-0000-0000-0000-000000000004",
    owner_id: null,
    latitude: 10.75918,
    longitude: 106.70862,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000005-0000-0000-0000-000000000005",
    owner_id: null,
    latitude: 10.75810,
    longitude: 106.70888,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000006-0000-0000-0000-000000000006",
    owner_id: null,
    latitude: 10.75876,
    longitude: 106.70912,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1541542684-4bf98f2c5f23?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000007-0000-0000-0000-000000000007",
    owner_id: null,
    latitude: 10.75962,
    longitude: 106.70805,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000008-0000-0000-0000-000000000008",
    owner_id: null,
    latitude: 10.75995,
    longitude: 106.70892,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1516685018646-549d72f9f22b?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000009-0000-0000-0000-000000000009",
    owner_id: null,
    latitude: 10.76022,
    longitude: 106.70772,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000010-0000-0000-0000-000000000010",
    owner_id: null,
    latitude: 10.76040,
    longitude: 106.70844,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000011-0000-0000-0000-000000000011",
    owner_id: null,
    latitude: 10.75910,
    longitude: 106.70958,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
  {
    id: "vk000012-0000-0000-0000-000000000012",
    owner_id: null,
    latitude: 10.76005,
    longitude: 106.70962,
    trigger_radius: 25,
    thumbnail_url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-26T08:00:00.000Z",
  },
];

// ====== TRANSLATIONS ======
export const poiTranslations: POITranslation[] = [
  // ===== VĨNH KHÁNH FOOD (demo) =====
  {
    id: "tvk000001-0000-0000-0000-000000000001",
    poi_id: "vk000001-0000-0000-0000-000000000001",
    language_code: "vi",
    name: "Ốc Vĩnh Khánh (Demo #1)",
    description:
      "Khu phố ăn uống Vĩnh Khánh nổi tiếng với các món ốc, hải sản và đồ nướng. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000002-0000-0000-0000-000000000002",
    poi_id: "vk000002-0000-0000-0000-000000000002",
    language_code: "vi",
    name: "Hải sản nướng Vĩnh Khánh (Demo #2)",
    description:
      "Gợi ý: thử các món nướng ăn kèm muối ớt xanh, thích hợp đi nhóm bạn. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000003-0000-0000-0000-000000000003",
    poi_id: "vk000003-0000-0000-0000-000000000003",
    language_code: "vi",
    name: "Quán ốc cay (Demo #3)",
    description:
      "Không khí phố ăn uống buổi tối rất nhộn nhịp, phù hợp food tour. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000004-0000-0000-0000-000000000004",
    poi_id: "vk000004-0000-0000-0000-000000000004",
    language_code: "vi",
    name: "Bánh tráng nướng & ăn vặt (Demo #4)",
    description:
      "Một điểm dừng nhẹ: đồ ăn vặt, nước mát, phù hợp check-in nhanh. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000005-0000-0000-0000-000000000005",
    poi_id: "vk000005-0000-0000-0000-000000000005",
    language_code: "vi",
    name: "Lẩu hải sản (Demo #5)",
    description:
      "Thích hợp ăn tối: lẩu hải sản nóng, ăn kèm rau và mì. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000006-0000-0000-0000-000000000006",
    poi_id: "vk000006-0000-0000-0000-000000000006",
    language_code: "vi",
    name: "Nướng BBQ vỉa hè (Demo #6)",
    description:
      "Món nướng kiểu đường phố: thơm, nhanh, hợp khẩu vị nhiều người. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000007-0000-0000-0000-000000000007",
    poi_id: "vk000007-0000-0000-0000-000000000007",
    language_code: "vi",
    name: "Ốc bơ tỏi (Demo #7)",
    description:
      "Gợi ý món: ốc bơ tỏi, ốc hương trứng muối, sò điệp nướng mỡ hành. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000008-0000-0000-0000-000000000008",
    poi_id: "vk000008-0000-0000-0000-000000000008",
    language_code: "vi",
    name: "Trà sữa & nước giải khát (Demo #8)",
    description:
      "Điểm dừng giải khát giữa tour ăn uống, phù hợp nghỉ chân. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000009-0000-0000-0000-000000000009",
    poi_id: "vk000009-0000-0000-0000-000000000009",
    language_code: "vi",
    name: "Bánh mì chảo (Demo #9)",
    description:
      "Ăn nhanh, dễ no: bánh mì chảo với trứng, pate, xúc xích. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000010-0000-0000-0000-000000000010",
    poi_id: "vk000010-0000-0000-0000-000000000010",
    language_code: "vi",
    name: "Cơm tấm đêm (Demo #10)",
    description:
      "Quán cơm tấm ăn đêm, phù hợp sau khi đi dạo phố ăn uống. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000011-0000-0000-0000-000000000011",
    poi_id: "vk000011-0000-0000-0000-000000000011",
    language_code: "vi",
    name: "Chè & tráng miệng (Demo #11)",
    description:
      "Kết thúc food tour bằng món ngọt: chè, flan, sữa chua. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
  {
    id: "tvk000012-0000-0000-0000-000000000012",
    poi_id: "vk000012-0000-0000-0000-000000000012",
    language_code: "vi",
    name: "Hủ tiếu / mì (Demo #12)",
    description:
      "Món nước dễ ăn, hợp nhiều thời điểm trong ngày. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
];

// ====== IMAGES ======
export const poiImages: POIImage[] = [

  // Vĩnh Khánh images (demo)
  {
    id: "ivk000001-0000-0000-0000-000000000001",
    poi_id: "vk000001-0000-0000-0000-000000000001",
    thumbnail_url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400",
    full_image_url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1600",
    full_image_size_bytes: 1_050_000,
    caption: "Món ốc (demo)",
    display_order: 0,
  },
  {
    id: "ivk000002-0000-0000-0000-000000000002",
    poi_id: "vk000002-0000-0000-0000-000000000002",
    thumbnail_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
    full_image_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1600",
    full_image_size_bytes: 1_080_000,
    caption: "Đồ nướng (demo)",
    display_order: 0,
  },
  {
    id: "ivk000003-0000-0000-0000-000000000003",
    poi_id: "vk000003-0000-0000-0000-000000000003",
    thumbnail_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    full_image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600",
    full_image_size_bytes: 1_020_000,
    caption: "Hải sản (demo)",
    display_order: 0,
  },
];

// ====== REVIEWS ======
export const reviews: Review[] = [

  // Vĩnh Khánh reviews (demo)
  {
    id: "rvk000001-0000-0000-0000-000000000001",
    poi_id: "vk000001-0000-0000-0000-000000000001",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    rating: 5,
    comment: "Khu này đi tối cực vui, đồ ăn nhiều lựa chọn!",
    created_at: "2026-01-26T19:10:00.000Z",
  },
  {
    id: "rvk000002-0000-0000-0000-000000000002",
    poi_id: "vk000007-0000-0000-0000-000000000007",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    rating: 4,
    comment: "Món ổn, hơi đông nhưng đáng thử.",
    created_at: "2026-01-26T19:25:00.000Z",
  },
  {
    id: "rvk000003-0000-0000-0000-000000000003",
    poi_id: "vk000011-0000-0000-0000-000000000011",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    rating: 5,
    comment: "Ăn xong làm ly chè là đúng bài!",
    created_at: "2026-01-26T20:05:00.000Z",
  },
];

// ====== TRACKING LOGS (demo cho analytics/admin) ======
export const trackingLogs: TrackingLog[] = [

  // Vĩnh Khánh demo logs
  {
    id: "lvk000001-0000-0000-0000-000000000001",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    poi_id: "vk000001-0000-0000-0000-000000000001",
    event_type: "view_poi",
    language_code: "vi",
    device_info: "Chrome on Windows",
    created_at: "2026-01-26T19:12:00.000Z",
  },
  {
    id: "lvk000002-0000-0000-0000-000000000002",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    poi_id: "vk000002-0000-0000-0000-000000000002",
    event_type: "play_audio",
    language_code: "vi",
    device_info: "Chrome on Windows",
    created_at: "2026-01-26T19:13:00.000Z",
  },
];

// ====== POI DETAIL BUILDER ======
export const poiDetails: POIDetail[] = pois.map((p) => {
  const translation =
    poiTranslations.find((t) => t.poi_id === p.id && t.language_code === "vi") ?? null;

  return {
    ...p,
    translation,
    images: poiImages.filter((img) => img.poi_id === p.id),
    reviews: reviews.filter((rv) => rv.poi_id === p.id),
  };
});

/**
 * Helper: lấy POI detail theo id + lang (giống API)
 */
export function getPOIDetailById(poiId: string, lang: string = "vi"): POIDetail | null {
  const base = pois.find((p) => p.id === poiId);
  if (!base) return null;

  const translation =
    poiTranslations.find((t) => t.poi_id === poiId && t.language_code === lang) ??
    poiTranslations.find((t) => t.poi_id === poiId && t.language_code === "vi") ??
    null;

  return {
    ...base,
    translation,
    images: poiImages.filter((img) => img.poi_id === poiId),
    reviews: reviews.filter((rv) => rv.poi_id === poiId),
  };
}
