import { useState, useRef, useEffect, useCallback } from "react";

export function useAudioPlayer() {
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveAudioKey(null);
  }, []);

  // Cleanup khi tắt trang
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const toggleAudio = useCallback((key: string, url: string | null) => {
    if (!url) return;

    // Nếu bấm vào đúng cái đang phát -> Dừng
    if (activeAudioKey === key) {
      stopAudio();
      return;
    }

    // Dừng cái cũ nếu có
    stopAudio();

    // Tạo object audio mới
    const newAudio = new Audio(url);
    audioRef.current = newAudio;
    setActiveAudioKey(key);

    newAudio.play().catch((err) => {
      console.error("Audio Playback Error:", err);
      setActiveAudioKey(null);
    });

    newAudio.onended = () => setActiveAudioKey(null);
  }, [activeAudioKey, stopAudio]);

  return { activeAudioKey, toggleAudio, stopAudio };
}