"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getFileUrl, poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Navigation, Headphones, Loader2, Info, Gauge, Radius } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TRIGGER_RADIUS_KM = 0.03; // Bán kính kích hoạt 50m

// Hàm tính khoảng cách giữa 2 điểm GPS (Km)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapView() {
  const { latitude, longitude } = useGeolocation();
  const { activeAudioKey, toggleAudio } = useAudioPlayer();
  
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [useManual, setUseManual] = useState(false);
  const [manualPos, setManualPos] = useState({ lat: 10.7769, lng: 106.7009 });
  const [moveSpeed, setMoveSpeed] = useState(0.0001);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Thêm vào cùng các useState khác
  const isProcessingAudio = useRef(false);
  // --- STATE TOÀN CỤC CHO LOGIC PHÁT TỰ ĐỘNG ---
  const [targetPoi, setTargetPoi] = useState<POIWithTranslation | null>(null);
  const [minDistance, setMinDistance] = useState<number>(Infinity);

  const getFullAudioUrl = (url: string | null) => {
    if (!url) return null;
    const path = url.startsWith('/uploads') ? url : `/uploads${url.startsWith('/') ? url : `/${url}`}`;
    return `${API_URL}${path}`;
  };

  // --- HÀM XỬ LÝ PHÁT GIỌNG ĐỌC KHI ĐI NGANG QUA ---
