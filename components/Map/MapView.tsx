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
    <div className="h-screen w-full relative bg-slate-100 overflow-hidden font-sans">
      
      {/* 1. Panel Giả lập (Góc phải) */}
      <SimulatorPanel 
        useManual={sim.useManual} 
        setUseManual={sim.setUseManual}
        targetPoi={sim.targetPoi} 
        minDistance={sim.minDistance}
        moveSpeed={sim.moveSpeed} 
        setMoveSpeed={sim.setMoveSpeed}
      />

      {/* 2. Panel Quán ăn gần đây (Góc trái) */}
      <NearbyPanel 
        items={nearbyItems} 
        onSelect={handleSelectNearby} 
      />

      {/* 3. Bản đồ Leaflet */}
      <MapContainer 
        center={currentPos} 
        zoom={17} 
        className="h-full w-full z-0" 
        zoomControl={false}
      >
        <ChangeView center={currentPos} />
        
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Marker Người dùng (Màu xanh) */}
        <Marker 
          position={currentPos} 
          icon={L.divIcon({
            className: "user-marker",
            html: `<div class="w-7 h-7 bg-blue-600 border-[4px] border-white rounded-full shadow-2xl animate-pulse"></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
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

        {/* Hiển thị danh sách Địa điểm (POIs) */}
        {pois.map((poi) => (
          <div key={poi.id}>
            {/* Radar Radius (Chỉ hiện khi giả lập) */}
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

            {/* Marker Quán ăn / Địa điểm */}
            <Marker
              position={[poi.latitude, poi.longitude]}
              ref={(el) => { if (el) markerRefs.current[poi.id] = el; }} // QUAN TRỌNG: Lưu ref để mở popup từ xa
              icon={L.divIcon({
                className: "poi-marker",
                html: `<div class="w-10 h-10 bg-orange-500 rounded-[1.25rem] flex items-center justify-center text-white border-2 border-white shadow-xl transform hover:scale-110 transition-all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
              })}
            >
              <Popup className="custom-popup" minWidth={320}>
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

      {/* Style tùy chỉnh cho Leaflet Popup */}
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper { 
          padding: 0; 
          border-radius: 2.5rem; 
          overflow: hidden; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid white;
        }
        .custom-popup .leaflet-popup-content { 
          margin: 0; 
          width: 100% !important; 
        }
        .custom-popup .leaflet-popup-tip-container { 
          display: none; 
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}