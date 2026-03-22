"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { Navigation, Radio, RotateCcw } from "lucide-react";

// ================= ICON =================
const createUserIcon = (heading: number) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        transform: rotate(${heading}deg);
        transition: transform 0.2s linear;
      ">
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(59,130,246,0.8);
          position: relative;
        ">
          <div style="
            position: absolute;
            inset: -6px;
            border: 2px solid rgba(59,130,246,0.5);
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          "></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const foodIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg,#f97316,#fb923c);
      border-radius: 12px;
      border: 2px solid white;
      box-shadow: 0 6px 12px rgba(0,0,0,0.2);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-weight:bold;
    ">🍔</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// ================= DISTANCE =================
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ================= AUTO PAN =================
function AutoPan({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    const id = setTimeout(() => {
      map.setView(center, undefined, { animate: true });
    }, 100);
    return () => clearTimeout(id);
  }, [center, map]);

  return null;
}

// ================= MAIN =================
export default function MapDemo() {
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [pos, setPos] = useState({ lat: 10.7769, lng: 106.7009 });
  const [heading, setHeading] = useState(0);
  const [activePoi, setActivePoi] = useState<POIWithTranslation | null>(null);
  const [loading, setLoading] = useState(true);

  const requestRef = useRef<number>();
  const keys = useRef<Set<string>>(new Set());
  const lastTime = useRef<number>(0);
  const velocity = useRef({ x: 0, y: 0 });

  const TRIGGER_RADIUS = 40;
  const SPEED_MPS = 2;

  // ================= GAME LOOP =================
  const update = (time: number) => {
    const delta = time - lastTime.current;
    lastTime.current = time;

    let dx = 0,
      dy = 0;

    if (keys.current.has("w")) dy += 1;
    if (keys.current.has("s")) dy -= 1;
    if (keys.current.has("a")) dx -= 1;
    if (keys.current.has("d")) dx += 1;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      dx /= length;
      dy /= length;

      const angle = Math.atan2(dx, dy) * (180 / Math.PI);
      setHeading(angle);
    }

    const meters = SPEED_MPS * (delta / 1000);

    const metersToLat = 1 / 111320;
    const metersToLng = 1 / (111320 * Math.cos(pos.lat * Math.PI / 180));

    velocity.current.x += dx * meters * metersToLng;
    velocity.current.y += dy * meters * metersToLat;

    velocity.current.x *= 0.9;
    velocity.current.y *= 0.9;

    setPos((prev) => ({
      lat: prev.lat + velocity.current.y,
      lng: prev.lng + velocity.current.x,
    }));

    requestRef.current = requestAnimationFrame(update);
  };

  // ================= GEOFENCE =================
  useEffect(() => {
    const nearby = pois.find(
      (p) => calculateDistance(pos.lat, pos.lng, p.latitude, p.longitude) < TRIGGER_RADIUS
    );

    if (nearby && activePoi?.id !== nearby.id) {
      setActivePoi(nearby);
    } else if (!nearby && activePoi) {
      setActivePoi(null);
    }
  }, [pos, pois]);

  // ================= INIT =================
  useEffect(() => {
    poiApi.getAll("vi").then((res) => {
      setPois(res.data);
      setLoading(false);
    });

    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white font-bold">
        Initializing GPS Simulator...
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">

      {/* HUD */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
        <div
          className={`p-4 rounded-2xl backdrop-blur-xl border shadow-xl transition ${
            activePoi ? "bg-orange-500/90 text-white scale-105" : "bg-white/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              {activePoi ? <Radio className="animate-pulse" /> : <Navigation />}
            </div>
            <div>
              <p className="text-xs uppercase opacity-70">
                {activePoi ? "Nearby" : "Simulating GPS"}
              </p>
              <p className="font-bold text-sm">
                {activePoi ? activePoi.name : "Use WASD to move"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAP */}
      <MapContainer center={[pos.lat, pos.lng]} zoom={18} className="h-full w-full">
        <AutoPan center={[pos.lat, pos.lng]} />

        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        <Circle
          center={[pos.lat, pos.lng]}
          radius={TRIGGER_RADIUS}
          pathOptions={{
            color: activePoi ? "#f97316" : "#3b82f6",
            dashArray: "6,6",
          }}
        />

        <Marker
          position={[pos.lat, pos.lng]}
          icon={createUserIcon(heading)}
          zIndexOffset={1000}
        />

        {pois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.latitude, poi.longitude]}
            icon={foodIcon}
          >
            <Popup>
              <div className="text-center text-sm">
                <b>{poi.name}</b>
                <div className="text-xs mt-1">
                  {Math.round(
                    calculateDistance(pos.lat, pos.lng, poi.latitude, poi.longitude)
                  )}
                  m
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* RESET */}
      <button
        onClick={() => setPos({ lat: 10.7769, lng: 106.7009 })}
        className="absolute bottom-10 right-10 z-[1000] p-3 bg-white rounded-xl shadow-lg hover:scale-110 transition"
      >
        <RotateCcw />
      </button>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1 }
          100% { transform: scale(1.8); opacity: 0 }
        }
      `}</style>
    </div>
  );
}