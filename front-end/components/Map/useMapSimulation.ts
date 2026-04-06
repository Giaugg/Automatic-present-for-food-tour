// components/Map/useMapSimulation.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { getDistance, getFullAudioUrl } from "./MapUtils";
import { POIWithTranslation } from "@/types/pois";

export function useMapSimulation(
  pois: POIWithTranslation[], 
  activeAudioKey: string | null, 
  toggleAudio: (id: string, url: string) => void
) {
  const [useManual, setUseManual] = useState(false);
  const [manualPos, setManualPos] = useState({ lat: 10.7769, lng: 106.7009 });
  const [moveSpeed, setMoveSpeed] = useState(0.0001);
  const [targetPoi, setTargetPoi] = useState<POIWithTranslation | null>(null);
  const [minDistance, setMinDistance] = useState<number>(Infinity);
  
  const isProcessingAudio = useRef(false);
  const TRIGGER_RADIUS_KM = 0.03;

  const handleProximityAudio = useCallback(async (currentLat: number, currentLng: number) => {
    if (isProcessingAudio.current || pois.length === 0) return;

    let closestPoi: POIWithTranslation | undefined;
    let closestDist = Infinity;

    pois.forEach(poi => {
      const dist = getDistance(currentLat, currentLng, poi.latitude, poi.longitude);
      if (dist < TRIGGER_RADIUS_KM && dist < closestDist) {
        closestDist = dist;
        closestPoi = poi;
      }
    });

    if (closestPoi) {
      const selectedPoi = closestPoi;
      setTargetPoi(selectedPoi);
      setMinDistance(closestDist);

      // Sửa lỗi logic so sánh: chỉ phát nếu địa điểm hiện tại khác target cũ HOẶC chưa có gì đang phát
      if ((!targetPoi || selectedPoi.id !== targetPoi.id) && activeAudioKey !== selectedPoi.id) {
        const url: string | null = selectedPoi.audio_url ? getFullAudioUrl(selectedPoi.audio_url) : null;
        if (url) {
          try {
            isProcessingAudio.current = true;
            await toggleAudio(selectedPoi.id, url);
          } finally {
            setTimeout(() => { isProcessingAudio.current = false; }, 800);
          }
        }
      }
    } else if (targetPoi) {
      setTargetPoi(null);
      setMinDistance(Infinity);
    }
  }, [pois, targetPoi, activeAudioKey, toggleAudio]);

  useEffect(() => {
    if (!useManual) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      setManualPos(prev => {
        const n = { ...prev };
        if (key === 'w') n.lat += moveSpeed;
        else if (key === 's') n.lat -= moveSpeed;
        else if (key === 'a') n.lng -= moveSpeed;
        else if (key === 'd') n.lng += moveSpeed;
        handleProximityAudio(n.lat, n.lng);
        return n;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [useManual, moveSpeed, handleProximityAudio]);

  return { 
    useManual, setUseManual, manualPos, setManualPos, 
    moveSpeed, setMoveSpeed, targetPoi, minDistance, handleProximityAudio 
  };
}