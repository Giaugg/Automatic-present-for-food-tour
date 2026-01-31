// src/types/pois.ts

export interface POI {
  id: string;
  owner_id: string | null;

  latitude: number;
  longitude: number;

  trigger_radius: number; // meters
  thumbnail_url: string | null;

  category: string | null;
  status: boolean;

  updated_at: string; // ISO string
}

export interface POITranslation {
  id: string;
  poi_id: string;

  language_code: string; // "vi", "en", "ja"...
  name: string;
  description: string | null;

  audio_url: string | null;
  audio_duration_seconds: number | null;
  audio_size_bytes: number | null;
}

export interface POIImage {
  id: string;
  poi_id: string;

  thumbnail_url: string;
  full_image_url: string;

  full_image_size_bytes: number | null;
  caption: string | null;

  display_order: number;
}

export interface Review {
  id: string;
  poi_id: string;
  user_id: string;

  rating: number; // 1..5
  comment: string | null;

  created_at: string;
}

export interface TrackingLog {
  id: string;
  user_id: string | null;
  poi_id: string | null;

  event_type: string;
  language_code: string | null;
  device_info: string | null;

  created_at: string;
}

export interface POIDetail extends POI {
  translation?: POITranslation | null;
  images: POIImage[];
  reviews: Review[];
}
