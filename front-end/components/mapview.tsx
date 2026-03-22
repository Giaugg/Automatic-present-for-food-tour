"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Navigation, RotateCcw, Zap, Utensils, MoveHorizontal } from "lucide-react";

// --- 1. Custom Icons (Sửa Marker quán & User) ---
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div class="w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full shadow-xl ring-4 ring-blue-500/20 animate-pulse"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const foodIcon = L.divIcon({
  className: "food-poi-marker",
  html: `
    <div class="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-2xl border-2 border-white shadow-lg text-white transform hover:scale-110 transition-transform">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// Component hỗ trợ điều khiển camera
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapView() {
  const { latitude, longitude } = useGeolocation();
  
  // --- States ---
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [useManual, setUseManual] = useState(false);
  const [manualPos, setManualPos] = useState({ lat: 10.7769, lng: 106.7009 });
  const [loadingData, setLoadingData] = useState(true);
  const [moveSpeedMult, setMoveSpeedMult] = useState(1); // Tốc độ tùy chỉnh (1x, 2x, 5x...)

  const requestRef = useRef<number>();
  const pressedKeys = useRef<Set<string>>(new Set());
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    if (useManual && latitude && longitude && manualPos.lat === 10.7769) {
      setManualPos({ lat: latitude, lng: longitude });
    }
  }, [useManual, latitude, longitude]);

  useEffect(() => {
    poiApi.getAll('vi').then(res => {
      setPois(res.data);
      setLoadingData(false);
    });
  }, []);

  // --- Logic Di Chuyển WASD ---
  const animate = (time: number) => {
    if (lastUpdateTime.current !== undefined && useManual) {
      const deltaTime = time - lastUpdateTime.current;
      const baseSpeed = 0.0000005; // Giảm xuống một chút để mượt hơn
      const currentSpeed = baseSpeed * deltaTime * moveSpeedMult;

      let dLat = 0, dLng = 0;
      if (pressedKeys.current.has("w")) dLat += currentSpeed;
      if (pressedKeys.current.has("s")) dLat -= currentSpeed;
      if (pressedKeys.current.has("a")) dLng -= currentSpeed;
      if (pressedKeys.current.has("d")) dLng += currentSpeed;

      if (dLat !== 0 || dLng !== 0) {
        setManualPos(prev => ({ lat: prev.lat + dLat, lng: prev.lng + dLng }));
      }
    }
    lastUpdateTime.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [useManual, moveSpeedMult]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => pressedKeys.current.add(e.key.toLowerCase());
    const handleUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  const currentPos: [number, number] = useManual 
    ? [manualPos.lat, manualPos.lng] 
    : [latitude || 10.7769, longitude || 106.7009];

  if (loadingData) return <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">Initializing Voyager Map...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-50">
      
      {/* PANEL ĐIỀU KHIỂN NÂNG CẤP */}
      <div className="absolute top-6 right-6 z-[1000] space-y-3">
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-2xl border border-white w-72">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <Navigation size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-tighter text-slate-800">Simulator Pro</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={useManual} onChange={(e) => setUseManual(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {useManual && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Speed: {moveSpeedMult}x</span>
                  <Zap size={12} className="text-orange-500" />
                </div>
                <input 
                  type="range" min="1" max="20" value={moveSpeedMult} 
                  onChange={(e) => setMoveSpeedMult(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Position (Draggable)</p>
                <p className="text-xs font-mono font-bold text-blue-600">{manualPos.lat.toFixed(6)}, {manualPos.lng.toFixed(6)}</p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                <MoveHorizontal size={14} className="text-blue-500" />
                <span>Kéo marker xanh để dịch chuyển nhanh</span>
              </div>

              <button 
                onClick={() => latitude && longitude && setManualPos({ lat: latitude, lng: longitude })}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                <RotateCcw size={12} /> Sync real location
              </button>
            </div>
          )}
        </div>
      </div>

      <MapContainer center={currentPos} zoom={17} className="h-full w-full" zoomControl={false}>
        <ChangeView center={currentPos} />
        
        {/* Theme Voyager - Đẹp và sáng hơn bản mặc định */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* User Marker với tính năng DRAGGABLE */}
        <Circle center={currentPos} radius={40} pathOptions={{ color: "#3b82f6", fillOpacity: 0.1, weight: 1, dashArray: '5, 10' }} />
        <Marker 
          position={currentPos} 
          icon={userLocationIcon} 
          draggable={useManual}
          zIndexOffset={1000}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              setManualPos({ lat: position.lat, lng: position.lng });
            },
          }}
        >
          <Popup>Bạn đang ở đây</Popup>
        </Marker>

        {/* Quán ăn Marker (Đã sửa icon) */}
        {pois.map((poi) => (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={foodIcon}>
            <Popup className="custom-popup">
               <div className="p-2 text-center">
                  <div className="bg-orange-100 text-orange-600 p-2 rounded-full w-fit mx-auto mb-2">
                    <Utensils size={16} />
                  </div>
                  <div className="font-bold text-slate-800 uppercase text-xs tracking-tight">{poi.name}</div>
                  <button className="mt-3 w-full py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-bold">CHI TIẾT</button>
               </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 1.25rem; padding: 4px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .leaflet-popup-tip { display: none; }
      `}</style>
    </div>
  );
}