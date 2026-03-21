"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useState, useEffect, useRef } from "react";
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

export default function MapView() {
  const { latitude, longitude, accuracy, isLoading, error, isSupported } = useGeolocation();
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  const [useManual, setUseManual] = useState<boolean>(false);
  const [initialLat, setInitialLat] = useState<number | null>(null);
  const [initialLng, setInitialLng] = useState<number | null>(null);

  // Lưu vị trí ban đầu khi bật chế độ giả lập
  useEffect(() => {
    if (useManual && initialLat === null && initialLng === null) {
      if (latitude !== null && longitude !== null) {
        setInitialLat(latitude);
        setInitialLng(longitude);
        setManualLat(latitude.toString());
        setManualLng(longitude.toString());
      }
    }
  }, [useManual, latitude, longitude, initialLat, initialLng]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Xử lý di chuyển bằng phím W/A/S/D (cho phép đi chéo và giữ nhiều phím)
  useEffect(() => {
    if (!useManual) return;
    const step = 0.00005; // Giảm tốc độ di chuyển (chậm hơn)
    const move = () => {
      // Xác định số hướng đang giữ
      const vertical = ["w", "s"].filter(k => pressedKeysRef.current.has(k)).length;
      const horizontal = ["a", "d"].filter(k => pressedKeysRef.current.has(k)).length;
      const totalDirections = vertical + horizontal;
      // Nếu đi chéo, chuẩn hóa bước
      const normStep = totalDirections === 2 ? step / Math.sqrt(2) : step;
      setManualLat((prevLat) => {
        let lat = parseFloat(prevLat);
        if (pressedKeysRef.current.has("w")) lat += normStep;
        if (pressedKeysRef.current.has("s")) lat -= normStep;
        return lat.toString();
      });
      setManualLng((prevLng) => {
        let lng = parseFloat(prevLng);
        if (pressedKeysRef.current.has("a")) lng -= normStep;
        if (pressedKeysRef.current.has("d")) lng += normStep;
        return lng.toString();
      });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!useManual) return;
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        pressedKeysRef.current.add(key);
        if (!intervalRef.current) {
          intervalRef.current = setInterval(move, 30);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeysRef.current.delete(key);
      if (pressedKeysRef.current.size === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      pressedKeysRef.current.clear();
    };
  }, [useManual]);

  // Hàm di chuyển mượt mà cho nút bấm (cho phép đi chéo)
  const moveSmooth = (direction: string) => {
    if (!useManual) return;
    pressedKeysRef.current.add(direction);
    const step = 0.00005;
    const move = () => {
      const vertical = ["w", "s"].filter(k => pressedKeysRef.current.has(k)).length;
      const horizontal = ["a", "d"].filter(k => pressedKeysRef.current.has(k)).length;
      const totalDirections = vertical + horizontal;
      const normStep = totalDirections === 2 ? step / Math.sqrt(2) : step;
      setManualLat((prevLat) => {
        let lat = parseFloat(prevLat);
        if (pressedKeysRef.current.has("w")) lat += normStep;
        if (pressedKeysRef.current.has("s")) lat -= normStep;
        return lat.toString();
      });
      setManualLng((prevLng) => {
        let lng = parseFloat(prevLng);
        if (pressedKeysRef.current.has("a")) lng -= normStep;
        if (pressedKeysRef.current.has("d")) lng += normStep;
        return lng.toString();
      });
    };
    if (!intervalRef.current) {
      intervalRef.current = setInterval(move, 30);
    }
  };

  const stopMoveSmooth = (direction?: string) => {
    if (direction) pressedKeysRef.current.delete(direction);
    if (pressedKeysRef.current.size === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

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

  // Vị trí hiển thị trên bản đồ
  const displayLat = useManual && manualLat ? parseFloat(manualLat) : latitude;
  const displayLng = useManual && manualLng ? parseFloat(manualLng) : longitude;
  const displayAccuracy = useManual ? 30 : accuracy; // Độ chính xác giả lập

  return (
    <div className="h-full w-full relative">
      {/* Form nhập tọa độ thủ công và nút di chuyển */}
      <div className="fixed top-20 right-4 z-10000 bg-white p-3 rounded shadow flex flex-col gap-2 w-72 border border-blue-300">
        <label className="font-semibold">Giả lập vị trí GPS</label>
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={manualLat}
          onChange={e => setManualLat(e.target.value)}
          className="border p-1 rounded"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={manualLng}
          onChange={e => setManualLng(e.target.value)}
          className="border p-1 rounded"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useManual}
            onChange={e => setUseManual(e.target.checked)}
            id="useManual"
          />
          <label htmlFor="useManual">Dùng tọa độ thủ công</label>
        </div>
        {/* Nút di chuyển W/A/S/D */}
        {useManual && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-center gap-2">
              <button onMouseDown={() => moveSmooth("w")}
                      onMouseUp={() => stopMoveSmooth("w")}
                      onTouchStart={() => moveSmooth("w")}
                      onTouchEnd={() => stopMoveSmooth("w")}
                      className="px-2 py-1 bg-blue-100 rounded">W</button>
            </div>
            <div className="flex justify-center gap-2">
              <button onMouseDown={() => moveSmooth("a")}
                      onMouseUp={() => stopMoveSmooth("a")}
                      onTouchStart={() => moveSmooth("a")}
                      onTouchEnd={() => stopMoveSmooth("a")}
                      className="px-2 py-1 bg-blue-100 rounded">A</button>
              <button onMouseDown={() => moveSmooth("s")}
                      onMouseUp={() => stopMoveSmooth("s")}
                      onTouchStart={() => moveSmooth("s")}
                      onTouchEnd={() => stopMoveSmooth("s")}
                      className="px-2 py-1 bg-blue-100 rounded">S</button>
              <button onMouseDown={() => moveSmooth("d")}
                      onMouseUp={() => stopMoveSmooth("d")}
                      onTouchStart={() => moveSmooth("d")}
                      onTouchEnd={() => stopMoveSmooth("d")}
                      className="px-2 py-1 bg-blue-100 rounded">D</button>
            </div>
            <button
              onClick={() => {
                if (initialLat !== null && initialLng !== null) {
                  setManualLat(initialLat.toString());
                  setManualLng(initialLng.toString());
                } else if (latitude !== null && longitude !== null) {
                  setManualLat(latitude.toString());
                  setManualLng(longitude.toString());
                } else {
                  setManualLat(center[0].toString());
                  setManualLng(center[1].toString());
                }
              }}
              className="mt-2 px-2 py-1 bg-gray-200 rounded"
            >Khôi phục vị trí ban đầu</button>
          </div>
        )}
      </div>
      {/* Bản đồ */}
      {/* GPS Status indicator */}
      {!isSupported && (
        <div className="absolute top-2 left-2 z-1000 bg-destructive/10 text-destructive px-3 py-1 rounded text-sm">
          GPS không được hỗ trợ
        </div>
      )}
      {isLoading && isSupported && (
        <div className="absolute top-2 left-2 z-1000 bg-primary/10 text-primary px-3 py-1 rounded text-sm flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Đang lấy vị trí GPS...
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 z-1000 bg-muted text-muted-foreground px-3 py-1 rounded text-sm">
          {error.code === 1 ? "Bạn chưa cho phép truy cập vị trí" : "Không thể lấy vị trí GPS"}
        </div>
      )}

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

        {/* Hiển thị vị trí GPS của người dùng (ưu tiên tọa độ thủ công nếu có) */}
        {displayLat !== null && displayLng !== null && (
          <>
            <Circle
              center={[displayLat, displayLng]}
              radius={displayAccuracy ?? 30}
              pathOptions={{
                color: "#4285F4",
                fillColor: "#4285F4",
                fillOpacity: 0.15,
                weight: 1,
              }}
            />
            {/* Marker vị trí người dùng */}
            <Marker position={[displayLat, displayLng]} icon={userLocationIcon}>
              <Popup>
                <div className="text-center">
                  <strong>Vị trí của bạn (giả lập)</strong>
                  <p className="text-xs text-muted-foreground mt-1">
                    Độ chính xác: ~{Math.round(displayAccuracy ?? 0)}m
                  </p>
                </div>
              </Popup>
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