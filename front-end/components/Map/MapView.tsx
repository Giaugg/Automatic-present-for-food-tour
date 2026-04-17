"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// API & Types
import { poiApi, getFileUrl, tourApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Tour, TourPurchase } from "@/types/tour";

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

function BindMapRef({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (from: [number, number], to: [number, number]) => {
  const earthRadius = 6371000;
  const dLat = toRadians(to[0] - from[0]);
  const dLon = toRadians(to[1] - from[1]);
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const getRelativeDirection = (from: [number, number], to: [number, number]) => {
  const dLat = to[0] - from[0];
  const dLon = to[1] - from[1];

  // Chia 8 hướng tương đối theo trục bản đồ (Bắc ở phía trên).
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return { arrow: "↑", label: "Phia truoc" };
  if (normalized < 67.5) return { arrow: "↗", label: "Chech phai phia truoc" };
  if (normalized < 112.5) return { arrow: "→", label: "Ben phai" };
  if (normalized < 157.5) return { arrow: "↘", label: "Chech phai phia sau" };
  if (normalized < 202.5) return { arrow: "↓", label: "Phia sau" };
  if (normalized < 247.5) return { arrow: "↙", label: "Chech trai phia sau" };
  if (normalized < 292.5) return { arrow: "←", label: "Ben trai" };
  return { arrow: "↖", label: "Chech trai phia truoc" };
};

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
  const [purchaseMapByTourId, setPurchaseMapByTourId] = useState<Record<string, TourPurchase>>({});
  const [buyingTourId, setBuyingTourId] = useState<string | null>(null);
  const [insufficientFundsInfo, setInsufficientFundsInfo] = useState<{
    message: string;
    required?: number;
    currentBalance?: number;
  } | null>(null);
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [activeTourStops, setActiveTourStops] = useState<Array<any>>([]);
  const [activeTourStepIndex, setActiveTourStepIndex] = useState(0);
  const [startingTourId, setStartingTourId] = useState<string | null>(null);
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [isTourStoreOpen, setIsTourStoreOpen] = useState(false);
  const [tourRouteCoords, setTourRouteCoords] = useState<Array<[number, number]>>([]);

  // 3. Ref để quản lý Marker (Dùng để mở Popup từ Nearby Panel)
  const markerRefs = useRef<{ [key: string]: any }>({});
  const mapRef = useRef<L.Map | null>(null);
  const lastRouteFetchRef = useRef<{ from: [number, number]; poiId: string } | null>(null);

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
        const purchases = myPurchaseRes.data || [];
        const ids = purchases.map((p) => p.tour_id);
        const mapByTour: Record<string, TourPurchase> = {};
        purchases.forEach((p) => {
          mapByTour[p.tour_id] = p;
        });

        setPurchasedTourIds(ids);
        setPurchaseMapByTourId(mapByTour);
      } catch (err) {
        // Token có thể hết hạn; không chặn map load.
        setPurchasedTourIds([]);
        setPurchaseMapByTourId({});
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

  const focusPoiOnMap = useCallback((poiId: string) => {
    const marker = markerRefs.current[poiId];
    if (marker) {
      marker.openPopup();
      const { lat, lng } = marker.getLatLng();
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 18, { animate: true });
      }
    }
  }, []);

  const handleStartTour = async (tourId: string) => {
    const purchase = purchaseMapByTourId[tourId];
    if (!purchase) {
      toast.error("Bạn cần mua tour trước khi bắt đầu");
      return;
    }

    setStartingTourId(tourId);
    try {
      const lang = localStorage.getItem("preferred_lang") || "vi-VN";
      const res = await tourApi.getDetails(tourId, lang);
      const stops = (res.data?.stops || []).slice().sort((a: any, b: any) => a.step_order - b.step_order);

      if (!stops.length) {
        toast.error("Tour này chưa có lộ trình điểm dừng");
        return;
      }

      setActiveTourId(tourId);
      setActiveTourStops(stops);
      setActivePurchaseId(purchase.purchase_id);
      setIsTourStoreOpen(false);

      const savedProgress = Number(purchase.progress_step || 0);
      const startIndex = Math.max(0, Math.min(stops.length - 1, savedProgress > 0 ? savedProgress - 1 : 0));
      setActiveTourStepIndex(startIndex);
      toast.success("Đã bắt đầu tour");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Không thể bắt đầu tour");
    } finally {
      setStartingTourId(null);
    }
  };

  const handleEndTourGuide = () => {
    setActiveTourId(null);
    setActivePurchaseId(null);
    setActiveTourStops([]);
    setActiveTourStepIndex(0);
    setIsTourStoreOpen(true);
    setTourRouteCoords([]);
    lastRouteFetchRef.current = null;
    toast.success("Đã kết thúc chế độ dẫn tour");
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
      const purchaseRes = await tourApi.purchase(tourId);
      setPurchasedTourIds((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));
      setPurchaseMapByTourId((prev) => ({
        ...prev,
        [tourId]: {
          purchase_id: purchaseRes.data.purchase.id,
          tour_id: tourId,
          purchase_price: tours.find((t) => t.id === tourId)?.price || 0,
          status: "paid",
          progress_step: 0,
          total_steps: 0,
          purchased_at: purchaseRes.data.purchase.purchased_at,
          title: tours.find((t) => t.id === tourId)?.title,
          summary: tours.find((t) => t.id === tourId)?.summary,
          thumbnail_url: tours.find((t) => t.id === tourId)?.thumbnail_url,
          is_active: true,
        },
      }));
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
  const popupWidth = isMobileViewport ? 253 : 374;
  const popupOffset: [number, number] = isMobileViewport ? [0, -210] : [0, -180];
  const activeTour = tours.find((t) => t.id === activeTourId) || null;
  const isTourGuideMode = !!activeTourId;
  const activeStep = activeTourStops[activeTourStepIndex] || null;
  const canGoPrevStep = activeTourStepIndex > 0;
  const canGoNextStep = activeTourStepIndex < activeTourStops.length - 1;

  const goToStep = async (nextIndex: number) => {
    const stop = activeTourStops[nextIndex];
    if (!stop) return;

    if (activePurchaseId) {
      try {
        await tourApi.updateMyPurchaseProgress(activePurchaseId, nextIndex + 1);
        if (activeTourId) {
          setPurchaseMapByTourId((prev) => {
            const existing = prev[activeTourId];
            if (!existing) return prev;
            return {
              ...prev,
              [activeTourId]: {
                ...existing,
                progress_step: nextIndex + 1,
                status: nextIndex + 1 >= activeTourStops.length ? "completed" : existing.status,
              },
            };
          });
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.response?.data?.error || "Không lưu được tiến độ tour");
      }
    }

    setActiveTourStepIndex(nextIndex);
  };

  const activeStepDistanceMeters = activeStep
    ? calculateDistanceMeters(currentPos, [activeStep.latitude, activeStep.longitude])
    : null;

  const activeStepDirection = activeStep
    ? getRelativeDirection(currentPos, [activeStep.latitude, activeStep.longitude])
    : null;

  // Vẽ tuyến đường ngắn nhất tới POI kế tiếp trong chế độ dẫn tour.
  useEffect(() => {
    if (!isTourGuideMode || !activeStep) {
      setTourRouteCoords([]);
      lastRouteFetchRef.current = null;
      return;
    }

    const destination: [number, number] = [activeStep.latitude, activeStep.longitude];
    const last = lastRouteFetchRef.current;

    if (
      last &&
      last.poiId === String(activeStep.poi_id || "") &&
      calculateDistanceMeters(last.from, currentPos) < 15
    ) {
      return;
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentPos[1]},${currentPos[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&alternatives=true&steps=false`;
        const response = await fetch(osrmUrl, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`OSRM status ${response.status}`);
        }

        const data = await response.json();
        type OsrmRoute = {
          distance?: number;
          geometry?: {
            coordinates?: Array<[number, number]>;
          };
        };
        const routes: OsrmRoute[] = Array.isArray(data?.routes) ? data.routes : [];
        const bestRoute = routes.reduce<OsrmRoute | null>((best, route) => {
          if (!best) return route;
          return Number(route?.distance || Number.MAX_SAFE_INTEGER) < Number(best?.distance || Number.MAX_SAFE_INTEGER)
            ? route
            : best;
        }, null);
        const geometry = bestRoute?.geometry?.coordinates;

        if (Array.isArray(geometry) && geometry.length >= 2) {
          const route = geometry.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
          setTourRouteCoords(route);
          lastRouteFetchRef.current = {
            from: [currentPos[0], currentPos[1]],
            poiId: String(activeStep.poi_id || ""),
          };
          return;
        }

        throw new Error("No route geometry");
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        // Fallback đường thẳng khi API định tuyến không khả dụng.
        setTourRouteCoords([
          [currentPos[0], currentPos[1]],
          destination,
        ]);
        lastRouteFetchRef.current = {
          from: [currentPos[0], currentPos[1]],
          poiId: String(activeStep.poi_id || ""),
        };
      }
    }, 250);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [isTourGuideMode, activeStep, currentPos]);

  // --- GIAO DIỆN LOADING ---
  if (!isMounted || loading) return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <div className="font-black text-slate-400 tracking-tighter uppercase text-sm">
        Initializing Voyager Map...
      </div>
    </div>
  );

return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden font-sans flex flex-col md:block">
      
      {/* 1. MOBILE HEADER (Chỉ hiện trên điện thoại) */}
      <div className="md:hidden bg-white/90 backdrop-blur-md px-4 py-3 z-[901] border-b flex justify-between items-center shadow-sm">
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
      <div className="hidden md:block absolute top-20 right-4 z-[908] md:top-2 md:right-4 pointer-events-auto">
        <div className={`${!sim.useManual && 'opacity-50 md:opacity-50'} transition-opacity`}>
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

      {isMobileViewport && !isTourGuideMode && (
        <button
          onClick={() => setIsTourStoreOpen((prev) => !prev)}
          className="fixed right-4 bottom-[190px] z-[904] px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xl"
        >
          {isTourStoreOpen ? "Ẩn Tour" : "Mở Tour"}
        </button>
      )}

      {/* TOUR BUY PANEL */}
      {!isTourGuideMode && (
      <div
        className={`fixed left-4 right-4 md:left-auto md:right-4 z-[903] pointer-events-auto transition-all duration-300 ${
          isMobileViewport
            ? `bottom-[230px] ${isTourStoreOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`
            : 'md:bottom-4 md:w-[360px] opacity-100 translate-y-0'
        }`}
      >
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

          <div className="max-h-[34vh] md:max-h-[34vh] overflow-y-auto p-3 space-y-2 scrollbar-hide">
            {tours.length === 0 && (
              <p className="text-sm text-slate-500 px-2 py-3">Chua co tour dang mo ban.</p>
            )}

            {tours.map((tour) => {
              const isPurchased = purchasedTourIds.includes(tour.id);
              const isBuying = buyingTourId === tour.id;
              const purchase = purchaseMapByTourId[tour.id];
              const hasProgress = Number(purchase?.progress_step || 0) > 0;

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
                        onClick={() => {
                          if (isPurchased) {
                            handleStartTour(tour.id);
                            return;
                          }
                          handleBuyTour(tour.id);
                        }}
                        disabled={isBuying || startingTourId === tour.id}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                          isPurchased
                            ? activeTourId === tour.id
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        } ${(isBuying || startingTourId === tour.id) ? "opacity-60 cursor-wait" : ""}`}
                      >
                        {isPurchased
                          ? activeTourId === tour.id
                            ? "Dang dan tour"
                            : (startingTourId === tour.id ? "Dang tai..." : hasProgress ? "Tiep tuc tour" : "Bat dau tour")
                          : isBuying
                            ? "Dang mua..."
                            : "Mua tour"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {isTourGuideMode && activeTour && activeStep && (
        <div className="fixed left-4 right-4 bottom-[260px] md:left-auto md:right-4 md:w-[360px] md:bottom-4 z-[904] pointer-events-auto">
          <div className="rounded-3xl border border-emerald-200 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-1">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-emerald-700">Che do dan tour</p>
                <h4 className="text-sm font-black text-slate-800 truncate">{activeTour.title || "Tour"}</h4>
              </div>
              <button
                onClick={handleEndTourGuide}
                className="text-[11px] font-black px-2 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700"
              >
                Ket thuc
              </button>
            </div>

            <div className="p-3 space-y-3">
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                  Buoc {activeTourStepIndex + 1}/{activeTourStops.length}
                </p>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-500 mt-2">Diem ke tiep</p>
                <p className="text-sm font-black text-slate-800 mt-1">{activeStep.name || "Diem dung"}</p>
                <p className="text-xs text-slate-500 mt-1">{activeStep.category || "food"}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[9px] uppercase font-black text-slate-400">Khoang cach con lai</p>
                    <p className="font-black text-slate-800">
                      {typeof activeStepDistanceMeters === "number"
                        ? `${Math.round(activeStepDistanceMeters)} m`
                        : "---"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[9px] uppercase font-black text-slate-400">Huong tuong doi</p>
                    <p className="font-black text-slate-800 flex items-center gap-1">
                      <span className="text-base leading-none">{activeStepDirection?.arrow || "•"}</span>
                      <span>{activeStepDirection?.label || "---"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => goToStep(activeTourStepIndex - 1)}
                  disabled={!canGoPrevStep}
                  className="py-2 rounded-xl border text-xs font-black disabled:opacity-40"
                >
                  Buoc truoc
                </button>
                <button
                  onClick={() => focusPoiOnMap(activeStep.poi_id)}
                  className="py-2 rounded-xl bg-slate-900 text-white text-xs font-black"
                >
                  Mo diem tren ban do
                </button>
                <button
                  onClick={() => goToStep(activeTourStepIndex + 1)}
                  disabled={!canGoNextStep}
                  className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-40"
                >
                  Buoc tiep
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSidebarVisible && nowPlayingPoi && (
        <button
          onClick={() => setIsSidebarClosed(false)}
          className="fixed z-[906] left-4 top-20 md:top-20 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xl"
        >
          Mo thong tin quán
        </button>
      )}

      {/* SLIDEBAR ĐANG PHÁT: xuất hiện khi user đi vào trigger audio */}
      <aside
        className={`fixed z-[906] bg-white/95 backdrop-blur-xl border-r border-white/70 shadow-2xl transition-all duration-500 ease-out
          top-16 left-0 h-[calc(100%-4rem)] w-[340px]
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
      <div className="fixed bottom-0 left-0 right-0 z-[905] md:absolute md:top-4 md:left-4 md:bottom-auto md:right-auto md:w-[360px] pointer-events-none">
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
          <BindMapRef onMapReady={(map) => {
            mapRef.current = map;
          }} />

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

          {isTourGuideMode && tourRouteCoords.length >= 2 && (
            <Polyline
              positions={tourRouteCoords}
              pathOptions={{
                color: "#0ea5e9",
                weight: isMobileViewport ? 5 : 6,
                opacity: 0.9,
                dashArray: "10 12",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}

          {/* POI Markers */}
          {pois.map((poi) => (
            <div key={poi.id}>
              {activeTourId && activeStep?.poi_id === poi.id && (
                <Circle
                  center={[poi.latitude, poi.longitude]}
                  radius={42}
                  pathOptions={{
                    fillColor: "#10b981",
                    fillOpacity: 0.18,
                    color: "#059669",
                    weight: 2,
                  }}
                />
              )}

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
                      <div class="w-10 h-10 ${activeStep?.poi_id === poi.id ? "bg-emerald-600" : "bg-orange-500"} rounded-2xl flex items-center justify-center text-white border-2 border-white shadow-xl active:scale-95 transition-transform">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      </div>
                    </div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 40]
                })}
              >
                <Popup
                  className="custom-popup"
                  minWidth={popupWidth}
                  maxWidth={popupWidth}
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
          width: 374px !important;
          max-width: calc(100vw - 28px);
          border-radius: 1.5rem; 
          overflow: hidden; 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          border: none;
        }
        
        .custom-popup .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
        }
        .custom-popup .leaflet-popup-tip-container { display: none; }
        .custom-popup .leaflet-popup-close-button { top: 8px; right: 8px; color: #334155; }

        /* Tối ưu hóa vùng chạm trên mobile */
        @media (max-width: 768px) {
          .leaflet-marker-icon { cursor: pointer; }
          .custom-popup { margin-bottom: 210px; }
          .custom-popup .leaflet-popup-content-wrapper {
            width: min(92vw, 253px) !important;
            max-width: min(92vw, 253px);
            border-radius: 1.25rem;
          }
          .custom-popup .leaflet-popup-content { width: 100% !important; }
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}