"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SESSION_KEY = "device_tracked_once";

const DeviceTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
      return;
    }

    const payload = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      language: navigator.language || null,
      platform: navigator.platform || null,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      touchPoints: navigator.maxTouchPoints || 0
    };

    fetch(`${API_BASE}/api/device/identify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (response.ok) {
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
