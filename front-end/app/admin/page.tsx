"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi } from "@/lib/api";
import { 
  Users, 
  MapPin, 
  Languages, 
  TrendingUp, 
  Clock 
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

        const res = await dashboardApi.getAdminStats();
        setStats(res.data?.data || null);
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

  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;

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
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống Food Tour</p>
      </div>

      {/* 1. Hàng Thống kê nhanh (Stats Grid) */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Người dùng" 
          value={stats?.counters?.users} 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          description="Tổng số tài khoản"
        />
        <StatCard 
          title="Địa điểm (POI)" 
          value={stats?.counters?.pois} 
          icon={<MapPin className="w-5 h-5 text-green-500" />} 
          description="Tổng số điểm trên bản đồ"
        />
        <StatCard 
          title="Ngôn ngữ Active" 
          value={stats?.counters?.activeLanguages} 
          icon={<Languages className="w-5 h-5 text-purple-500" />} 
          description="Số ngôn ngữ đang hỗ trợ"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 2. Danh sách POI mới nhất */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Địa điểm mới thêm</h2>
          </div>
          <div className="space-y-4">
            {stats?.recentPois?.map((poi: any) => (
              <div key={poi.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{poi.name || "Chưa có tên"}</p>
                  <p className="text-xs text-gray-500">{poi.category} • {new Date(poi.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Mới</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Placeholder cho Biểu đồ (Sẽ tích hợp Recharts sau) */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center justify-center border-dashed">
             <TrendingUp className="w-12 h-12 text-gray-300 mb-2" />
             <p className="text-gray-400">Biểu đồ tăng trưởng sẽ hiển thị ở đây</p>
        </div>
      </div>
    </main>
  );
}

// Component nhỏ cho Card thống kê
function StatCard({ title, value, icon, description }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value?.toLocaleString()}</h3>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className="text-xs text-gray-400 mt-4">{description}</p>
    </div>
  );
}