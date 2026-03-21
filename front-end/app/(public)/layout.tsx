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
      {/* Public Header */}
      <header className="bg-card border-b border-border p-4">
        <nav className="container mx-auto flex items-center gap-6">
          <Link href="*" className="text-xl font-bold text-foreground">
            Food Tour
          </Link>
          <Link
            href="/map"
            className="text-muted-foreground hover:text-foreground"
          >
            Bản đồ
          </Link>
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground"
          >
            Quản trị
          </Link>
        </nav>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>
    </div>
  );
}