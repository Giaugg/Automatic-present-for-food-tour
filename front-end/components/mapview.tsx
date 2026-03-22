"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Navigation, Headphones, Loader2, Info } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper component xử lý chuyển view map
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
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Fix lỗi Leaflet icon mặc định không hiển thị
  useEffect(() => {
    setIsMounted(true);
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
    } catch (err) {
      console.error("Lỗi tải POIs:", err);
    } finally {
      setLoading(false);
    }
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

  const getFullAudioUrl = (url: string | null) => {
    if (!url) return null;
    // Đảm bảo không bị lặp /uploads nếu URL đã có sẵn
    const path = url.startsWith('/uploads') ? url : `/uploads${url.startsWith('/') ? url : `/${url}`}`;
    const antiCache = `${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`;
    return antiCache.startsWith('http') ? antiCache : `${API_URL}${antiCache}`;
  };

  const currentPos: [number, number] = useManual 
    ? [manualPos.lat, manualPos.lng] 
    : [latitude || 10.7769, longitude || 106.7009];

  // Các icon tùy chỉnh (Nên khai báo trong useEffect hoặc Memo để tránh lỗi SSR)
  const userLocationIcon = isMounted ? L.divIcon({
    className: "user-location-marker",
    html: `<div class="w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full shadow-xl animate-pulse"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  }) : null;

  const foodIcon = isMounted ? L.divIcon({
    className: "food-poi-marker",
    html: `<div class="flex items-center justify-center w-10 h-10 bg-orange-500 rounded-2xl border-2 border-white shadow-lg text-white transform hover:scale-110 transition-all">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    </div>`,
    iconSize: [40, 40], iconAnchor: [20, 40],
  }) : null;

  if (!isMounted || loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4 font-sans">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <div className="font-black text-slate-400 tracking-tighter uppercase text-sm">Initializing System...</div>
    </div>
  );

  return (
    <div className="h-screen w-full relative bg-slate-50 overflow-hidden font-sans">
      {/* Simulator Panel */}
      <div className="absolute top-6 right-6 z-[1000] w-72 bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-2xl border border-white/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400">
            <Navigation size={14} className="text-blue-600"/> Simulator Mode
          </div>
          <input 
            type="checkbox" 
            checked={useManual} 
            onChange={e => setUseManual(e.target.checked)} 
            className="w-10 h-5 appearance-none bg-slate-200 checked:bg-blue-600 rounded-full transition-all relative cursor-pointer after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 peer-checked:after:translate-x-5" 
          />
        </div>
        {useManual && (
          <div className="space-y-3 animate-in fade-in zoom-in-95">
            <div className="p-3 bg-blue-50/50 rounded-2xl text-[10px] font-mono font-bold text-blue-600 border border-blue-100 flex justify-between">
              <span>{manualPos.lat.toFixed(5)}</span>
              <span>{manualPos.lng.toFixed(5)}</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer center={currentPos} zoom={17} className="h-full w-full" zoomControl={false}>
        <ChangeView center={currentPos} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {userLocationIcon && (
          <Marker 
            position={currentPos} 
            icon={userLocationIcon} 
            draggable={useManual} 
            eventHandlers={{ 
              dragend: (e) => setManualPos({lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng}) 
            }} 
          />
        )}

        {pois.map(poi => (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={foodIcon || undefined}>
            <Popup className="custom-popup" minWidth={320}>
              <div className="flex flex-col bg-white overflow-hidden rounded-[2rem] w-80">
                <div className="relative h-44 overflow-hidden">
                  <img src={poi.thumbnail_url || "/default.jpg"} className="w-full h-full object-cover" alt={poi.name} />
                  <span className="absolute top-4 left-4 bg-orange-500 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase shadow-lg border border-white/20">
                    {poi.category}
                  </span>
                </div>
                
                <div className="p-6 bg-white relative">
                  <h3 className="text-xl font-black text-slate-900 uppercase mb-2 leading-none">{poi.name}</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 max-h-32 overflow-y-auto text-[13px] text-slate-600 leading-relaxed scrollbar-hide">
                    {poi.description}
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const url = getFullAudioUrl(poi.audio_url);
                        if (!url) return alert("Chưa có thuyết minh cho ngôn ngữ này!");
                        toggleAudio(poi.id, url);
                      }}
                      className={`flex-1 py-4 rounded-[1.25rem] text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                        ${activeAudioKey === poi.id ? "bg-red-500 text-white" : "bg-slate-900 text-white hover:bg-blue-600"}
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
                          <Headphones size={16} strokeWidth={3}/> 
                          <span>Nghe thuyết minh</span>
                        </>
                      )}
                    </button>
                    <button className="w-14 h-14 bg-white border-2 border-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-400">
                      <Info size={20} strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper { padding: 0; border-radius: 2.5rem; overflow: hidden; border: 1px solid white; }
        .custom-popup .leaflet-popup-content { margin: 0; width: 100% !important; }
        .custom-popup .leaflet-popup-tip-container { display: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}