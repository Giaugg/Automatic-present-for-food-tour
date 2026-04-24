"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { authApi, onlineDeviceApi, trialApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  // States
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- HÀM KHỞI TẠO SESSION & HEARTBEAT ---
  const initializeUserSession = async () => {
    try {
      // 1. Thu thập thông tin thiết bị
      const deviceData = {
        device_id: window.navigator.userAgent, // Hoặc dùng fingerprinting library
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        platform: window.navigator.platform
      };

      // 2. Tạo Session trên Server
      const sessionRes = await onlineDeviceApi.createSession(deviceData);
      const sessionId = sessionRes.data.sessionId;
      localStorage.setItem("current_session_id", sessionId);

      // 3. Thiết lập Heartbeat (mỗi 30 giây)
      const heartbeatInterval = setInterval(() => {
        onlineDeviceApi.updateActivity(sessionId).catch(() => {
          clearInterval(heartbeatInterval);
        });
      }, 30000);

      // Lưu interval ID để xóa khi logout nếu cần
      (window as any).heartbeatInterval = heartbeatInterval;
    } catch (err) {
      console.error("Failed to initialize session tracking", err);
    }
  };

  // 2. Xử lý Google Login
  const handleGoogleLogin = () => {
    toast.error("Chức năng đăng nhập Google hiện chưa được triển khai.");
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

        // Lưu thông tin cơ bản
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // 🔥 MỚI: Khởi tạo Session Tracking
        await initializeUserSession();

        // 🔥 MỚI: Kiểm tra trạng thái Trial Account
        const trialStatus = await trialApi.checkTrialStatus();
        if (trialStatus.data.isTrialUser && trialStatus.data.isExpired) {
          toast.error("Tài khoản dùng thử của bạn đã hết hạn!");
          // Có thể redirect sang trang nâng cấp/thanh toán ở đây
          // router.push("/pricing"); 
          // return;
        }

        window.dispatchEvent(new Event("auth-change"));
        toast.success("Đăng nhập thành công!");
        router.push("/map");
        
      } else {
        // --- LOGIC ĐĂNG KÝ ---
        const payload = {
          ...formData,
          username: formData.username || formData.email.split('@')[0]
        };

        const res = await authApi.register(payload);
        toast.success("Đăng ký tài khoản thành công!");

        if (res.data.token && res.data.user) {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          
          // 🔥 MỚI: Khởi tạo Session Tracking cho user mới đăng ký
          await initializeUserSession();
          
          window.dispatchEvent(new Event("auth-change"));
          router.push("/map");
        } else {
          setIsLogin(true);
          toast.error("Vui lòng đăng nhập với tài khoản vừa tạo.");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-black border-t-yellow-400 rounded-full animate-spin"></div>
      <p className="font-black uppercase italic">Securing Connection...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans text-black">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-2xl border-4 border-black overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              {isLogin ? "Login" : "Register"}
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              {isLogin ? "Session tracking enabled" : "Join the Food Tour"}
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
              className="w-full py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(234,179,8,1)] hover:bg-slate-800 disabled:opacity-50 transition-all active:translate-y-1 active:shadow-none"
            >
              {isSubmitting ? "Syncing..." : isLogin ? "Enter Map" : "Create Account"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black uppercase underline decoration-2 underline-offset-4 hover:text-yellow-600"
            >
              {isLogin ? "Need an account? Sign up" : "Have account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}