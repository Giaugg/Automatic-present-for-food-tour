"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { pois, poiTranslations } from "@/data/poi";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useState, useEffect, useRef } from "react";

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

  // Tính center dựa trên trung bình tọa độ các POIs
  const center: [number, number] = [
    pois.reduce((sum, poi) => sum + poi.latitude, 0) / pois.length,
    pois.reduce((sum, poi) => sum + poi.longitude, 0) / pois.length,
  ];

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

      <MapContainer center={center} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hiển thị vị trí GPS của người dùng (ưu tiên tọa độ thủ công nếu có) */}
        {displayLat !== null && displayLng !== null && (
          <>
            {/* Vòng tròn thể hiện độ chính xác */}
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

        {/* POI Markers */}
        {pois
          .filter((poi) => poi.status)
          .map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
            >
              <Popup>
                <div className="min-w-50">
                  <h3 className="font-semibold text-base">
                    {getPOIName(poi.id)}
                  </h3>
                  {getPOIDescription(poi.id) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getPOIDescription(poi.id)}
                    </p>
                  )}
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-muted rounded">
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
