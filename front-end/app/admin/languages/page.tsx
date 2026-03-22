"use client";

import { useState, useEffect } from "react";
import { languageApi } from "@/lib/api"; // Thay đổi đường dẫn cho đúng project của bạn
import toast from "react-hot-toast";

// Định nghĩa kiểu dữ liệu dựa trên API
interface Language {
  code: string;
  name: string;
  locale: string;
  is_active: boolean;
}

export default function AdminLanguageManager() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await languageApi.getAll();
      // axios trả về data trong res.data
      setLanguages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Không thể tải danh sách ngôn ngữ");
    } finally {
      setLoading(false);
    }
  };

  // 1. Xử lý Bật/Tắt trạng thái (Dùng languageApi.update)
  const handleToggleStatus = async (lang: Language) => {
    try {
      setActionLoading(lang.code);
      const newStatus = !lang.is_active;
      
      const res = await languageApi.update(lang.code, { 
        ...lang, // Gửi kèm name và locale theo yêu cầu của Controller
        is_active: newStatus 
      });

      setLanguages(prev => prev.map(l => l.code === lang.code ? res.data : l));
      toast.success(`${newStatus ? "Đã bật" : "Đã tắt"} tiếng ${lang.name}`);
    } catch (err) {
      toast.error("Cập nhật trạng thái thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Xử lý Đồng bộ (Dùng axios trực tiếp vì languageApi chưa có method này, hoặc bạn tự thêm vào service)
  const handleSyncPOI = async (code: string) => {
    try {
      setActionLoading(`sync-${code}`);
      // Gọi trực tiếp đến endpoint sync đã định nghĩa trong router
      const res = await axios.post(`/api/languages/${code}/sync`); 
      toast.success(res.data.message, { duration: 4000 });
    } catch (err) {
      toast.error("Lỗi khi bắt đầu đồng bộ");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = languages.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="bg-white shadow-2xl rounded-3xl border border-gray-100 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Hệ thống Ngôn ngữ</h1>
            <p className="text-slate-400 text-sm mt-1">Cấu hình Database & Dịch thuật hồi tố</p>
          </div>
          
          <div className="relative group w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm kiếm nhanh..."
              className="w-full bg-slate-700/50 border border-slate-600 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3 opacity-30">🔍</span>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">
                <th className="px-8 py-5 border-b border-gray-100">ISO</th>
                <th className="px-8 py-5 border-b border-gray-100 text-left">Tên hiển thị</th>
                <th className="px-8 py-5 border-b border-gray-100 text-center">Trạng thái</th>
                <th className="px-8 py-5 border-b border-gray-100 text-right">Điều khiển</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-24 text-slate-300 italic">Đang tải dữ liệu từ API...</td></tr>
              ) : filtered.map((lang) => (
                <tr key={lang.code} className="hover:bg-blue-50/30 transition-all duration-200">
                  <td className="px-8 py-6 text-center">
                    <span className="bg-blue-50 text-blue-700 font-mono font-bold px-3 py-1 rounded-lg text-sm border border-blue-100 shadow-sm">
                      {lang.code}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-slate-800 font-bold">{lang.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang.locale}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button
                      disabled={actionLoading === lang.code}
                      onClick={() => handleToggleStatus(lang)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ring-offset-2 focus:ring-2 ${
                        lang.is_active ? "bg-indigo-600 ring-indigo-200" : "bg-slate-200 ring-slate-100"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${lang.is_active ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {lang.is_active && (
                      <button
                        onClick={() => handleSyncPOI(lang.code)}
                        disabled={actionLoading === `sync-${lang.code}`}
                        className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl text-xs font-black transition-all border border-amber-200 uppercase tracking-tighter disabled:opacity-30"
                      >
                        {actionLoading === `sync-${lang.code}` ? "Processing..." : "🔄 Đồng bộ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="p-6 bg-slate-50 border-t border-gray-100 flex items-center gap-4 text-slate-500">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 text-lg shadow-sm">💡</div>
          <p className="text-xs leading-relaxed max-w-2xl">
            Sử dụng <strong>Đồng bộ</strong> để tự động tạo bản dịch cho các địa điểm còn thiếu bằng AI. 
            Hệ thống sẽ dịch từ tiếng Việt sang ngôn ngữ đích với khoảng nghỉ 2 giây mỗi POI để đảm bảo ổn định.
          </p>
        </div>
      </div>
    </div>
  );
}