// components/Map/useNearbyPois.ts
import { useMemo } from "react";
import { getDistance } from "./MapUtils";

export function useNearbyPois(pois: any[], lat: number, lng: number) {
  return useMemo(() => {
    // Kiểm tra đầu vào
    if (!lat || !lng || !pois || pois.length === 0) {
      console.log("📍 Nearby Log: Thiếu dữ liệu", { lat, lng, poisLength: pois?.length });
      return [];
    }

    const calculated = pois.map(p => {
      const d = getDistance(lat, lng, p.latitude, p.longitude);
      return { ...p, distance: d };
    });

    // SẮP XẾP TRƯỚC: Gần nhất lên đầu
    const sorted = calculated.sort((a, b) => a.distance - b.distance);

    // LỌC: Thử nới lỏng lọc category (Nếu không khớp thì hiện tất cả để debug)
    const foodItems = sorted.filter(p => {
      const cat = (p.category || "").toLowerCase();
      // Chấp nhận nhiều từ khóa hơn
      return cat.includes("quán") || 
             cat.includes("food") || 
             cat.includes("ăn") || 
             cat.includes("cà phê") ||
             cat.includes("coffee");
    });

    // Nếu lọc xong mà rỗng, trả về 5 cái gần nhất bất kể loại gì để User thấy có data
    const finalResult = foodItems.length > 0 ? foodItems : sorted.slice(0, 5);
    
    console.log("📍 Nearby Items Found:", finalResult.length);
    return finalResult;
  }, [pois, lat, lng]);
}