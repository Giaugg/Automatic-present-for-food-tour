"use client";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import { 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  PieChart as PieIcon,
  PlusCircle,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function OwnerPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getOwnerStats();
      setStats(res.data.data);
    } catch (error) {
      console.error("Lỗi lấy thống kê Owner:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Đang tính toán dữ liệu...</div>;

  return (
    <main className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khu vực Chủ sở hữu</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi các địa điểm của bạn</p>
        </div>
        <Link 
          href="/owner/pois/create" 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Thêm địa điểm mới
        </Link>
      </div>

      {/* 1. Hàng Thống kê nhanh */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Tổng địa điểm</p>
              <h3 className="text-2xl font-bold">{stats?.totalPois || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <PieIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Danh mục chính</p>
              <h3 className="text-lg font-bold truncate">
                {stats?.categories?.[0]?.category || "N/A"}
              </h3>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchStats}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-primary transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Làm mới dữ liệu</p>
              <h3 className="text-sm font-bold text-gray-400">Vừa cập nhật</h3>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 font-medium">Gói tài khoản hiện tại</p>
            <h3 className="text-xl font-bold uppercase">
              {stats?.ownerPlan === "premium" ? "Gói trả phí" : "Gói miễn phí"}
            </h3>
          </div>
          <div className="text-sm text-gray-600">
            <p>Ảnh đã dùng: <span className="font-bold">{stats?.usage?.usedThumbnailUploads ?? 0}</span>/{stats?.planLimits?.maxThumbnailUploads ?? 0}</p>
            <p>Bán kính audio tối đa: <span className="font-bold">{stats?.planLimits?.maxAudioRadiusMeters ?? 30}m</span></p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 2. Sức khỏe bản dịch (Translation Health) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
             Tình trạng dịch thuật các địa điểm
          </h2>
          <div className="space-y-4">
            {stats?.translationHealth?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  {item.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                  <span className="font-medium text-gray-700">{item.name || "Chưa đặt tên"}</span>
                </div>
                <div className="text-right">
                  {item.isComplete ? (
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Hoàn tất</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">
                      Thiếu {item.missing} ngôn ngữ
                    </span>
                  )}
                </div>
              </div>
            ))}
            {stats?.translationHealth?.length === 0 && (
              <p className="text-center text-gray-400 py-10 italic">Bạn chưa có địa điểm nào để theo dõi.</p>
            )}
          </div>
        </div>

        {/* 3. Phân bổ danh mục */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold mb-6">Phân loại địa điểm</h2>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {stats?.categories?.map((cat: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">{cat.category}</span>
                  <span className="font-bold">{cat.count}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: `${(cat.count / stats.totalPois) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}