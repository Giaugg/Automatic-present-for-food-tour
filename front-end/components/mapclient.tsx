"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./mapview"), { ssr: false });

export default function MapClient() {
  return <MapView />;
}
