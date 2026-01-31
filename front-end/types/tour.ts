// src/types/tours.ts

export interface TourDTO {
  id: string;
  name: Record<string, string>; // JSONB
  description: Record<string, string> | null; // JSONB
  thumbnail_url: string | null;
  total_duration_minutes: number | null;
  is_active: boolean;
}

export interface TourItemDTO {
  tour_id: string;
  poi_id: string;
  step_order: number;
}

export interface TourDetailDTO extends TourDTO {
  items: TourItemDTO[];
}
