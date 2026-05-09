"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi } from "@/lib/api";
import Link from "next/link";
import { 
  Users, 
  MapPin, 
  Languages, 
  TrendingUp, 
  Clock,
  Smartphone,
  ArrowRight
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErrorMessage("Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản admin.");
          router.replace("/login");
          return;
        }

        const statsRes = await dashboardApi.getAdminStats();
        setStats(statsRes.data?.data || null);
      } catch (error) {
        const status = (error as any)?.response?.status;

        if (status === 401) {
          setErrorMessage("Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/login");
          return;
        }

        if (status === 403) {
          setErrorMessage("Tài khoản hiện tại không có quyền admin để xem dashboard.");
          return;
        }

        setErrorMessage("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
        console.error("Lỗi lấy thống kê:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [router]);

  if (loading) return <div className="p-4 sm:p-6 md:p-8 text-sm sm:text-base">Đang tải dữ liệu...</div>;

  if (errorMessage) {
    return (
      <main className="p-4 sm:p-6 md:p-8">
        <div className="rounded-lg sm:rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4 text-red-700 text-sm sm:text-base">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Tổng quan hệ thống Food Tour</p>
      </div>

      {/* 1. Hàng Thống kê nhanh (Stats Grid) */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Người dùng" 
          value={stats?.counters?.users} 
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />} 
          description="Tổng số tài khoản"
        />
        <StatCard 
          title="Địa điểm (POI)" 
          value={stats?.counters?.pois} 
          icon={<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />} 
          description="Tổng số điểm trên bản đồ"
        />
        <StatCard 
          title="Ngôn ngữ Active" 
          value={stats?.counters?.activeLanguages} 
          icon={<Languages className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />} 
          description="Số ngôn ngữ đang hỗ trợ"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        {/* 2. Danh sách POI mới nhất */}
        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold">Địa điểm mới thêm</h2>
          </div>
          <div className="space-y-2 sm:space-y-4 max-h-64 sm:max-h-80 overflow-y-auto">
            {stats?.recentPois?.map((poi: any) => (
              <div key={poi.id} className="flex justify-between items-start gap-2 border-b pb-2 sm:pb-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">{poi.name || "Chưa có tên"}</p>
                  <p className="text-xs text-gray-500 truncate">{poi.category} • {new Date(poi.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">Mới</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Placeholder cho Biểu đồ (Sẽ tích hợp Recharts sau) */}
        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-xl border shadow-sm flex flex-col items-center justify-center border-dashed min-h-64 sm:min-h-80">
             <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mb-2" />
             <p className="text-xs sm:text-sm text-gray-400 text-center px-2">Biểu đồ tăng trưởng sẽ hiển thị ở đây</p>
        </div>
      </div>

      {/* Device Management Card */}
      <Link href="/admin/devices">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="bg-blue-500 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">Quản lý Thiết bị</h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate sm:truncate-none">Xem thống kê thiết bị realtime, phân tích theo loại, browser, OS</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
          </div>
        </div>
      </Link>
    </main>
  );
}

// Component nhỏ cho Card thống kê
function StatCard({ title, value, icon, description }: any) {
  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 break-words">{value?.toLocaleString()}</h3>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">{icon}</div>
      </div>
      <p className="text-xs text-gray-400 mt-2 sm:mt-4">{description}</p>
    </div>
  );
}