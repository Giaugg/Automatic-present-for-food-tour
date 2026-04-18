"use client";

import { useEffect } from "react";
import { deviceApi, DeviceIdentifyPayload } from "../lib/api";

// Giới hạn gửi tracking 1 lần trong 30 phút để vừa có log kiểm tra vừa tránh spam.
const LAST_TRACKED_AT_KEY = "device_tracked_last_at";
const TRACK_INTERVAL_MS = 30 * 60 * 1000;

const DeviceTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const lastTrackedAt = Number(window.localStorage.getItem(LAST_TRACKED_AT_KEY) || 0);
    const now = Date.now();

    if (lastTrackedAt > 0 && now - lastTrackedAt < TRACK_INTERVAL_MS) {
      return;
    }

    // Dữ liệu client-hints gửi lên backend để bổ sung cho user-agent.
    const payload: DeviceIdentifyPayload = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      language: navigator.language || null,
      platform: navigator.platform || null,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      touchPoints: navigator.maxTouchPoints || 0
    };

    deviceApi
      .identify(payload)
      .then(() => {
        window.localStorage.setItem(LAST_TRACKED_AT_KEY, String(now));
      })
      .catch((err) => {
        // Ghi warning để tiện kiểm tra lỗi tracking nhưng không làm hỏng trải nghiệm.
        console.warn("[DeviceTracker] identify failed:", err?.response?.data || err?.message || err);
      });
  }, []);

  return null;
};

export default DeviceTracker;
