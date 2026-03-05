"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation"; // Thêm usePathname
import { authApi } from "@/lib/api";
import { User } from "@/types/auth";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Lấy đường dẫn hiện tại (ví dụ: /map)

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }, [router]);

  const syncUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await authApi.getMe();
      const latestUser = res.data;
      setUser(latestUser);
      localStorage.setItem("user", JSON.stringify(latestUser));
    } catch (err) {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    setMounted(true);
    syncUser();
    window.addEventListener("auth-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [syncUser]);

  // Hàm helper để kiểm tra xem link có đang active không
  const isActive = (path: string) => pathname === path;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-[1001] shadow-sm">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black text-primary tracking-tighter">
              FOOD TOUR
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {/* Link Bản đồ */}
              <Link 
                href="/map" 
                className={`text-sm font-bold transition-colors ${
                  isActive("/map") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bản đồ
              </Link>

              {/* Link Tours */}
              <Link 
                href="/tours" 
                className={`text-sm font-bold transition-colors ${
                  isActive("/tours") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tours
              </Link>

              {/* Link Quản trị */}
              {user?.role === "admin" && (
                <Link 
                  href="/admin" 
                  className={`text-sm font-bold transition-colors ${
                    pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Quản trị
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end leading-tight border-r border-border pr-4">
                  <span className="text-sm font-bold text-emerald-600">
                    {user.balance.toLocaleString("vi-VN")}đ
                  </span>
                  <span className="text-[10px] font-bold text-orange-500 uppercase">
                    ⭐ {user.points} điểm
                  </span>
                </div>

                <div className="relative group">
                  <button className="flex items-center gap-2 p-0.5 rounded-full border-2 border-transparent hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </button>

                  <div className="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1002]">
                    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                      <div className="px-4 py-3 bg-muted/20 border-b border-border text-foreground">
                        <p className="text-sm font-bold truncate">{user.full_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                      
                      <div className="p-1">
                        <Link href="/profile" className={`block px-3 py-2 text-sm rounded-lg font-medium transition-colors ${isActive("/profile") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                          Trang cá nhân
                        </Link>
                        <Link href="/wallet" className={`block px-3 py-2 text-sm rounded-lg font-medium transition-colors ${isActive("/wallet") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                          Ví tiền của tôi
                        </Link>
                        <hr className="my-1 border-border/50" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm text-destructive font-bold hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
}