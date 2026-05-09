"use client";
import { useEffect, useState } from "react";
import { dashboardApi, paymentApi } from "@/lib/api";
import { 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  PieChart as PieIcon,
  RefreshCw,
  Crown,
  Wallet,
  Clock3,
  XCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function OwnerPage() {
  const [stats, setStats] = useState<any>(null);
  const [planCatalog, setPlanCatalog] = useState<any[]>([]);
  const [planState, setPlanState] = useState<any>(null);
  const [submittingPlanKey, setSubmittingPlanKey] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, catalogRes, myPlanRes] = await Promise.all([
        dashboardApi.getOwnerStats(),
        paymentApi.getOwnerPlans(),
        paymentApi.getMyOwnerPlan(),
      ]);

      setStats(statsRes.data.data);
      setPlanCatalog(catalogRes.data.data || []);
      setPlanState(myPlanRes.data.data || null);
    } catch (error) {
      console.error("Lỗi lấy thống kê Owner:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubscribePlan = async (planKey: string) => {
    setNotice(null);
    const selectedPlan = planCatalog.find((p) => p.key === planKey) || null;
    setPendingPlan(selectedPlan);
  };

  const handleConfirmSubscribe = async () => {
    if (!pendingPlan?.key) return;

    setSubmittingPlanKey(pendingPlan.key);
    try {
      const res = await paymentApi.subscribeOwnerPlan(pendingPlan.key);
      await fetchStats();

      const deducted = Number(res?.data?.data?.wallet?.deducted || 0);
      const successMessage = deducted > 0
        ? `Đăng ký thành công. Đã trừ ${deducted.toLocaleString("vi-VN")}đ từ ví.`
        : "Đăng ký gói miễn phí thành công.";

      setNotice({ type: "success", message: successMessage });
      setPendingPlan(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Không thể đăng ký gói";
      setNotice({ type: "error", message });
    } finally {
      setSubmittingPlanKey(null);
    }
  };

  if (loading) return <div className="p-4 sm:p-6 md:p-8 animate-pulse text-gray-500 text-sm sm:text-base">Đang tính toán dữ liệu...</div>;

  const currentPlanMeta = planCatalog.find((plan) => plan.key === planState?.currentPlan) || null;
  const currentPlanLabel = currentPlanMeta?.title || String(planState?.currentPlan || "free").toUpperCase();

  return (
    <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 bg-gray-50/50 min-h-screen">
      <div>
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Khu vực Chủ sở hữu</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Quản lý và theo dõi các địa điểm của bạn</p>
        </div>
      </div>

      {/* 1. Hàng Thống kê nhanh */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Tổng địa điểm</p>
              <h3 className="text-lg sm:text-2xl font-bold">{stats?.totalPois || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-green-50 text-green-600 rounded-lg sm:rounded-xl flex-shrink-0">
              <PieIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Danh mục chính</p>
              <h3 className="text-base sm:text-lg font-bold truncate">
                {stats?.categories?.[0]?.category || "N/A"}
              </h3>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchStats}
          className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 hover:border-primary transition-all text-left"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-orange-50 text-orange-600 rounded-lg sm:rounded-xl flex-shrink-0">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Làm mới dữ liệu</p>
              <h3 className="text-xs sm:text-sm font-bold text-gray-400">Vừa cập nhật</h3>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 space-y-3 sm:space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 flex-col sm:flex-row">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Gói tài khoản hiện tại</p>
            <h3 className="text-base sm:text-xl font-bold uppercase flex items-center gap-2 mt-1">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
              <span className="break-words">{currentPlanLabel}</span>
            </h3>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 w-full sm:w-auto">
            <p>Ảnh đã dùng: <span className="font-bold">{stats?.usage?.usedThumbnailUploads ?? 0}</span>/{stats?.planLimits?.maxThumbnailUploads ?? 0}</p>
            <p>Bán kính audio: <span className="font-bold">{stats?.planLimits?.maxAudioRadiusMeters ?? 30}m</span></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm text-slate-700">
          <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Số dư ví: <span className="font-bold text-emerald-700">{Number(planState?.balance || 0).toLocaleString("vi-VN")}đ</span></span>
          <Link href="/wallet" className="text-primary font-semibold underline underline-offset-4 whitespace-nowrap">Nạp tiền</Link>
        </div>

        {planState?.activeSubscription?.ends_at && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <Clock3 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Premium hết hạn: {new Date(planState.activeSubscription.ends_at).toLocaleDateString("vi-VN")}</span>
          </div>
        )}
      </div>

      <section className="space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold">Đăng ký và quản lý gói</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Khi đăng ký gói trả phí, hệ thống sẽ trừ tiền trực tiếp từ ví.</p>
        </div>

        {notice && (
          <div
            className={`rounded-lg sm:rounded-2xl border p-3 sm:p-4 flex items-start gap-2 sm:gap-3 ${notice.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}
          >
            {notice.type === "success" ? (
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm">{notice.type === "success" ? "Đăng ký gói thành công" : "Đăng ký gói thất bại"}</p>
              <p className="text-xs mt-1 break-words">{notice.message}</p>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-current/30 hover:bg-white/40 flex-shrink-0"
            >
              Ẩn
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {planCatalog.map((plan) => {
            const isCurrent = planState?.currentPlan === plan.key;
            const isSubmitting = submittingPlanKey === plan.key;

            return (
              <article
                key={plan.key}
                className={`rounded-lg sm:rounded-2xl border p-3 sm:p-5 shadow-sm ${isCurrent ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black uppercase break-words">{plan.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">{plan.shortDescription}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap flex-shrink-0">Đang dùng</span>
                  )}
                </div>

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm">
                  <p className="font-bold text-slate-800">
                    Giá: {Number(plan.priceVnd || 0).toLocaleString("vi-VN")}đ
                    {plan.durationDays ? ` / ${plan.durationDays} ngày` : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-600 list-disc pl-5">
                    {(plan.features || []).map((feature: string, idx: number) => (
                      <li key={`${plan.key}-feature-${idx}`} className="line-clamp-2">{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 sm:mt-4 flex gap-2">
                  <button
                    onClick={() => handleSubscribePlan(plan.key)}
                    disabled={isSubmitting || isCurrent}
                    className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm flex-1 ${isCurrent ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                  >
                    {isSubmitting ? "Đang xử lý..." : isCurrent ? "Đang sử dụng" : "Đăng ký gói"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="bg-white rounded-lg sm:rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="font-bold text-sm sm:text-base mb-3">Lịch sử đăng ký gói</h3>
          {(planState?.history || []).length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500">Chưa có lịch sử đăng ký.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {planState.history.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg sm:rounded-xl border border-slate-100 px-2 sm:px-3 py-2 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold uppercase truncate">{item.plan_key}</p>
                    <p className="text-slate-500 text-xs">{new Date(item.created_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-emerald-700">{Number(item.amount || 0).toLocaleString("vi-VN")}đ</p>
                    <p className="text-xs text-slate-500">{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {pendingPlan && (
        <div className="fixed inset-0 z-[2200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
              <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80">Xác nhận đăng ký</p>
              <h3 className="text-base sm:text-xl font-black mt-1 sm:mt-2 flex items-center gap-2 break-words">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 flex-shrink-0" />
                {pendingPlan.title}
              </h3>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">{pendingPlan.shortDescription}</p>

              <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 space-y-2">
                <p className="text-xs sm:text-sm"><span className="font-bold">Giá:</span> {Number(pendingPlan.priceVnd || 0).toLocaleString("vi-VN")}đ{pendingPlan.durationDays ? ` / ${pendingPlan.durationDays} ngày` : ""}</p>
                <p className="text-xs sm:text-sm"><span className="font-bold">Số dư:</span> {Number(planState?.balance || 0).toLocaleString("vi-VN")}đ</p>
                <p className="text-xs sm:text-sm"><span className="font-bold">Sau đăng ký:</span> {Math.max(Number(planState?.balance || 0) - Number(pendingPlan.priceVnd || 0), 0).toLocaleString("vi-VN")}đ</p>
              </div>

              <ul className="space-y-1 list-disc pl-5 text-xs sm:text-sm text-slate-700">
                {(pendingPlan.features || []).map((feature: string, idx: number) => (
                  <li key={`pending-feature-${idx}`} className="line-clamp-2">{feature}</li>
                ))}
              </ul>

              <div className="flex justify-end gap-2 pt-2 flex-col sm:flex-row">
                <button
                  onClick={() => setPendingPlan(null)}
                  className="px-4 py-2 rounded-lg sm:rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-sm"
                  disabled={!!submittingPlanKey}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmSubscribe}
                  className="px-4 py-2 rounded-lg sm:rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 text-sm"
                  disabled={!!submittingPlanKey}
                >
                  {submittingPlanKey ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2">
        {/* 2. Sức khỏe bản dịch (Translation Health) */}
        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-6 flex items-center gap-2">
             <span>Tình trạng dịch thuật</span>
          </h2>
          <div className="space-y-2 sm:space-y-4 max-h-80 overflow-y-auto">
            {stats?.translationHealth?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {item.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-gray-700 text-xs sm:text-sm truncate">{item.name || "Chưa đặt tên"}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {item.isComplete ? (
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Hoàn tất</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded whitespace-nowrap">
                      Thiếu {item.missing}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {stats?.translationHealth?.length === 0 && (
              <p className="text-center text-gray-400 py-6 sm:py-10 italic text-xs sm:text-sm">Bạn chưa có địa điểm nào để theo dõi.</p>
            )}
          </div>
        </div>

        {/* 3. Phân bổ danh mục */}
        <div className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-6">Phân loại địa điểm</h2>
          <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-4 max-h-80 overflow-y-auto">
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