// src/data/tours.ts
import type { TourDTO, TourDetailDTO, TourItemDTO } from "@/types/tour";
import { pois } from "@/data/poi";

/*
 * Mock TOURS theo migration:
 * tours(id, name JSONB, description JSONB, thumbnail_url, total_duration_minutes, is_active)
 */
export const tours: TourDTO[] = [
  {
    id: "b1111111-1111-1111-1111-111111111111",
    name: {
      vi: "Tour City Walk Quận 1",
      en: "District 1 City Walk Tour",
    },
    description: {
      vi: "Hành trình tham quan các điểm nổi bật trung tâm TP.HCM.",
      en: "A walking tour through major landmarks in downtown Ho Chi Minh City.",
    },
    thumbnail_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
    total_duration_minutes: 90,
    is_active: true,
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    name: {
      vi: "Tour Bảo tàng & Lịch sử",
      en: "Museum & History Tour",
    },
    description: {
      vi: "Khám phá các bảo tàng và tư liệu lịch sử quan trọng.",
      en: "Explore museums and important historical collections.",
    },
    thumbnail_url:
      "https://images.unsplash.com/photo-1526779259212-756e2e7f1fda?w=1200",
    total_duration_minutes: 120,
    is_active: true,
  },
];

/*
 * Mock TOUR_ITEMS theo migration:
 * tour_items(tour_id, poi_id, step_order)
 */
export const tourItems: TourItemDTO[] = [
  // Tour 1
  {
    tour_id: "b1111111-1111-1111-1111-111111111111",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    step_order: 1,
  },
  {
    tour_id: "b1111111-1111-1111-1111-111111111111",
    poi_id: "a3333333-3333-3333-3333-333333333333",
    step_order: 2,
  },

  // Tour 2
  {
    tour_id: "b2222222-2222-2222-2222-222222222222",
    poi_id: "a2222222-2222-2222-2222-222222222222",
    step_order: 1,
  },
  {
    tour_id: "b2222222-2222-2222-2222-222222222222",
    poi_id: "a1111111-1111-1111-1111-111111111111",
    step_order: 2,
  },
];

//Helper: TourDetail cho FE dùng dễ:
// - gồm tour + items (có step_order)
export const tourDetails: TourDetailDTO[] = tours.map((t) => ({
  ...t,
  items: tourItems
    .filter((it) => it.tour_id === t.id)
    .sort((a, b) => a.step_order - b.step_order),
}));

//Helper: lấy TourDetail theo id
export function getTourDetailById(tourId: string): TourDetailDTO | null {
  const tour = tours.find((t) => t.id === tourId);
  if (!tour) return null;

  const items = tourItems
    .filter((it) => it.tour_id === tourId)
    .sort((a, b) => a.step_order - b.step_order);

  return { ...tour, items };
}

//Helper: lấy danh sách POI của 1 tour theo đúng thứ tự
export function getTourPOIs(tourId: string) {
  const detail = getTourDetailById(tourId);
  if (!detail) return [];

  return detail.items
    .sort((a, b) => a.step_order - b.step_order)
    .map((it) => pois.find((p) => p.id === it.poi_id))
    .filter(Boolean);
}
