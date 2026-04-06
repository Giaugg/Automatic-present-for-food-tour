"use client";

import { useEffect } from "react";
import { deviceApi, DeviceIdentifyPayload } from "../lib/api";

// Chỉ gửi tracking 1 lần mỗi session trình duyệt để tránh gọi lặp.
const SESSION_KEY = "device_tracked_once";

const DeviceTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
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
        window.sessionStorage.setItem(SESSION_KEY, "1");
      })
      .catch(() => {
        // Bỏ qua lỗi tracking để không ảnh hưởng trải nghiệm người dùng
      });
  }, []);

  return null;
};

export default DeviceTracker;
