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

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Đang tính toán dữ liệu...</div>;

  const currentPlanMeta = planCatalog.find((plan) => plan.key === planState?.currentPlan) || null;
  const currentPlanLabel = currentPlanMeta?.title || String(planState?.currentPlan || "free").toUpperCase();

  return (
    <main className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khu vực Chủ sở hữu</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi các địa điểm của bạn</p>
        </div>
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

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 font-medium">Gói tài khoản hiện tại</p>
            <h3 className="text-xl font-bold uppercase flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              {currentPlanLabel}
            </h3>
          </div>
          <div className="text-sm text-gray-600">
            <p>Ảnh đã dùng: <span className="font-bold">{stats?.usage?.usedThumbnailUploads ?? 0}</span>/{stats?.planLimits?.maxThumbnailUploads ?? 0}</p>
            <p>Bán kính audio tối đa: <span className="font-bold">{stats?.planLimits?.maxAudioRadiusMeters ?? 30}m</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Wallet className="w-4 h-4 text-emerald-600" />
          Số dư ví hiện tại: <span className="font-bold text-emerald-700">{Number(planState?.balance || 0).toLocaleString("vi-VN")}đ</span>
          <Link href="/wallet" className="ml-2 text-primary font-semibold underline underline-offset-4">Nạp tiền</Link>
        </div>

        {planState?.activeSubscription?.ends_at && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
            <Clock3 className="w-4 h-4" />
            Premium hết hạn vào: {new Date(planState.activeSubscription.ends_at).toLocaleString("vi-VN")}
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Đăng ký và quản lý gói</h2>
          <p className="text-sm text-muted-foreground">Khi đăng ký gói trả phí, hệ thống sẽ trừ tiền trực tiếp từ ví.</p>
        </div>

        {notice && (
          <div
            className={`rounded-2xl border p-4 flex items-start gap-3 ${notice.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}
          >
            {notice.type === "success" ? (
              <ShieldCheck className="w-5 h-5 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{notice.type === "success" ? "Đăng ký gói thành công" : "Đăng ký gói thất bại"}</p>
              <p className="text-sm mt-1">{notice.message}</p>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-current/30 hover:bg-white/40"
            >
              Ẩn
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {planCatalog.map((plan) => {
            const isCurrent = planState?.currentPlan === plan.key;
            const isSubmitting = submittingPlanKey === plan.key;

            return (
              <article
                key={plan.key}
                className={`rounded-2xl border p-5 shadow-sm ${isCurrent ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black uppercase">{plan.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{plan.shortDescription}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Đang dùng</span>
                  )}
                </div>

                <div className="mt-4 text-sm">
                  <p className="font-bold text-slate-800">
                    Giá: {Number(plan.priceVnd || 0).toLocaleString("vi-VN")}đ
                    {plan.durationDays ? ` / ${plan.durationDays} ngày` : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-600 list-disc pl-5">
                    {(plan.features || []).map((feature: string, idx: number) => (
                      <li key={`${plan.key}-feature-${idx}`}>{feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleSubscribePlan(plan.key)}
                    disabled={isSubmitting || isCurrent}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm ${isCurrent ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                  >
                    {isSubmitting ? "Đang xử lý..." : isCurrent ? "Đang sử dụng" : "Đăng ký gói"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold mb-3">Lịch sử đăng ký gói</h3>
          {(planState?.history || []).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có lịch sử đăng ký.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {planState.history.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold uppercase">{item.plan_key}</p>
                    <p className="text-slate-500">{new Date(item.created_at).toLocaleString("vi-VN")}</p>
                  </div>
                  <div className="text-right">
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
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
              <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80">Xác nhận đăng ký</p>
              <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                {pendingPlan.title}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">{pendingPlan.shortDescription}</p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-sm"><span className="font-bold">Giá:</span> {Number(pendingPlan.priceVnd || 0).toLocaleString("vi-VN")}đ{pendingPlan.durationDays ? ` / ${pendingPlan.durationDays} ngày` : ""}</p>
                <p className="text-sm"><span className="font-bold">Số dư hiện tại:</span> {Number(planState?.balance || 0).toLocaleString("vi-VN")}đ</p>
                <p className="text-sm"><span className="font-bold">Sau khi đăng ký:</span> {Math.max(Number(planState?.balance || 0) - Number(pendingPlan.priceVnd || 0), 0).toLocaleString("vi-VN")}đ</p>
              </div>

              <ul className="space-y-1 list-disc pl-5 text-sm text-slate-700">
                {(pendingPlan.features || []).map((feature: string, idx: number) => (
                  <li key={`pending-feature-${idx}`}>{feature}</li>
                ))}
              </ul>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPendingPlan(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  disabled={!!submittingPlanKey}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmSubscribe}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
                  disabled={!!submittingPlanKey}
                >
                  {submittingPlanKey ? "Đang xử lý..." : "Xác nhận đăng ký"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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