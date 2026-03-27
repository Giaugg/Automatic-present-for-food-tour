// components/Map/MapUtils.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getFullAudioUrl = (url: string | null) => {
  if (!url || url === "null") return null;
  const path = url.startsWith('/uploads') ? url : `/uploads${url.startsWith('/') ? url : `/${url}`}`;
  console.log("🔗 Full audio URL:", `${API_URL}${path}`);
  return `${API_URL}${path}`;
};