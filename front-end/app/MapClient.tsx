"use client";

import dynamic from "next/dynamic";

const FoodMap = dynamic(() => import("../components/FoodMap" ), {
  ssr: false,
});

export default function MapClient() {
  return <FoodMap />;
}
