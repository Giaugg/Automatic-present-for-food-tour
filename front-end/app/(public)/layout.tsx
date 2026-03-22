"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";
import { User } from "@/types/auth";
import { Languages, ChevronDown, Check } from "lucide-react"; // Import thêm icon

const LANGUAGES = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<string>("vi");
  const [showLangModal, setShowLangModal] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  // --- Logic Ngôn ngữ ---
  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    localStorage.setItem("preferred_lang", code);
    setShowLangModal(false);
    // Phát sự kiện để các component khác (như Map) tự động cập nhật
    window.dispatchEvent(new Event("lang-change"));
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("preferred_lang");
    if (savedLang) {
      setLanguage(savedLang);
    } else if (pathname === "/map") {
      // Nếu vào trang map mà chưa có ngôn ngữ, hiện modal chọn
      setShowLangModal(true);
    }
  }, [pathname]);

  // --- Logic Auth (Giữ nguyên của bạn) ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }, [router]);

  const syncUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setUser(null); return; }
    try {
      const res = await authApi.getMe();
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) { handleLogout(); }
  }, [handleLogout]);

  useEffect(() => {
    setMounted(true);
    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, [syncUser]);

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
              <Link href="/map" className={`text-sm font-bold ${pathname === "/map" ? "text-primary" : "text-muted-foreground"}`}>
                Bản đồ
              </Link>
              <Link href="/tours" className={`text-sm font-bold ${pathname === "/tours" ? "text-primary" : "text-muted-foreground"}`}>
                Tours
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* --- Bộ chọn ngôn ngữ trên Header --- */}
            <div className="relative group mr-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border">
                <Languages size={16} className="text-primary" />
                <span className="text-xs font-bold uppercase">{language}</span>
                <ChevronDown size={14} />
              </button>
              
              <div className="absolute right-0 top-full pt-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[1002]">
                <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                    >
                      <span>{lang.flag} {lang.name}</span>
                      {language === lang.code && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* --- Phần User (Giữ nguyên) --- */}
            {user ? (
               <div className="flex items-center gap-4">
                  {/* ... code cũ của bạn ... */}
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
               </div>
            ) : (
              <Link href="/login" className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold">
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>

      {/* --- Modal chọn ngôn ngữ khi mới vào trang Map --- */}
      {showLangModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-border animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Languages size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">CHỌN NGÔN NGỮ</h2>
              <p className="text-muted-foreground text-sm font-medium">
                Vui lòng chọn ngôn ngữ để trải nghiệm bản đồ thuyết minh tốt nhất.
              </p>
              
              <div className="grid gap-3 pt-6">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <span className="text-lg font-bold">
                      {lang.flag} <span className="ml-2">{lang.name}</span>
                    </span>
                    <div className="w-6 h-6 rounded-full border-2 border-border group-hover:border-primary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}