"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./Map/MapView"), { ssr: false });

export default function MapClient() {
  return <MapView />;
}
