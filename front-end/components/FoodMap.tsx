"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L, { LatLngExpression } from "leaflet";

// Fix icon lỗi trong Next
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type POI = {
  id: number;
  lat: number;
  lon: number;
  name: string;
  type: string;
};

export default function FoodMap() {
  const [userPosition, setUserPosition] = useState<LatLngExpression | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const centerLat = 10.7626;
  const centerLon = 106.6602;

  const [pois, setPois] = useState<POI[]>([]);

  function getMyLocation() {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPosition([latitude, longitude]);
        setAccuracy(accuracy);
      },
      (err) => {
        alert("Không lấy được vị trí: " + err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Trình duyệt không hỗ trợ GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPosition([latitude, longitude]);
        setAccuracy(accuracy);
      },
      (err) => {
        console.error("Không lấy được vị trí:", err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  function FlyToUser({ position }: { position: LatLngExpression }) {
    const map = useMap();

    useEffect(() => {
      if (position) {
        map.flyTo(position, 17);
      }
    }, [position, map]);

    return null;
  }
  useEffect(() => {
    async function loadPOI() {
      const radius = 1000;

      const res = await fetch(
        `http://localhost:5000/api/food-street?lat=${centerLat}&lon=${centerLon}&radius=${radius}`
      );

      const data = await res.json();
      setPois(data);
    }

    loadPOI();
  }, []);

  return (
    <>
      <button
        onClick={getMyLocation}
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 10,
          left: 10,
          padding: "8px 12px",
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Lấy vị trí của tôi
      </button>
      <MapContainer
        center={[centerLat, centerLon] as LatLngExpression}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pois.map((poi) => (
          <Marker key={poi.id} position={[poi.lat, poi.lon]}>
            <Popup>
              <b>{poi.name}</b>
              <br />
              Loại: {poi.type}
            </Popup>
          </Marker>
        ))}

        {userPosition && (
          <>
            <FlyToUser position={userPosition} />
            <Marker position={userPosition}>
              <Popup>Vị trí của bạn</Popup>
            </Marker>
            {accuracy && (
              <Circle
                center={userPosition}
                radius={accuracy}
                pathOptions={{ color: "blue" }}
              />
            )}
          </>
        )}
      </MapContainer>
    </>
  );
}
