"use client";

import { useEffect } from "react";
import { deviceApi, DeviceIdentifyPayload } from "../lib/api";

const SESSION_KEY = "device_tracked_once";

const DeviceTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
      return;
    }

    const payload: DeviceIdentifyPayload = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      language: navigator.language || null,
      platform: navigator.platform || null,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      touchPoints: navigator.maxTouchPoints || 0
    };

    deviceApi
      .identify(payload)
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          window.sessionStorage.setItem(SESSION_KEY, "1");
        }
      })
      .catch(() => {
        // Bỏ qua lỗi tracking để không ảnh hưởng trải nghiệm người dùng
      });
  }, []);

  return null;
};

export default DeviceTracker;
