import { useState, useEffect, useCallback } from 'react';

export const useMapLocation = (defaultPos = { lat: 10.7769, lng: 106.7009 }) => {
  const [position, setPosition] = useState(defaultPos);
  const [isMocking, setIsMocking] = useState(false);

  // Hàm di chuyển vị trí (dành cho giả lập)
  const moveTo = useCallback((lat: number, lng: number) => {
    setPosition({ lat, lng });
  }, []);

  useEffect(() => {
    if (!isMocking) {
      // Sử dụng GPS thật của trình duyệt
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.error("Lỗi GPS:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isMocking]);

  return { position, isMocking, setIsMocking, moveTo };
};