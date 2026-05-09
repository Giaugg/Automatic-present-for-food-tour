"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authApi, paymentApi } from "@/lib/api";
import { User } from "@/types/auth";

type WalletTransaction = {
  id: string;
  txn_type: string;
  amount: number | string;
  balance_before: number | string;
  balance_after: number | string;
  note?: string;
  created_at: string;
  ref_type?: string;
  ref_id?: string;
};

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const labelByType = (type: string) => {
  if (type === "topup") return "Nap tien";
  if (type === "tour_purchase") return "Mua tour";
  return type;
};

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>("100000");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [meRes, txRes] = await Promise.all([
        authApi.getMe(),
        authApi.getWalletTransactions(30),
      ]);

      setUser(meRes.data);
      setTransactions(txRes.data || []);
      localStorage.setItem("user", JSON.stringify(meRes.data));
      window.dispatchEvent(new Event("auth-change"));
    } catch (error) {
      toast.error("Khong the tai du lieu vi. Vui long dang nhap lai.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const runCheckPaymentStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const appTransId = params.get("zp_app_trans_id");
      if (!appTransId) return;

      try {
        const res = await paymentApi.queryZaloPayStatus(appTransId);
        if (res.data?.local_status === "paid") {
          toast.success("Thanh toan ZaloPay thanh cong, vi da duoc cong tien.");
        } else {
          toast("Don hang chua thanh toan. Ban co the thu lai sau.");
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Khong the kiem tra trang thai don ZaloPay");
      } finally {
        await loadData();
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("zp_app_trans_id");
        window.history.replaceState({}, "", nextUrl.toString());
      }
    };

    runCheckPaymentStatus();
  }, [loadData]);

  const parsedAmount = useMemo(() => Number(amount || 0), [amount]);

  const handleTopUp = async () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("So tien nap phai lon hon 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.topUp(parsedAmount);
      toast.success("Nap tien thanh cong");
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Nap tien that bai");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopUpWithZaloPay = async () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1000) {
      toast.error("So tien nap toi thieu la 1,000d");
      return;
    }

    setIsPayingOnline(true);
    try {
      const res = await paymentApi.createZaloPayTopupOrder(parsedAmount);
      const orderUrl = res.data?.order_url;
      if (!orderUrl) {
        toast.error("Khong nhan duoc link thanh toan tu ZaloPay");
        return;
      }
      window.location.href = orderUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Tao don ZaloPay that bai");
    } finally {
      setIsPayingOnline(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 sm:p-12 md:p-16 text-center font-bold text-sm sm:text-base">Dang tai vi...</div>;
  }

  if (!user) {
    return <div className="p-6 sm:p-12 md:p-16 text-center font-bold text-sm sm:text-base text-red-600">Ban can dang nhap de su dung vi.</div>;
  }

  return (
    <main className="min-h-screen bg-muted/30 py-4 sm:py-6 md:py-8 lg:py-12">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-5xl space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">Vi cua toi</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 sm:mt-2">Nap tien vao vi de mua tour nhanh hon.</p>
          </div>
          <Link href="/profile" className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border bg-white text-xs sm:text-sm font-bold hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
            Quay lai ho so
          </Link>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[360px_1fr] gap-4 sm:gap-6">
          <div className="bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-4 sm:space-y-5 h-fit">
            <div>
              <p className="text-xs uppercase text-muted-foreground font-bold">So du hien tai</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 sm:mt-2">{Number(user.balance).toLocaleString("vi-VN")}d</p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs uppercase text-muted-foreground font-bold">Chon nhanh</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="px-2 sm:px-3 py-2 sm:py-3 rounded-lg border text-xs sm:text-sm font-bold hover:bg-muted transition-colors"
                  >
                    {v.toLocaleString("vi-VN")}d
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <label className="text-xs uppercase text-muted-foreground font-bold">So tien muon nap</label>
              <input
                type="number"
                min={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg sm:rounded-xl px-3 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Nhap so tien..."
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={handleTopUpWithZaloPay}
                disabled={isPayingOnline}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 hover:opacity-90 transition-opacity text-sm"
              >
                {isPayingOnline ? "Dang tao don ZaloPay..." : "Thanh toan bang ZaloPay"}
              </button>

              <button
                onClick={handleTopUp}
                disabled={isSubmitting}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-black text-white font-bold disabled:opacity-60 hover:opacity-90 transition-opacity text-sm"
              >
                {isSubmitting ? "Dang xu ly..." : "Nap tien noi bo (test)"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Ban co the nap nhanh bang ZaloPay hoac dung luong noi bo de test.
            </p>
          </div>

          <div className="bg-white border rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b bg-muted/30">
              <h2 className="font-bold text-sm sm:text-base">Lich su giao dich</h2>
            </div>

            {transactions.length === 0 ? (
              <div className="p-6 sm:p-10 text-center text-muted-foreground text-sm">Chua co giao dich nao.</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {transactions.map((tx) => {
                  const isTopup = tx.txn_type === "topup";
                  return (
                    <article key={tx.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm sm:text-base">{labelByType(tx.txn_type)}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.note || "Khong co ghi chu"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.created_at).toLocaleString("vi-VN")}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`font-black text-sm sm:text-base ${isTopup ? "text-emerald-600" : "text-red-600"}`}>
                          {isTopup ? "+" : ""}{Number(tx.amount).toLocaleString("vi-VN")}d
                        </p>
                        <p className="text-xs text-muted-foreground">
                          So du: {Number(tx.balance_after).toLocaleString("vi-VN")}d
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
