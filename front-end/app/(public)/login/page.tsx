"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { authApi } from "@/lib/api";
import { LoginCredentials } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  
  // States
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // Kiểm tra auth ban đầu
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials & { full_name?: string }>({
    email: "",
    password: "",
    full_name: "",
  });

  // 1. Kiểm tra nếu đã có thông tin user/token thì bỏ qua đăng nhập
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (token && user) {
        router.replace("/map"); // Đã đăng nhập thì đẩy về Map
      } else {
        setIsLoading(false); // Chưa đăng nhập thì hiện Form
      }
    };
    checkAuth();
  }, [router]);

  // 2. Xử lý Đăng nhập nhanh bằng Google
  const handleGoogleLogin = () => {
    // Chuyển hướng tới endpoint Google OAuth ở Back-end
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  // 3. Xử lý Submit Form (Login / Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const res = await authApi.login(formData);
        
        // 1. Lưu dữ liệu
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        // 2. PHÁT SỰ KIỆN ĐỂ HEADER CẬP NHẬT NGAY
        window.dispatchEvent(new Event("auth-change"));
        
        // 3. Chuyển trang
        router.push("/map");
      } else {
        // Logic đăng ký...
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi đăng nhập");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen khi đang check Auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl border border-border overflow-hidden transition-all duration-500">
        
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isLogin 
                ? "Đăng nhập để tiếp tục hành trình khám phá ẩm thực." 
                : "Tham gia cùng chúng tôi để nhận ưu đãi và tích điểm thưởng."}
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-border rounded-xl hover:bg-muted/50 transition-all font-semibold text-sm shadow-sm"
          >
            <FcGoogle size={22} />
            {isLogin ? "Tiếp tục với Google" : "Đăng ký nhanh với Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-medium">Hoặc dùng Email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Nguyễn Văn A"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Email / Tài khoản</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Mật khẩu</label>
                {isLogin && (
                  <button type="button" className="text-[10px] text-primary hover:underline font-bold">Quên mật khẩu?</button>
                )}
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? "Đang xử lý..." 
                : (isLogin ? "Đăng nhập ngay" : "Tạo tài khoản")}
            </button>
          </form>

          {/* Switcher */}
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Bạn chưa có tài khoản?" : "Bạn đã có tài khoản?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-extrabold hover:underline"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer decoration */}
        <div className="bg-muted/50 p-4 text-center border-t border-border">
          <p className="text-[10px] text-muted-foreground italic">
            Bằng việc tiếp tục, bạn đồng ý với Điều khoản & Chính sách của Food Tour
          </p>
        </div>
      </div>
    </div>
  );
}