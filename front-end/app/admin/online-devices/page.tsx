"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onlineDeviceApi } from "@/lib/api";
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  RefreshCw,
  LogOut,
  Clock,
  Activity,
} from "lucide-react";

interface OnlineDevice {
  id: string;
  user_id: string;
  device_id: string;
  ip_address: string;
  device_type: string;
  browser: string;
  operating_system: string;
  timezone: string | null;
  screen_resolution: string | null;
  login_at: string;
  last_activity_at: string;
  email: string;
  full_name: string;
  role: string;
  idle_minutes: number;
  session_minutes: number;
  trial_status: string | null;
  trial_days_remaining: number | null;
}

export default function OnlineDevicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [onlineDevices, setOnlineDevices] = useState<OnlineDevice[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 10 seconds
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const [devicesRes, statsRes] = await Promise.all([
        onlineDeviceApi.getOnlineDevices(30, 200),
        onlineDeviceApi.getOnlineStats(),
      ]);

      setOnlineDevices(devicesRes.data?.data || []);
      setStats(statsRes.data || null);
      setErrorMessage("");
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        router.replace("/login");
        return;
      }
      setErrorMessage("Không thể tải dữ liệu. Vui lòng thử lại.");
      console.error("Lỗi:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  const handleKickOut = async (sessionId: string, email: string) => {
    if (!confirm(`Bạn chắc chắn muốn kick out ${email}?`)) return;

    try {
      await onlineDeviceApi.kickOutSession(sessionId, "Kicked by admin");
      alert("Đã kick out thành công");
      await fetchData();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || "Lỗi kick out");
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-4 h-4" />;
      case "tablet":
        return <Tablet className="w-4 h-4" />;
      case "desktop":
        return <Monitor className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thiết Bị Đang Online</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi phiên làm việc</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium ${
              autoRefresh
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Cập nhật
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      {stats?.stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            title="Phiên Hoạt Động"
            value={stats.stats.total_active_sessions}
            icon={<Activity className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            title="Người Dùng"
            value={stats.stats.unique_users_online}
            icon={<Smartphone className="w-5 h-5 text-green-500" />}
          />
          <StatCard
            title="Mobile"
            value={stats.stats.mobile_count}
            icon={<Smartphone className="w-5 h-5 text-purple-500" />}
          />
          <StatCard
            title="Desktop"
            value={stats.stats.desktop_count}
            icon={<Monitor className="w-5 h-5 text-orange-500" />}
          />
          <StatCard
            title="Trung Bình Idle"
            value={`${stats.stats.avg_idle_minutes || 0} phút`}
            icon={<Clock className="w-5 h-5 text-red-500" />}
          />
        </div>
      )}

      {/* Device Distribution */}
      {stats?.peakHours && stats.peakHours.length > 0 && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Giờ Peak (24h gần nhất)</h2>
          <div className="space-y-2">
            {stats.peakHours.map((hour: any) => (
              <div key={hour.hour} className="flex items-center justify-between">
                <span className="text-sm font-medium">{hour.hour}:00</span>
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(hour.count / (stats.peakHours[0]?.count || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">{hour.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Devices Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Danh sách thiết bị ({onlineDevices.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">Email / Tên</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">Thiết Bị</th>
                <th className="px-4 py-3 text-left">Browser</th>
                <th className="px-4 py-3 text-left">OS</th>
                <th className="px-4 py-3 text-left">Login</th>
                <th className="px-4 py-3 text-center">Idle</th>
                <th className="px-4 py-3 text-center">Session</th>
                <th className="px-4 py-3 text-center">Trial</th>
                <th className="px-4 py-3 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {onlineDevices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    Không có thiết bị đang online
                  </td>
                </tr>
              ) : (
                onlineDevices.map((device) => (
                  <tr key={device.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{device.full_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{device.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">{device.ip_address}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 capitalize">
                        {getDeviceIcon(device.device_type)}
                        {device.device_type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{device.browser}</td>
                    <td className="px-4 py-3 text-sm">{device.operating_system}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{formatDate(device.login_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                          device.idle_minutes < 5
                            ? "bg-green-100 text-green-700"
                            : device.idle_minutes < 15
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {device.idle_minutes} phút
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold">
                      {device.session_minutes} phút
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {device.trial_status ? (
                        <span
                          className={`inline-block px-2 py-1 rounded font-semibold ${
                            device.trial_days_remaining! > 0
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {device.trial_days_remaining} ngày
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleKickOut(device.id, device.email)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Kick out"
                      >
                        <LogOut className="w-3 h-3" /> Kick out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
