"use client";

import { useState, useEffect, useCallback } from "react";
import type { GeolocationState, UseGeolocationOptions } from "@/types/geolocation";

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  });

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState((prev) => ({
      ...prev,
      position,
      error: null,
      isLoading: false,
    }));
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }, []);

  useEffect(() => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Theo dõi vị trí liên tục
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: opts.enableHighAccuracy,
      timeout: opts.timeout,
      maximumAge: opts.maximumAge,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [state.isSupported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, onSuccess, onError]);

  return {
    ...state,
    latitude: state.position?.coords.latitude ?? null,
    longitude: state.position?.coords.longitude ?? null,
    accuracy: state.position?.coords.accuracy ?? null,
  };
}
