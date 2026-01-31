"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix lỗi icon marker bị mất trong Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export default function MapView() {
  const center: [number, number] = [10.7769, 106.7009]; // TP.HCM

  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center}>
          <Popup>Quán ăn demo 📍</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
