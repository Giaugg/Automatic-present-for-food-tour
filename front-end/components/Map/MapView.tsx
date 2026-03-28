"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// API & Types
import { poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";

// Hooks & Utils
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useMapSimulation } from "./useMapSimulation";
import { useNearbyPois } from "./useNearbyPois";

// Components
import { Loader2 } from "lucide-react";
import MapPopup from "./MapPopup";
import SimulatorPanel from "./SimulatorPanel";
import NearbyPanel from "./NearbyPanel";

// --- SUB-COMPONENT: ĐIỀU KHIỂN CAMERA ---
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapView() {
  // 1. Dữ liệu GPS & Audio từ Hệ thống
  const { latitude, longitude } = useGeolocation();
  const { activeAudioKey, toggleAudio } = useAudioPlayer();

  // 2. State quản lý dữ liệu POIs
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 3. Ref để quản lý Marker (Dùng để mở Popup từ Nearby Panel)
  const markerRefs = useRef<{ [key: string]: any }>({});

  // 4. Custom Hook xử lý Logic Giả lập (AWSD + Auto-Audio)
  const sim = useMapSimulation(pois, activeAudioKey, toggleAudio);

  // 5. Custom Hook xử lý Logic Tìm quán ăn gần đây (Refresh khi di chuyển)
  const currentPos: [number, number] = sim.useManual 
    ? [sim.manualPos.lat, sim.manualPos.lng] 
    : [latitude || 10.7769, longitude || 106.7009];
    
  const nearbyItems = useNearbyPois(pois, currentPos[0], currentPos[1]);

  // --- HÀM KHỞI TẠO ---
  useEffect(() => {
    setIsMounted(true);
    // Fix lỗi Icon Marker của Leaflet trong Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const loadPois = useCallback(async () => {
    const lang = localStorage.getItem("preferred_lang") || "vi-VN";
    try {
      const res = await poiApi.getAll(lang);
      setPois(res.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu bản đồ:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) loadPois();
  }, [isMounted, loadPois]);

  // --- HÀM XỬ LÝ KHI BẤM VÀO QUÁN ĂN TRÊN PANEL ---
  const handleSelectNearby = (poi: any) => {
    const marker = markerRefs.current[poi.id];
    if (marker) {
      marker.openPopup();
      // Nếu ở chế độ manual, có thể dịch chuyển người dùng tới đó luôn (tùy chọn)
      // sim.setManualPos({ lat: poi.latitude, lng: poi.longitude });
    }
  };

  // --- GIAO DIỆN LOADING ---
  if (!isMounted || loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <div className="font-black text-slate-400 tracking-tighter uppercase text-sm">
        Initializing Voyager Map...
      </div>
    </div>
  );

return (
    <div className="h-[100dvh] w-full relative bg-slate-100 overflow-hidden font-sans flex flex-col md:block">
      
      {/* 1. MOBILE HEADER (Chỉ hiện trên điện thoại) */}
      <div className="md:hidden bg-white/90 backdrop-blur-md px-4 py-3 z-[1001] border-b flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-blue-600 leading-none">Voyager</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Smart Tour Guide</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => sim.setUseManual(!sim.useManual)}
            className={`p-2 rounded-full transition-colors ${sim.useManual ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        </div>
      </div>

      {/* 2. SIMULATOR PANEL (Desktop: Góc phải | Mobile: Thu gọn lên trên) */}
      <div className="absolute top-20 right-4 z-[1000] md:top-4 md:right-4 pointer-events-auto">
        <div className={`${!sim.useManual && 'opacity-50 md:opacity-100'} transition-opacity`}>
          <SimulatorPanel 
            useManual={sim.useManual} 
            setUseManual={sim.setUseManual}
            targetPoi={sim.targetPoi} 
            minDistance={sim.minDistance}
            moveSpeed={sim.moveSpeed} 
            setMoveSpeed={sim.setMoveSpeed}
          />
        </div>
      </div>

      {/* 3. NEARBY PANEL (Mobile: Vuốt từ dưới lên | Desktop: Cố định bên trái) */}
      <div className="fixed bottom-0 left-0 right-0 z-[1005] md:absolute md:top-4 md:left-4 md:bottom-auto md:right-auto md:w-[340px] pointer-events-none">
        <div className="pointer-events-auto bg-white md:bg-transparent rounded-t-3xl md:rounded-none shadow-[0_-10px_30px_rgba(0,0,0,0.1)] md:shadow-none">
          {/* Thanh nắm kéo giả cho Mobile */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 md:hidden"></div>
          
          <div className="max-h-[35vh] md:max-h-[85vh] overflow-y-auto scrollbar-hide px-4 pb-6 md:p-0">
            <NearbyPanel 
              items={nearbyItems} 
              onSelect={handleSelectNearby} 
            />
          </div>
        </div>
      </div>

      {/* 4. MAP CONTAINER */}
      <div className="flex-1 md:h-full w-full relative z-0">
        <MapContainer 
          center={currentPos} 
          zoom={17} 
          className="h-full w-full" 
          zoomControl={false}
          attributionControl={false} // Tắt để đỡ rối trên mobile
        >
          <ChangeView center={currentPos} />
          
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          />
          
          {/* User Marker */}
          <Marker 
            position={currentPos} 
            icon={L.divIcon({
              className: "user-marker-top",
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
                  <div class="relative w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full shadow-lg"></div>
                </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}
            draggable={sim.useManual}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                sim.setManualPos({ lat, lng });
                sim.handleProximityAudio(lat, lng);
              }
            }}
          />

          {/* POI Markers */}
          {pois.map((poi) => (
            <div key={poi.id}>
              {sim.useManual && (
                <Circle
                  center={[poi.latitude, poi.longitude]}
                  radius={30}
                  pathOptions={{
                    fillColor: sim.targetPoi?.id === poi.id ? "#2563eb" : "#94a3b8",
                    fillOpacity: 0.1,
                    color: sim.targetPoi?.id === poi.id ? "#2563eb" : "transparent",
                    weight: 1,
                    dashArray: "5, 10"
                  }}
                />
              )}

              <Marker
                position={[poi.latitude, poi.longitude]}
                ref={(el) => { if (el) markerRefs.current[poi.id] = el; }}
                icon={L.divIcon({
                  className: "poi-marker",
                  html: `
                    <div class="group relative flex items-center justify-center">
                      <div class="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white border-2 border-white shadow-xl active:scale-95 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      </div>
                    </div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 40]
                })}
              >
                <Popup className="custom-popup" minWidth={window?.innerWidth < 768 ? 280 : 320}>
                  <MapPopup 
                    poi={poi} 
                    activeAudioKey={activeAudioKey} 
                    toggleAudio={toggleAudio} 
                  />
                </Popup>
              </Marker>
            </div>
          ))}
        </MapContainer>
      </div>

      {/* 5. GLOBAL STYLES (Dùng cho Leaflet) */}
      <style jsx global>{`
        /* Ẩn logo Leaflet cho sạch */
        .leaflet-bottom.leaflet-right { display: none; }
        
        .custom-popup .leaflet-popup-content-wrapper { 
          padding: 0; 
          border-radius: 1.5rem; 
          overflow: hidden; 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          border: none;
        }
        
        .custom-popup .leaflet-popup-content { margin: 0; width: 100% !important; }
        .custom-popup .leaflet-popup-tip-container { display: none; }
        
        /* Tối ưu hóa vùng chạm trên mobile */
        @media (max-width: 768px) {
          .leaflet-marker-icon { cursor: pointer; }
          .custom-popup { margin-bottom: 25px; }
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}