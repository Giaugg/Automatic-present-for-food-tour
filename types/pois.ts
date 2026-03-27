export interface POITranslation {
  language_code: string;
  name: string;
  description?: string;
  audio_url?: string;
  audio_duration_seconds?: number;
}

export interface POI {
  id: string;
  owner_id?: string;
  latitude: number;
  longitude: number;
  trigger_radius: number;
  thumbnail_url?: string;
  category?: string;
  status: boolean;
  updated_at: string;
}

export interface POIWithTranslation extends POI {
  name: string;
  description?: string;
  audio_url?: string;
}

export interface POIDetail extends POI {
  translations: POITranslation[];
  images: POIImage[];
}

export interface POIImage {
  id: string;
  full_image_url: string;
  thumbnail_url?: string;
  caption?: string;
  display_order: number;
}

export interface CreatePOIDTO {
  latitude: number;
  longitude: number;
  trigger_radius?: number;
  category?: string;
  thumbnail_url?: string;
  owner_id?: string;
  translations: POITranslation[];
}

export interface POIExtended extends POIWithTranslation {
  all_translations?: POITranslation[];
}