"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  // States
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hợp nhất dữ liệu vào 1 object duy nhất để dễ quản lý
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });

  // 1. Kiểm tra Auth ban đầu
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/map");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  // 2. Xử lý Google Login
  const handleGoogleLogin = () => {
    toast.error("Chức năng đăng nhập Google hiện chưa được triển khai. Vui lòng sử dụng phương thức đăng nhập thông thường.");
    // window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  // 3. Xử lý Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        // --- LOGIC ĐĂNG NHẬP ---
        const res = await authApi.login({
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("auth-change"));
        router.push("/map");
        
      } else {
        // --- LOGIC ĐĂNG KÝ ---
        // Backend yêu cầu username, nếu form không có ô nhập username riêng, 
        // ta lấy phần trước @ của email làm username mặc định.
        const payload = {
          ...formData,
          username: formData.username || formData.email.split('@')[0]
        };

        const res = await authApi.register(payload);
        toast.success("Đăng ký tài khoản thành công!");

        if (res.data.token && res.data.user) {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          window.dispatchEvent(new Event("auth-change"));
          router.push("/map");
        } else {
          setIsLogin(true);
          toast.error("Vui lòng đăng nhập với tài khoản vừa tạo.");
        }
      }
    } catch (err) {
      toast.error( "Thao tác thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center animate-pulse font-bold">LOADING...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans text-black">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl border-4 border-black overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              {isLogin ? "Login" : "Register"}
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              {isLogin ? "Welcome Back Explorer" : "Join the Food Tour"}
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-4 border-black rounded-xl hover:bg-yellow-400 transition-all font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            <FcGoogle size={20} />
            Google Connect
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border-2 border-black rounded-xl focus:bg-yellow-50 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                {/* Ô nhập Username (Tùy chọn bổ sung để khớp API) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase ml-1">Username</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border-2 border-black rounded-xl focus:bg-yellow-50 outline-none"
                    placeholder="vanna123"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:bg-yellow-50 outline-none"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase ml-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl focus:bg-yellow-50 outline-none"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(234,179,8,1)] hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Processing..." : isLogin ? "Enter Map" : "Create Account"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-primary"
            >
              {isLogin ? "Need an account? Sign up" : "Have account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}