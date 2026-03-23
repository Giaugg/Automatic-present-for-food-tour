"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authApi, languageApi } from "@/lib/api";
import { User } from "@/types/auth";
import { Languages, ChevronDown, Check, Loader2 } from "lucide-react";

// Kiểu dữ liệu cho Language từ Backend
interface Language {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // --- State cho Ngôn ngữ Dynamic ---
  const [activeLanguages, setActiveLanguages] = useState<Language[]>([]);
  const [currentLangCode, setCurrentLangCode] = useState<string>("vi-VN");
  const [showLangModal, setShowLangModal] = useState(false);
  const [isLoadingLangs, setIsLoadingLangs] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // 1. Fetch danh sách ngôn ngữ đang hoạt động từ DB
  const fetchActiveLanguages = useCallback(async () => {
    try {
      setIsLoadingLangs(true);
      const res = await languageApi.getActive();
      // Giả sử API trả về { success: true, data: Language[] }
      if (res.data) {
        setActiveLanguages(res.data.data);
      }
    } catch (err) {
      console.error("❌ Lỗi fetch ngôn ngữ:", err);
    } finally {
      setIsLoadingLangs(false);
    }
  }, []);

  // 2. Logic thay đổi ngôn ngữ
  const handleSelectLanguage = (code: string) => {
    setCurrentLangCode(code);
    localStorage.setItem("preferred_lang", code);
    setShowLangModal(false);
    
    // Phát sự kiện để các component khác (như Map hoặc POI Detail) tự động cập nhật data
    window.dispatchEvent(new Event("lang-change"));
  };

  const handleMarkerClick = async (id: string) => {
    const currentLang = localStorage.getItem("preferred_lang") || "vi-VN";
    try {
      const res = await poiApi.getById(id, currentLang);
      setSelectedPoi(res.data); // Data lúc này đã có sẵn .name và .description đúng ngôn ngữ
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Khởi tạo dữ liệu
  useEffect(() => {
    setMounted(true);
    fetchActiveLanguages();

    const savedLang = localStorage.getItem("preferred_lang");
    if (savedLang) {
      setCurrentLangCode(savedLang);
    } else if (pathname === "/map") {
      setShowLangModal(true);
    }
  }, [fetchActiveLanguages, pathname]);

  // --- Logic Auth (Giữ nguyên) ---
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
    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, [syncUser]);

  // Helper hiển thị Flag dựa trên mã code (vi-VN, en-US, ja-JP)
  const getFlag = (code: string) => {
    const c = code.toLowerCase();
    if (c.includes("vi")) return "🇻🇳";
    if (c.includes("en")) return "🇺🇸";
    if (c.includes("ja")) return "🇯🇵";
    return "🌐";
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border sticky top-0 z-[1001] shadow-sm">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black text-primary tracking-tighter">
              FOOD TOUR
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link href="/map" className={`text-sm font-bold transition-colors ${pathname === "/map" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Bản đồ
              </Link>
              {/* <Link href="/tours" className={`text-sm font-bold transition-colors ${pathname === "/tours" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Tours
              </Link> */}
              {user?.role === "admin" && (
                <Link href="/admin" className={`text-sm font-bold transition-colors ${pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  Quản trị
                </Link>
              )}
              {user?.role === "owner" && (
                <Link 
                  href="/owner" 
                  className={`text-sm font-bold transition-colors ${pathname.startsWith("/owner") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Quản lý địa điểm
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* --- BỘ CHỌN NGÔN NGỮ DYNAMIC --- */}
            <div className="relative group mr-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border min-w-[80px] justify-center">
                {isLoadingLangs ? (
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span className="text-sm">{getFlag(currentLangCode)}</span>
                    <span className="text-xs font-bold uppercase">{currentLangCode.split('-')[0]}</span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </>
                )}
              </button>
              
              {!isLoadingLangs && activeLanguages.length > 0 && (
                <div className="absolute right-0 top-full pt-2 w-60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[1002]">
                  <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1">
                    {activeLanguages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>{lang.code}</span>
                          <span>{lang.name}</span>
                        </div>
                        {currentLangCode === lang.code && <Check size={14} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* --- PHẦN USER --- */}
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
                        <Link href="/profile" className="block px-3 py-2 text-sm rounded-lg font-medium hover:bg-muted transition-colors">
                          Trang cá nhân
                        </Link>
                        <hr className="my-1 border-border/50" />
                        <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-destructive font-bold hover:bg-destructive/10 rounded-lg transition-colors">
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                Đăng nhập
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>

      {/* --- MODAL CHỌN NGÔN NGỮ KHỞI TẠO (DYNAMIC) --- */}
      {showLangModal && activeLanguages.length > 0 && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border border-border animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Languages size={40} className="text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">CHỌN NGÔN NGỮ</h2>
              <p className="text-muted-foreground text-sm font-medium pb-4">
                Hãy chọn ngôn ngữ để chúng tôi cung cấp thuyết minh bản đồ phù hợp nhất với bạn.
              </p>
              
              <div className="grid gap-3">
                {activeLanguages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <span className="text-lg font-bold">
                      {getFlag(lang.code)} <span className="ml-2">{lang.name}</span>
                    </span>
                    <div className="w-6 h-6 rounded-full border-2 border-border group-hover:border-primary flex items-center justify-center">
                      <div className={`w-3 h-3 rounded-full bg-primary transition-opacity ${currentLangCode === lang.code ? 'opacity-100' : 'opacity-0'}`} />
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