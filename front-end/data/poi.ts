// src/data/pois.ts
import type {
  POI,
  POIDetail,
  POIImage,
  POITranslation,
  Review,
  TrackingLog,
} from "@/types/poi";

// ====== POI LIST (dùng cho map markers / list) ======
export const pois: POI[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    owner_id: "7b3b2c3a-3b91-4e7d-8e4a-222222222222",
    latitude: 10.776889,
    longitude: 106.700806,
    trigger_radius: 25,
    thumbnail_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
    category: "landmark",
    status: true,
    updated_at: "2026-01-25T08:00:00.000Z",
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    owner_id: "7b3b2c3a-3b91-4e7d-8e4a-222222222222",
    latitude: 10.772194,
    longitude: 106.698305,
    trigger_radius: 30,
    thumbnail_url:
      "https://images.unsplash.com/photo-1526779259212-756e2e7f1fda?w=800",
    category: "museum",
    status: true,
    updated_at: "2026-01-24T08:00:00.000Z",
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    owner_id: null,
    latitude: 10.780091,
    longitude: 106.699784,
    trigger_radius: 20,
    thumbnail_url:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
    category: "food",
    status: true,
    updated_at: "2026-01-23T08:00:00.000Z",
  },
];

// ====== TRANSLATIONS ======
export const poiTranslations: POITranslation[] = [
  {
    id: "t1111111-1111-1111-1111-111111111111",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    language_code: "vi",
    name: "Nhà thờ Đức Bà",
    description:
      "Một trong những công trình kiến trúc biểu tượng của TP.HCM, nổi bật với phong cách Romanesque.",
    audio_url: "https://example.com/audio/notre-dame-vi.mp3",
    audio_duration_seconds: 120,
    audio_size_bytes: 2_400_000,
  },
  {
    id: "t1111111-1111-1111-1111-222222222222",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    language_code: "en",
    name: "Notre-Dame Cathedral Basilica of Saigon",
    description:
      "A landmark of Ho Chi Minh City, known for its Romanesque architecture and twin bell towers.",
    audio_url: "https://example.com/audio/notre-dame-en.mp3",
    audio_duration_seconds: 115,
    audio_size_bytes: 2_300_000,
  },

  {
    id: "t2222222-2222-2222-2222-111111111111",
    poi_id: "a2222222-2222-2222-2222-222222222222",
    language_code: "vi",
    name: "Bảo tàng Chứng tích Chiến tranh",
    description:
      "Nơi trưng bày nhiều hiện vật và tư liệu lịch sử quan trọng, thu hút nhiều du khách quốc tế.",
    audio_url: "https://example.com/audio/war-remnants-vi.mp3",
    audio_duration_seconds: 180,
    audio_size_bytes: 3_800_000,
  },

  {
    id: "t3333333-3333-3333-3333-111111111111",
    poi_id: "a3333333-3333-3333-3333-333333333333",
    language_code: "vi",
    name: "Quán ăn địa phương (Demo)",
    description:
      "Một điểm dừng chân ẩm thực nổi bật, phù hợp cho food tour. (Dữ liệu demo)",
    audio_url: null,
    audio_duration_seconds: null,
    audio_size_bytes: null,
  },
];

// ====== IMAGES ======
export const poiImages: POIImage[] = [
  {
    id: "i1111111-1111-1111-1111-111111111111",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    thumbnail_url:
      "https://images.unsplash.com/photo-1526779259212-756e2e7f1fda?w=400",
    full_image_url:
      "https://images.unsplash.com/photo-1526779259212-756e2e7f1fda?w=1600",
    full_image_size_bytes: 1_200_000,
    caption: "Góc nhìn phía trước",
    display_order: 0,
  },
  {
    id: "i1111111-1111-1111-1111-222222222222",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    thumbnail_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400",
    full_image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600",
    full_image_size_bytes: 1_500_000,
    caption: "Không gian xung quanh",
    display_order: 1,
  },
  {
    id: "i2222222-2222-2222-2222-111111111111",
    poi_id: "a2222222-2222-2222-2222-222222222222",
    thumbnail_url:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400",
    full_image_url:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600",
    full_image_size_bytes: 1_100_000,
    caption: "Khu trưng bày",
    display_order: 0,
  },
];

// ====== REVIEWS ======
export const reviews: Review[] = [
  {
    id: "r1111111-1111-1111-1111-111111111111",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    rating: 5,
    comment: "Rất đẹp, đáng tham quan!",
    created_at: "2026-01-26T10:00:00.000Z",
  },
  {
    id: "r2222222-2222-2222-2222-222222222222",
    poi_id: "a2222222-2222-2222-2222-222222222222",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    rating: 4,
    comment: "Nhiều tư liệu hay, hơi đông.",
    created_at: "2026-01-26T12:00:00.000Z",
  },
];

// ====== TRACKING LOGS (demo cho analytics/admin) ======
export const trackingLogs: TrackingLog[] = [
  {
    id: "l1111111-1111-1111-1111-111111111111",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    event_type: "view_poi",
    language_code: "vi",
    device_info: "Chrome on Windows",
    created_at: "2026-01-26T10:05:00.000Z",
  },
  {
    id: "l2222222-2222-2222-2222-222222222222",
    user_id: "7b3b2c3a-3b91-4e7d-8e4a-333333333333",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    event_type: "play_audio",
    language_code: "vi",
    device_info: "Chrome on Windows",
    created_at: "2026-01-26T10:06:00.000Z",
  },
];

// ====== POI DETAIL BUILDER ======
export const poiDetails: POIDetail[] = pois.map((p) => {
  const translation =
    poiTranslations.find((t) => t.poi_id === p.id && t.language_code === "vi") ??
    null;

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
