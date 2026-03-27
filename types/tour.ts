import { POIWithTranslation } from "./pois";

export interface TourTranslation {
  language_code: string;
  title: string;
  summary: string;
}

export interface Tour {
  id: string;
  price: number | string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
  title?: string; // Từ join translation
  summary?: string; // Từ join translation
  total_duration_minutes?: number;
  stops_count?: number;
  stops?: TourStop[];
}

export interface TourStop {
  step_order: number;
  poi_id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  thumbnail?: string;
  audio_url?: string;
}

export interface CreateTourDTO {
  price: number;
  thumbnail_url?: string;
  is_active?: boolean;
  translations: TourTranslation[];
}

export interface UpdateTourScheduleDTO {
  items: {
    poi_id: string;
    step_order: number;
  }[];
}