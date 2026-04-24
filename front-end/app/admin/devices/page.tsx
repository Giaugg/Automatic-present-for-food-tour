"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { deviceApi } from "@/lib/api";
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Clock,
  Signal,
} from "lucide-react";

// Types
interface DeviceLog {
  id: string;
  ip_address: string;
  device_type: string;
  browser: string;
  operating_system: string;
  timezone: string | null;
  screen_resolution: string | null;
  created_at: string;
  user_id: string | null;
}

interface StatItem {
  device_type?: string;
  browser?: string;
  operating_system?: string;
  timezone?: string;
  count: number;
}

interface RealtimeData {
  accessLast1Hour: number;
  accessLast24Hours: number;
  recentDevices: DeviceLog[];
  topBrowsers: StatItem[];
}

interface DeviceStats {
  summary: {
    totalAccess: number;
    uniqueIPs: number;
  };
  statistics: {
    byDeviceType: StatItem[];
    byBrowser: StatItem[];
    byOperatingSystem: StatItem[];
    byTimezone: StatItem[];
  };
}

interface HourlyTrendItem {
  hour: string;
  count: number;
  unique_ips: number;
}

export default function DevicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [recentLogs, setRecentLogs] = useState<DeviceLog[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeData | null>(null);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [hourlyTrend, setHourlyTrend] = useState<HourlyTrendItem[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  const fetchAllData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản admin.");
        router.replace("/login");
        return;
      }

      const [logsRes, realtimeRes, statsRes, trendRes] = await Promise.all([
        deviceApi.getLogs(100),
        deviceApi.getRealtimeStats(),
        deviceApi.getStats(selectedTimeRange),
        deviceApi.getHourlyTrend(),
      ]);

      setRecentLogs(logsRes.data?.data || []);
      setRealtimeStats(realtimeRes.data?.realtime || null);
      setDeviceStats(logsRes.data?.data ? {
        summary: statsRes.data?.summary || { totalAccess: 0, uniqueIPs: 0 },
        statistics: statsRes.data?.statistics || {
          byDeviceType: [],
          byBrowser: [],
          byOperatingSystem: [],
          byTimezone: []
        }
      } : null);
      setHourlyTrend(trendRes.data?.data || []);
      setErrorMessage("");
    } catch (error) {
      const status = (error as any)?.response?.status;

      if (status === 401) {
        setErrorMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      if (status === 403) {
        setErrorMessage("Bạn không có quyền xem trang này.");
        return;
      }

      setErrorMessage("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [router, selectedTimeRange]);

  useEffect(() => {
    fetchAllData();

    // Refresh realtime stats every 10 seconds
    const interval = setInterval(() => {
      deviceApi.getRealtimeStats().then(res => {
        setRealtimeStats(res.data?.realtime || null);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
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

  const item = { count: 50 }; // Example item for bar count calculation
  const barCount = Math.max(1, Math.floor((item.count || 0) / 5));

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Đang tải dữ liệu thiết bị...</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Thiết bị</h1>
          <p className="text-muted-foreground">Thống kê thiết bị truy cập hệ thống</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Cập nhật
        </button>
      </div>

      {/* Realtime Stats Cards */}
      {realtimeStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Truy cập (1h gần nhất)"
            value={realtimeStats.accessLast1Hour}
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            description="Trong 1 giờ qua"
          />
          <StatCard
            title="Truy cập (24h gần nhất)"
            value={realtimeStats.accessLast24Hours}
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            description="Trong 24 giờ qua"
          />
          <StatCard
            title="Total (Thời kỳ)"
            value={deviceStats?.summary.totalAccess || 0}
            icon={<Signal className="w-5 h-5 text-purple-500" />}
            description={`Khoảng thời gian ${selectedTimeRange}`}
          />
          <StatCard
            title="IP Duy nhất"
            value={deviceStats?.summary.uniqueIPs || 0}
            icon={<Globe className="w-5 h-5 text-orange-500" />}
            description="IP khác nhau"
          />
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {["24h", "7d", "30d"].map((range) => (
          <button
            key={range}
            onClick={() => setSelectedTimeRange(range as "24h" | "7d" | "30d")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedTimeRange === range
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {range === "24h" ? "24 giờ" : range === "7d" ? "7 ngày" : "30 ngày"}
          </button>
        ))}
      </div>

      {/* Statistics Grid */}
      {deviceStats && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Device Type Distribution */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Phân loại theo Thiết bị</h2>
            </div>
            <div className="space-y-3">
              {deviceStats.statistics.byDeviceType.length > 0 ? (
                deviceStats.statistics.byDeviceType.map((item: any) => (
                  <div key={item.device_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(item.device_type)}
                      <span className="text-sm capitalize">{item.device_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (item.count / (deviceStats.statistics.byDeviceType[0]?.count || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold">Trình duyệt hàng đầu</h2>
            </div>
            <div className="space-y-3">
              {deviceStats.statistics.byBrowser.length > 0 ? (
                deviceStats.statistics.byBrowser.slice(0, 5).map((item: any) => (
                  <div key={item.browser} className="flex items-center justify-between">
                    <span className="text-sm">{item.browser}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(item.count / (deviceStats.statistics.byBrowser[0]?.count || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Operating System */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Hệ điều hành</h2>
            </div>
            <div className="space-y-3">
              {deviceStats.statistics.byOperatingSystem.length > 0 ? (
                deviceStats.statistics.byOperatingSystem.map((item: any) => (
                  <div key={item.operating_system} className="flex items-center justify-between">
                    <span className="text-sm">{item.operating_system}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (item.count / (deviceStats.statistics.byOperatingSystem[0]?.count || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Top Timezones */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Top Múi giờ</h2>
            </div>
            <div className="space-y-3">
              {deviceStats.statistics.byTimezone.length > 0 ? (
                deviceStats.statistics.byTimezone.slice(0, 5).map((item: any) => (
                  <div key={item.timezone} className="flex items-center justify-between">
                    <span className="text-sm">{item.timezone || "Unknown"}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (item.count / (deviceStats.statistics.byTimezone[0]?.count || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có dữ liệu</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Devices Table */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Thiết bị gần đây</h2>
          <span className="text-xs text-slate-500">
            Cập nhật realtime - Tổng {recentLogs.length} thiết bị
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b bg-slate-50">
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3">IP</th>
                  <th className="py-3 px-3">Thiết bị</th>
                  <th className="py-3 px-3">Browser</th>
                  <th className="py-3 px-3">OS</th>
                  <th className="py-3 px-3">Màn hình</th>
                  <th className="py-3 px-3">Múi giờ</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-3 text-xs">
                      <div>{formatDate(log.created_at)}</div>
                      <div className="text-gray-500">{formatTime(log.created_at)}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">{log.ip_address}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 capitalize">
                        {getDeviceIcon(log.device_type)}
                        {log.device_type}
                      </div>
                    </td>
                    <td className="py-3 px-3">{log.browser}</td>
                    <td className="py-3 px-3">{log.operating_system}</td>
                    <td className="py-3 px-3 text-xs">
                      {log.screen_resolution ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {log.screen_resolution}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {log.timezone ? (
                        <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded">
                          {log.timezone}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hourly Trend */}
      {hourlyTrend.length > 0 && (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Xu hướng theo giờ (24h)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b bg-slate-50">
                  <th className="py-3 px-3">Giờ</th>
                  <th className="py-3 px-3">Truy cập</th>
                  <th className="py-3 px-3">IP duy nhất</th>
                  <th className="py-3 px-3">Biểu đồ</th>
                </tr>
              </thead>
              <tbody>
                {hourlyTrend.slice(0, 24).map((item) => (
                  <tr key={item.hour} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-mono">
                      {new Date(item.hour).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold">{item.count}</td>
                    <td className="py-3 px-3">{item.unique_ips}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-end gap-1 h-8">
                        {
                          
                        [...Array(Math.max(1, item.count / 5))].map((_, i) => (
                          <div
                            key={i}
                            className="bg-blue-500 rounded-t"
                            style={{
                              height: `${20 + Math.random() * 60}%`,
                              minWidth: "4px",
                            }}
                          ></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

// Helper Component: Stat Card
function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
