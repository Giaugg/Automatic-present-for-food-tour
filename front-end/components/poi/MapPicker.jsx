"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";



function ClickHandler({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function MapPicker({ position, setPosition }) {
  return (
    <MapContainer center={position || [10.76, 106.70]} zoom={14} style={{ height: 300 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler setPosition={setPosition} />
      {position && <Marker position={position} />}
    </MapContainer>
  );
}