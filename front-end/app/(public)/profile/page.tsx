"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/auth";
import { authApi } from "@/lib/api";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authApi.getMe();
        setUser(res.data);
      } catch (err) {
        console.error("Lỗi khi tải hồ sơ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="p-20 text-center font-bold">Đang tải hồ sơ...</div>;
  if (!user) return <div className="p-20 text-center text-destructive">Bạn cần đăng nhập để xem trang này.</div>;

  return (
    <main className="min-h-screen bg-muted/30 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header Profile */}
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-background">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-1 right-1 bg-background p-2 rounded-full shadow-lg border border-border hover:text-primary transition-colors">
                📸
              </button>
            </div>

            {/* User Basic Info */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-3xl font-black tracking-tight">{user.full_name}</h1>
              <p className="text-muted-foreground font-medium">{user.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase">
                  {user.role}
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full uppercase">
                  ⭐ {user.points} Điểm tích lũy
                </span>
              </div>
            </div>

            {/* Wallet Quick View */}
            <div className="w-full md:w-auto bg-muted/50 p-6 rounded-2xl border border-border/50 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Số dư ví hiện tại</p>
              <p className="text-2xl font-black text-emerald-600">
                {Number(user.balance).toLocaleString("vi-VN")}đ
              </p>
              <Link href="/wallet" className="inline-block mt-3 text-sm font-bold text-primary hover:underline">
                Nạp thêm tiền →
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Section: Thông tin cá nhân */}
          <div className="bg-card rounded-3xl p-8 shadow-sm border border-border space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              👤 Thông tin tài khoản
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Họ và tên</label>
                <input 
                  type="text" 
                  defaultValue={user.full_name}
                  className="w-full mt-1 px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Tên đăng nhập</label>
                <input 
                  type="text" 
                  disabled 
                  defaultValue={user.username || "Chưa thiết lập"}
                  className="w-full mt-1 px-4 py-3 bg-muted/10 border border-border rounded-xl text-muted-foreground cursor-not-allowed"
                />
              </div>
              <button className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                Lưu thay đổi
              </button>
            </div>
          </div>

          {/* Section: Bảo mật & Khác */}
          <div className="bg-card rounded-3xl p-8 shadow-sm border border-border space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🔒 Bảo mật & Hoạt động
            </h2>
            <div className="space-y-3">
              <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all font-bold">
                <span>Đổi mật khẩu</span>
                <span>→</span>
              </button>
              <Link href="/profile/purchases" className="w-full flex justify-between items-center p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all font-bold">
                <span>Lịch sử mua Tour</span>
                <span>→</span>
              </Link>
              <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all font-bold text-destructive">
                <span>Xóa tài khoản</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}