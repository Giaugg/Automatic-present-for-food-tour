"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tourApi } from "@/lib/api";
import { TourPurchase } from "@/types/tour";

type LoadState = "loading" | "ready" | "error";

const statusLabel = (status: string) => {
  if (status === "paid") return "Da mua";
  if (status === "completed") return "Da hoan thanh";
  if (status === "refunded") return "Da hoan tien";
  return status;
};

export default function TourPurchaseHistoryPage() {
  const [items, setItems] = useState<TourPurchase[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const load = async () => {
      try {
        setState("loading");
        const res = await tourApi.getMyPurchases("vi-VN");
        setItems(res.data || []);
        setState("ready");
      } catch (error) {
        console.error("Loi tai lich su tour:", error);
        setState("error");
      }
    };

    load();
  }, []);

  const totals = useMemo(() => {
    const totalSpent = items.reduce((sum, item) => sum + Number(item.purchase_price || 0), 0);
    const completedCount = items.filter((item) => item.status === "completed").length;
    return {
      totalTours: items.length,
      totalSpent,
      completedCount,
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-muted/30 py-12">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Lich su mua Tour</h1>
            <p className="text-muted-foreground">Theo doi cac tour ban da mua va tien do tham gia.</p>
          </div>
          <Link href="/profile" className="px-4 py-2 rounded-xl border bg-white text-sm font-bold hover:bg-gray-50">
            Quay lai ho so
          </Link>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs uppercase text-muted-foreground font-bold">Tong so tour</p>
            <p className="text-2xl font-black mt-1">{totals.totalTours}</p>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs uppercase text-muted-foreground font-bold">Da hoan thanh</p>
            <p className="text-2xl font-black mt-1">{totals.completedCount}</p>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <p className="text-xs uppercase text-muted-foreground font-bold">Tong chi tieu</p>
            <p className="text-2xl font-black mt-1 text-emerald-600">
              {totals.totalSpent.toLocaleString("vi-VN")}d
            </p>
          </div>
        </section>

        <section className="bg-white border rounded-2xl overflow-hidden">
          {state === "loading" && (
            <div className="p-8 text-center text-muted-foreground font-semibold">Dang tai lich su mua tour...</div>
          )}

          {state === "error" && (
            <div className="p-8 text-center text-red-600 font-semibold">
              Khong the tai lich su tour. Vui long dang nhap lai va thu lai.
            </div>
          )}

          {state === "ready" && items.length === 0 && (
            <div className="p-10 text-center space-y-3">
              <p className="font-bold">Ban chua mua tour nao.</p>
              <Link href="/map" className="inline-block px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold">
                Kham pha ban do
              </Link>
            </div>
          )}

          {state === "ready" && items.length > 0 && (
            <div className="divide-y">
              {items.map((item) => {
                const progressText = `${item.progress_step || 0}/${item.total_steps || 0}`;
                return (
                  <article key={item.purchase_id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <h2 className="text-lg font-bold">{item.title || "(Chua co tieu de)"}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.summary || "Khong co mo ta"}</p>
                      <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Tien do: {progressText}</span>
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">Trang thai: {statusLabel(item.status)}</span>
                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                          Gia mua: {Number(item.purchase_price || 0).toLocaleString("vi-VN")}d
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>
                        Mua luc: {new Date(item.purchased_at).toLocaleString("vi-VN")}
                      </p>
                      {item.completed_at && (
                        <p>
                          Hoan thanh: {new Date(item.completed_at).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
