"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { pois, poiTranslations } from "@/data/poi";
import { useGeolocation } from "@/hooks/useGeolocation";

// Fix lỗi icon marker bị mất trong Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Custom icon cho vị trí GPS (chấm xanh)
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Helper: lấy tên POI theo ngôn ngữ
function getPOIName(poiId: string, lang: string = "vi"): string {
  const translation = poiTranslations.find(
    (t) => t.poi_id === poiId && t.language_code === lang
  );
  return translation?.name ?? "Địa điểm không tên";
}

// Helper: lấy mô tả POI theo ngôn ngữ
function getPOIDescription(poiId: string, lang: string = "vi"): string | null {
  const translation = poiTranslations.find(
    (t) => t.poi_id === poiId && t.language_code === lang
  );
  return translation?.description ?? null;
}

export default function MapView() {
  const { latitude, longitude, accuracy, isLoading, error, isSupported } = useGeolocation();

  // Tính center dựa trên trung bình tọa độ các POIs
  const center: [number, number] = [
    pois.reduce((sum, poi) => sum + poi.latitude, 0) / pois.length,
    pois.reduce((sum, poi) => sum + poi.longitude, 0) / pois.length,
  ];

  return (
    <div className="h-full w-full relative">
      {/* GPS Status indicator */}
      {!isSupported && (
        <div className="absolute top-2 left-2 z-[1000] bg-red-100 text-red-700 px-3 py-1 rounded text-sm">
          GPS không được hỗ trợ
        </div>
      )}
      {isLoading && isSupported && (
        <div className="absolute top-2 left-2 z-[1000] bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Đang lấy vị trí GPS...
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 z-[1000] bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-sm">
          {error.code === 1 ? "Bạn chưa cho phép truy cập vị trí" : "Không thể lấy vị trí GPS"}
        </div>
      )}

      <MapContainer center={center} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hiển thị vị trí GPS của người dùng */}
        {latitude !== null && longitude !== null && (
          <>
            {/* Vòng tròn thể hiện độ chính xác */}
            <Circle
              center={[latitude, longitude]}
              radius={accuracy ?? 50}
              pathOptions={{
                color: "#4285F4",
                fillColor: "#4285F4",
                fillOpacity: 0.15,
                weight: 1,
              }}
            />
            {/* Marker vị trí người dùng */}
            <Marker position={[latitude, longitude]} icon={userLocationIcon}>
              <Popup>
                <div className="text-center">
                  <strong>Vị trí của bạn</strong>
                  <p className="text-xs text-gray-500 mt-1">
                    Độ chính xác: ~{Math.round(accuracy ?? 0)}m
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* POI Markers */}
        {pois
          .filter((poi) => poi.status)
          .map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold text-base">
                    {getPOIName(poi.id)}
                  </h3>
                  {getPOIDescription(poi.id) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {getPOIDescription(poi.id)}
                    </p>
                  )}
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-100 rounded">
                    {poi.category}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