const handleProximityAudio = useCallback(async (currentLat: number, currentLng: number) => {
  if (isProcessingAudio.current) return; // Nếu đang bận xử lý play/pause thì đợi

  let closestPoi: POIWithTranslation | null = null;
  let closestDist = Infinity;

  pois.forEach(poi => {
    const dist = getDistance(currentLat, currentLng, poi.latitude, poi.longitude);
    if (dist < TRIGGER_RADIUS_KM && dist < closestDist) {
      closestDist = dist;
      closestPoi = poi;
    }
  });

  if (closestPoi) {
    const poi = closestPoi as POIWithTranslation;
    
    // Chỉ kích hoạt nếu là quán mới và chưa phát audio của quán đó
    if ((!targetPoi || poi.id !== targetPoi.id) && activeAudioKey !== poi.id) {
      const url = getFullAudioUrl(poi.audio_url!);
      if (url) {
        try {
          isProcessingAudio.current = true; // Khóa lại
          console.log(`Auto-trigger: ${poi.name}`);
          
          // Đợi toggleAudio thực hiện xong (giả sử nó trả về Promise)
          await toggleAudio(poi.id, url); 
          
          setTargetPoi(poi);
          setMinDistance(closestDist);
        } catch (err) {
          console.error("Audio Playback Error:", err);
        } finally {
          // Giải phóng khóa sau một khoảng nghỉ ngắn để tránh spam
          setTimeout(() => { isProcessingAudio.current = false; }, 500);
        }
      }
    } else {
      // Cập nhật khoảng cách nếu vẫn là quán cũ
      setMinDistance(closestDist);
    }
  } else {
    if (targetPoi) {
      setTargetPoi(null);
      setMinDistance(Infinity);
    }
  }
}, [pois, targetPoi, activeAudioKey, toggleAudio]);

  // --- LOGIC DI CHUYỂN AWSD ---
  useEffect(() => {
    if (!useManual) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;

      setManualPos(prev => {
        const newPos = { ...prev };
        if (key === 'w') newPos.lat += moveSpeed;
        else if (key === 's') newPos.lat -= moveSpeed;
        else if (key === 'a') newPos.lng -= moveSpeed;
        else if (key === 'd') newPos.lng += moveSpeed;

        // Kích hoạt handle phát giọng đọc ngay khi vị trí thay đổi
        handleProximityAudio(newPos.lat, newPos.lng);
        return newPos;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [useManual, moveSpeed, handleProximityAudio]);

  // --- INITIALIZATION ---
  useEffect(() => {
    setIsMounted(true);
    // Fix Leaflet icons
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const loadPois = useCallback(async () => {
    if (typeof window === "undefined") return;
    const lang = localStorage.getItem("preferred_lang") || "vi-VN";
    try {
      const res = await poiApi.getAll(lang);
      setPois(res.data);
    } catch (err) { console.error("Lỗi tải POIs:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadPois();
      const handleLangChange = () => loadPois();
      window.addEventListener("lang-change", handleLangChange);
      window.addEventListener("storage", handleLangChange);
      return () => {
        window.removeEventListener("lang-change", handleLangChange);
        window.removeEventListener("storage", handleLangChange);
      };
    }
  }, [isMounted, loadPois]);

  const currentPos: [number, number] = useManual 
    ? [manualPos.lat, manualPos.lng] 
    : [latitude || 10.7769, longitude || 106.7009];

  // --- ICONS ---
  const userLocationIcon = isMounted ? L.divIcon({
    className: "user-location-marker",
    html: `<div class="w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full shadow-xl animate-pulse"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  }) : null;

  const foodIcon = isMounted ? L.divIcon({
    className: "food-poi-marker",
    html: `<div class="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-2xl border-2 border-white shadow-lg text-white transform hover:scale-110 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>`,
    iconSize: [40, 40], iconAnchor: [20, 40],
  }) : null;

  if (!isMounted || loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <div className="font-black text-slate-400 tracking-tighter uppercase text-sm">Initializing Voyager...</div>
    </div>
  );

  return (
    <div className="h-screen w-full relative bg-slate-50 overflow-hidden font-sans">
      {/* --- SIMULATOR PANEL --- */}
      <div className="absolute top-6 right-6 z-[1000] w-72 bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl border border-white/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400">
            <Navigation size={14} className="text-blue-600"/> Simulation Mode
          </div>
          <input 
            type="checkbox" 
            checked={useManual} 
            onChange={e => setUseManual(e.target.checked)} 
            className="w-10 h-5 appearance-none bg-slate-200 checked:bg-blue-600 rounded-full transition-all relative cursor-pointer after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 peer-checked:after:translate-x-5" 
          />
        </div>
        
        {useManual && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            {/* Status Card */}
            <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-inner">
               <div className="text-[8px] font-black uppercase text-slate-500 mb-1">Targeting</div>
               <div className="text-xs font-bold truncate">{targetPoi ? targetPoi.name : "Searching..."}</div>
               <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-blue-400">
                  <Radius size={12}/> {targetPoi ? `${(minDistance * 1000).toFixed(0)}m` : "---"}
               </div>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400">
                <div className="flex items-center gap-1"><Gauge size={12}/> Sensitivity</div>
                <span className="text-blue-600">{(moveSpeed * 100000).toFixed(0)}x</span>
              </div>
              <input 
                type="range" min="0.00001" max="0.0005" step="0.00001" 
                value={moveSpeed} 
                onChange={(e) => setMoveSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* --- MAP --- */}
      <MapContainer center={currentPos} zoom={17} className="h-full w-full" zoomControl={false}>
        <ChangeView center={currentPos} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {userLocationIcon && (
          <Marker 
            position={currentPos} 
            icon={userLocationIcon} 
            draggable={useManual} 
            eventHandlers={{ 
              dragend: (e) => {
                const newPos = {lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng};
                setManualPos(newPos);
                handleProximityAudio(newPos.lat, newPos.lng);
              }
            }} 
          />
        )}

        {/* --- HIỂN THỊ POIS & TRIGGER RADIUS --- */}
        {pois.map((poi) => {
          const isTarget = targetPoi?.id === poi.id;

          return (
            <div key={poi.id}>
              {/* Vòng tròn bán kính kích hoạt - Chỉ hiện khi bật Simulator Mode */}
              {useManual && (
                <Circle
                  center={[poi.latitude, poi.longitude]}
                  radius={TRIGGER_RADIUS_KM * 1000} // Đổi sang mét (50m)
                  pathOptions={{
                    fillColor: isTarget ? "#2563eb" : "#94a3b8", // Xanh nếu là mục tiêu, Xám nếu không
                    fillOpacity: isTarget ? 0.25 : 0.1,
                    color: isTarget ? "#2563eb" : "transparent",
                    weight: 1.5,
                    dashArray: "6, 6", // Hiệu ứng nét đứt radar
                  }}
                />
              )}

              {/* Marker của POI */}
              <Marker
                position={[poi.latitude, poi.longitude]}
                icon={foodIcon || undefined}
              >
              <Popup className="custom-popup" minWidth={320}>
                <div className="flex flex-col bg-white overflow-hidden rounded-[2rem] w-80 shadow-2xl">
                  {/* Phần Image Header */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={getFileUrl(poi.thumbnail_url!)} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      alt={poi.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                    
                    {/* Category Badge */}
                    <span className="absolute top-4 left-4 bg-orange-500 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase shadow-lg border border-white/20 backdrop-blur-sm">
                      {poi.category || "Địa điểm"}
                    </span>
                  </div>

                  {/* Nội dung bên dưới */}
                  <div className="p-6 bg-white relative">
                    <h3 className="text-xl font-black text-slate-900 uppercase mb-2 leading-none tracking-tighter">
                      {poi.name}
                    </h3>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 max-h-32 overflow-y-auto text-[13px] text-slate-600 leading-relaxed scrollbar-hide italic">
                      "{poi.description || "Không có mô tả cho địa điểm này."}"
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const url = getFullAudioUrl(poi.audio_url!);
                          if (!url) return toast.error("Chưa có thuyết minh!");
                          toggleAudio(poi.id, url);
                        }}
                        className={`flex-1 py-4 rounded-[1.25rem] text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                          ${
                            activeAudioKey === poi.id
                              ? "bg-red-500 text-white ring-4 ring-red-500/20"
                              : "bg-slate-900 text-white hover:bg-blue-600 shadow-slate-900/20"
                          }
                        `}
                      >
                        {activeAudioKey === poi.id ? (
                          <>
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-1 bg-white animate-[bounce_0.6s_infinite]" />
                              <div className="w-1 bg-white animate-[bounce_0.6s_infinite_0.2s]" />
                              <div className="w-1 bg-white animate-[bounce_0.6s_infinite_0.4s]" />
                            </div>
                            <span>Dừng phát</span>
                          </>
                        ) : (
                          <>
                            <Headphones size={16} strokeWidth={3} />
                            <span>Nghe thuyết minh</span>
                          </>
                        )}
                      </button>
                      
                      <button className="w-14 h-14 bg-white border-2 border-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-100 transition-colors">
                        <Info size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper { padding: 0; border-radius: 2.5rem; overflow: hidden; border: 1px solid white; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .custom-popup .leaflet-popup-content { margin: 0; width: 100% !important; }
        .custom-popup .leaflet-popup-tip-container { display: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}