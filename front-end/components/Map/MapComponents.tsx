// components/Map/MapComponents.tsx
import { Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

// Icons
export const userIcon = L.divIcon({
  className: "u-idx",
  html: `<div class="w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full animate-pulse shadow-lg"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12]
});

export const foodIcon = L.divIcon({
  className: "f-idx",
  html: `<div class="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl border-2 border-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></div>`,
  iconSize: [40, 40], iconAnchor: [20, 40]
});

export const TriggerCircle = ({ poi, isTarget }: any) => (
  <Circle 
    center={[poi.latitude, poi.longitude]} 
    radius={30} 
    pathOptions={{ 
      fillColor: isTarget ? "#2563eb" : "#94a3b8", 
      fillOpacity: 0.1, 
      color: isTarget ? "#2563eb" : "transparent",
      weight: 1,
      dashArray: "5, 5"
    }} 
  />
);