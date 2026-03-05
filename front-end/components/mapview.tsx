"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";

// --- Cấu hình Leaflet Marker Icon ---
// Fix lỗi icon marker không hiển thị do đường dẫn tương đối trong Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Custom icon chấm xanh cho vị trí người dùng
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

export default function MapView() {
  // --- States & Refs ---
  const { latitude, longitude, accuracy, isLoading: geoLoading, error, isSupported } = useGeolocation();
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activePoiId, setActivePoiId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 1. Fetch dữ liệu POI từ Backend ---
  useEffect(() => {
    const fetchPois = async () => {
      try {
        const res = await poiApi.getAll('vi'); // Mặc định lấy tiếng Việt
        setPois(res.data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách địa điểm:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchPois();
  }, []);

  // --- 2. Logic Thuyết minh tự động (Geofencing) ---
  useEffect(() => {
    if (latitude && longitude && pois.length > 0) {
      pois.forEach((poi) => {
        // Tính khoảng cách từ người dùng tới từng quán ăn (đơn vị: mét)
        const userLatLng = L.latLng(latitude, longitude);
        const poiLatLng = L.latLng(poi.latitude, poi.longitude);
        const distance = userLatLng.distanceTo(poiLatLng);

        // Nếu đi vào bán kính kích hoạt và chưa phát audio của quán này
        if (distance <= (poi.trigger_radius || 30)) {
          if (activePoiId !== poi.id) {
            setActivePoiId(poi.id);
            if (poi.audio_url && audioRef.current) {
              audioRef.current.src = poi.audio_url;
              audioRef.current.play().catch((e) => 
                console.warn("Trình duyệt chặn tự động phát audio:", e)
              );
            }
          }
        }
      });
    }
  }, [latitude, longitude, pois, activePoiId]);

  // --- 3. Tính toán Center bản đồ ---
  const mapCenter = useMemo<[number, number]>(() => {
    if (latitude && longitude) return [latitude, longitude];
    if (pois.length > 0) {
      return [
        pois.reduce((sum, p) => sum + p.latitude, 0) / pois.length,
        pois.reduce((sum, p) => sum + p.longitude, 0) / pois.length,
      ];
    }
    return [10.762622, 106.660172]; // Tọa độ mặc định (VD: TP.HCM)
  }, [pois, latitude, longitude]);

  if (loadingData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Đang tải bản đồ ẩm thực...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Audio Engine ẩn */}
      <audio ref={audioRef} onEnded={() => setActivePoiId(null)} />

      {/* Thông báo trạng thái GPS */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {!isSupported && (
          <div className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md text-xs font-bold shadow-md">
            GPS không hỗ trợ
          </div>
        )}
        {geoLoading && (
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-bold shadow-md animate-pulse">
            📍 Đang tìm vị trí của bạn...
          </div>
        )}
        {error && (
          <div className="bg-muted text-muted-foreground px-3 py-1.5 rounded-md text-xs shadow-md">
            {error.code === 1 ? "Vui lòng cho phép quyền vị trí" : "Lỗi tín hiệu GPS"}
          </div>
        )}
      </div>

      <MapContainer center={mapCenter} zoom={16} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marker vị trí người dùng & Vòng sai số */}
        {latitude && longitude && (
          <>
            <Circle
              center={[latitude, longitude]}
              radius={accuracy ?? 20}
              pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.1, weight: 1 }}
            />
            <Marker position={[latitude, longitude]} icon={userLocationIcon}>
              <Popup>Bạn đang ở đây</Popup>
            </Marker>
          </>
        )}

        {/* Hiển thị các điểm POI (Quán ăn) */}
        {pois.filter(p => p.status).map((poi) => (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]}>
            <Popup>
              <div className="min-w-[200px] p-1">
                {poi.thumbnail_url && (
                  <img 
                    src={poi.thumbnail_url} 
                    alt={poi.name} 
                    className="w-full h-24 object-cover rounded-md mb-2 shadow-sm"
                  />
                )}
                <h3 className="font-bold text-base text-primary leading-tight">
                  {poi.name}
                </h3>
                <span className="inline-block bg-muted text-[10px] px-2 py-0.5 rounded-full mt-1 mb-2 font-semibold">
                  {poi.category}
                </span>
                <p className="text-sm text-gray-600 line-clamp-3 leading-snug">
                  {poi.description || "Chưa có thông tin thuyết minh cho địa điểm này."}
                </p>
                
                {/* Chỉ báo đang phát thuyết minh */}
                {activePoiId === poi.id && (
                  <div className="mt-3 flex items-center gap-2 bg-green-50 text-green-700 p-2 rounded-md text-xs font-bold animate-bounce">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Đang thuyết minh tự động...
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}