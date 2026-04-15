"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// API & Types
import { poiApi, getFileUrl, tourApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Tour } from "@/types/tour";

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
  const router = useRouter();

  // 1. Dữ liệu GPS & Audio từ Hệ thống
  const { latitude, longitude } = useGeolocation();
  const { activeAudioKey, toggleAudio, stopAudio } = useAudioPlayer();

  // 2. State quản lý dữ liệu POIs
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [recentPois, setRecentPois] = useState<POIWithTranslation[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [purchasedTourIds, setPurchasedTourIds] = useState<string[]>([]);
  const [buyingTourId, setBuyingTourId] = useState<string | null>(null);
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState<{
    message: string;
    required?: number;
    currentBalance?: number;
  } | null>(null);

  // 3. Ref để quản lý Marker (Dùng để mở Popup từ Nearby Panel)
  const markerRefs = useRef<{ [key: string]: any }>({});

  // 4. Custom Hook xử lý Logic Giả lập (AWSD + Auto-Audio)
  const sim = useMapSimulation(pois, activeAudioKey, toggleAudio, stopAudio);

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

  const loadTours = useCallback(async () => {
    const lang = localStorage.getItem("preferred_lang") || "vi-VN";
    try {
      const tourRes = await tourApi.getAll(lang, false);
      setTours(tourRes.data || []);

      const token = localStorage.getItem("token");
      if (!token) {
        setPurchasedTourIds([]);
        return;
      }

      try {
        const myPurchaseRes = await tourApi.getMyPurchases(lang);
        const ids = (myPurchaseRes.data || []).map((p) => p.tour_id);
        setPurchasedTourIds(ids);
      } catch (err) {
        // Token có thể hết hạn; không chặn map load.
        setPurchasedTourIds([]);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách tour:", err);
    }
  }, []);

  useEffect(() => {
    if (isMounted) loadPois();
  }, [isMounted, loadPois]);

  useEffect(() => {
    if (isMounted) loadTours();
  }, [isMounted, loadTours]);

  useEffect(() => {
    if (!isMounted || loading) return;
    sim.handleProximityAudio(currentPos[0], currentPos[1]);
  }, [isMounted, loading, currentPos[0], currentPos[1], sim.handleProximityAudio]);

  // --- HÀM XỬ LÝ KHI BẤM VÀO QUÁN ĂN TRÊN PANEL ---
  const handleSelectNearby = (poi: any) => {
    const marker = markerRefs.current[poi.id];
    if (marker) {
      marker.openPopup();
      // Nếu ở chế độ manual, có thể dịch chuyển người dùng tới đó luôn (tùy chọn)
      // sim.setManualPos({ lat: poi.latitude, lng: poi.longitude });
    }
  };

  const nowPlayingPoi = sim.targetPoi;

  useEffect(() => {
    if (!nowPlayingPoi) return;

    setRecentPois((prev: POIWithTranslation[]) => {
      const next = [nowPlayingPoi, ...prev.filter((p: POIWithTranslation) => p.id !== nowPlayingPoi.id)];
      return next.slice(0, 5);
    });
  }, [nowPlayingPoi]);

  useEffect(() => {
    if (nowPlayingPoi) {
      setIsSidebarClosed(false);
    }
  }, [nowPlayingPoi]);

  const isSidebarVisible = !!nowPlayingPoi && !isSidebarClosed;

  const handleOpenPoiPopup = (poi: POIWithTranslation) => {
    const marker = markerRefs.current[poi.id];
    if (marker) {
      marker.openPopup();
    }
  };

  const handleViewPoiDetail = (poiId: string) => {
    router.push(`/map/${poiId}`);
  };

  const handleBuyTour = async (tourId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Vui lòng đăng nhập để mua tour");
      router.push("/login");
      return;
    }

    setInsufficientFundsInfo(null);
    setBuyingTourId(tourId);
    try {
      await tourApi.purchase(tourId);
      setPurchasedTourIds((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
      toast.success("Mua tour thành công");
    } catch (error: any) {
      const responseData = error?.response?.data || {};
      const message = responseData?.message || responseData?.error || "Mua tour thất bại";
      const required = Number(responseData?.required);
      const currentBalance = Number(responseData?.current_balance);

      if (
        String(message).toLowerCase().includes("không đủ") ||
        String(message).toLowerCase().includes("khong du") ||
        Number.isFinite(required) ||
        Number.isFinite(currentBalance)
      ) {
        setInsufficientFundsInfo({
          message,
          required: Number.isFinite(required) ? required : undefined,
          currentBalance: Number.isFinite(currentBalance) ? currentBalance : undefined,
        });
      }

      toast.error(message);
    } finally {
      setBuyingTourId(null);
    }
  };

  const isMobileViewport = isMounted && typeof window !== "undefined" && window.innerWidth < 768;
  const popupOffset: [number, number] = isMobileViewport ? [0, -220] : [0, -170];

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

      {/* TOUR BUY PANEL */}
      <div className="fixed top-[76px] left-4 right-4 md:left-auto md:right-4 md:top-[145px] md:w-[360px] z-[1002] pointer-events-auto">
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl border border-white/70 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50">
            <p className="text-[11px] font-black tracking-widest uppercase text-slate-500">Tour Store</p>
            <h3 className="text-base font-black text-slate-800">Mua tour ngay tren ban do</h3>
          </div>

          {insufficientFundsInfo && (
            <div className="mx-3 mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">{insufficientFundsInfo.message}</p>
              {(typeof insufficientFundsInfo.required === "number" || typeof insufficientFundsInfo.currentBalance === "number") && (
                <p className="mt-1 text-[11px] text-amber-700">
                  Can: {Number(insufficientFundsInfo.required || 0).toLocaleString("vi-VN")}d | Hien co: {Number(insufficientFundsInfo.currentBalance || 0).toLocaleString("vi-VN")}d
                </p>
              )}
              <button
                onClick={() => router.push("/wallet")}
                className="mt-2 inline-flex items-center rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-amber-500"
              >
                Nap tien ngay
              </button>
            </div>
          )}

          <div className="max-h-[34vh] md:max-h-[42vh] overflow-y-auto p-3 space-y-2 scrollbar-hide">
            {tours.length === 0 && (
              <p className="text-sm text-slate-500 px-2 py-3">Chua co tour dang mo ban.</p>
            )}

            {tours.map((tour) => {
              const isPurchased = purchasedTourIds.includes(tour.id);
              const isBuying = buyingTourId === tour.id;

              return (
                <div key={tour.id} className="rounded-2xl border border-slate-100 bg-white p-3 flex items-start gap-3">
                  <img
                    src={getFileUrl(tour.thumbnail_url || null)}
                    alt={tour.title || "tour-thumbnail"}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-100"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{tour.title || "Tour khong ten"}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{tour.summary || "Khong co mo ta"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-emerald-700">
                        {Number(tour.price || 0).toLocaleString("vi-VN")}d
                      </span>

                      <button
                        onClick={() => handleBuyTour(tour.id)}
                        disabled={isPurchased || isBuying}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                          isPurchased
                            ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        } ${isBuying ? "opacity-60 cursor-wait" : ""}`}
                      >
                        {isPurchased ? "Da mua" : isBuying ? "Dang mua..." : "Mua tour"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!isSidebarVisible && nowPlayingPoi && (
        <button
          onClick={() => setIsSidebarClosed(false)}
          className="fixed z-[1006] left-4 top-20 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xl"
        >
          Mo thong tin quán
        </button>
      )}

      {/* SLIDEBAR ĐANG PHÁT: xuất hiện khi user đi vào trigger audio */}
      <aside
        className={`fixed z-[1006] bg-white/95 backdrop-blur-xl border-r border-white/70 shadow-2xl transition-all duration-500 ease-out
          top-0 left-0 h-full w-[340px]
          ${isSidebarVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-widest">Dang phat thuyet minh</p>
            <button
              onClick={() => setIsSidebarClosed(true)}
              className="ml-auto text-xs font-bold bg-white/20 px-2 py-1 rounded-lg"
            >
              Dong
            </button>
          </div>

          {nowPlayingPoi ? (
            <div className="p-4 overflow-y-auto space-y-4">
              <img
                src={getFileUrl(nowPlayingPoi.thumbnail_url || null)}
                alt={nowPlayingPoi.name}
                className="w-full h-40 rounded-2xl object-cover border border-slate-200"
              />

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                  {nowPlayingPoi.name}
                </h3>
                <div className="inline-flex px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold uppercase border border-orange-100">
                  {nowPlayingPoi.category || "food"}
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {nowPlayingPoi.description || "Dang phat audio mo ta dia diem nay."}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
                  <p className="text-slate-400 uppercase font-bold text-[9px]">Khoang cach</p>
                  <p className="font-black text-slate-800">
                    {Number.isFinite(sim.minDistance) ? `${Math.round(sim.minDistance * 1000)} m` : "---"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
                  <p className="text-slate-400 uppercase font-bold text-[9px]">Toa do</p>
                  <p className="font-mono text-[10px] text-slate-700 truncate">
                    {nowPlayingPoi.latitude.toFixed(5)}, {nowPlayingPoi.longitude.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpenPoiPopup(nowPlayingPoi)}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                  Mo popup
                </button>
                <button
                  onClick={() => handleViewPoiDetail(nowPlayingPoi.id)}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  Xem chi tiet
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">POI da di qua gan day</p>
                <div className="space-y-2">
                  {recentPois.map((poi) => (
                    <button
                      key={poi.id}
                      onClick={() => handleOpenPoiPopup(poi)}
                      className="w-full text-left p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-200"
                    >
                      <p className="text-xs font-bold text-slate-800 truncate">{poi.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{poi.category || "food"}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm px-6 text-center">
              Chua co dia diem nao dang phat audio.
            </div>
          )}
        </div>
      </aside>

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
                  radius={(poi as any).trigger_radius_meters || 30}
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
                <Popup
                  className="custom-popup"
                  minWidth={isMobileViewport ? 260 : 300}
                  maxWidth={320}
                  offset={popupOffset}
                  autoPanPaddingBottomRight={[24, 280]}
                  autoPanPaddingTopLeft={[24, 24]}
                >
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
        .custom-popup .leaflet-popup-close-button { top: 8px; right: 8px; color: #334155; }
        
        /* Tối ưu hóa vùng chạm trên mobile */
        @media (max-width: 768px) {
          .leaflet-marker-icon { cursor: pointer; }
          .custom-popup { margin-bottom: 210px; }
          .custom-popup .leaflet-popup-content-wrapper { border-radius: 1.25rem; }
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}