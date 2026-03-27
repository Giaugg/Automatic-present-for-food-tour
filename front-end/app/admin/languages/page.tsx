"use client";

import { useState, useEffect } from "react";
import { languageApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Language {
  id: string; // Đổi thành string nếu dùng UUID
  code: string;
  name: string;
  locale: string; // Bổ sung trường này
  is_active: boolean;
}

export default function AdminLanguageManager() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await languageApi.getAdminAll();
      setLanguages(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.log("Lỗi khi tải ngôn ngữ:", err);
      toast.error("Không thể tải danh sách ngôn ngữ");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (lang: Language) => {
    try {
      setActionLoading(lang.id);
      const newStatus = !lang.is_active;

      // GỌI ĐÚNG HÀM PATCH THEO ROUTE: /languages/:id/status
      const res = await languageApi.toggleStatus(lang.id, newStatus);

      if (res.data.success) {
        // Cập nhật lại state cục bộ để giao diện đổi màu nút ngay lập tức
        setLanguages(prev => prev.map(l => 
          l.id === lang.id ? { ...l, is_active: newStatus } : l
        ));
        toast.success(`Đã ${newStatus ? 'bật' : 'tắt'} thành công!`);
      }
    } catch (err) {
      console.log("Lỗi kết nối:", err);
      toast.error("Không thể kết nối đến máy chủ (Network Error)");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncPOI = async (lang: Language) => {
    try {
      setActionLoading(`sync-${lang.id}`);
      
      console.log(`Đang gọi API đồng bộ dịch thuật cho ngôn ngữ: ${lang.name} (ID: ${lang.id})`);

      // TRUYỀN ID (UUID) THAY VÌ CODE
      await languageApi.syncTranslate(lang.id); 
      
      toast.success(`Đang thực hiện dịch thuật cho ${lang.name}...`);
    } catch (err) {
      toast.error("Lỗi hệ thống khi đồng bộ");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = languages.filter(l => {
    const name = (l.name || "").toLowerCase();
    const code = (l.code || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = name.includes(search) || code.includes(search);
    const matchesActive = showOnlyActive ? l.is_active === true : true;
    
    return matchesSearch && matchesActive;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="bg-white shadow-2xl rounded-3xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Hệ thống Ngôn ngữ</h1>
            <p className="text-slate-400 text-sm mt-1">Cấu hình Database & Dịch thuật hồi tố</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                showOnlyActive 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30" 
                : "bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showOnlyActive ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
              {showOnlyActive ? "Đang hiện: Đã bật" : "Hiện tất cả"}
            </button>

            <div className="relative group w-full md:w-64">
              <input
                type="text"
                placeholder="Tìm kiếm nhanh..."
                className="w-full bg-slate-700/50 border border-slate-600 text-white pl-10 pr-4 py-2.5 rounded-xl outline-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
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
                <tr><td colSpan={4} className="text-center py-24 text-slate-300 italic">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-24 text-slate-400 italic">Không tìm thấy dữ liệu</td></tr>
              ) : filtered.map((lang) => (
                <tr key={lang.id} className="hover:bg-blue-50/30 transition-all duration-200">
                  {/* Cột 1: ISO */}
                  <td className="px-8 py-6 text-center">
                    <span className="bg-blue-50 text-blue-700 font-mono font-bold px-3 py-1 rounded-lg text-sm border border-blue-100">
                      {lang.code}
                    </span>
                  </td>
                  {/* Cột 2: Tên */}
                  <td className="px-8 py-6 text-left">
                    <div className="text-slate-800 font-bold">{lang.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{lang.locale || 'N/A'}</div>
                  </td>
                  {/* Cột 3: Trạng thái */}
                  <td className="px-8 py-6 text-center">
                    <button
                      disabled={actionLoading === lang.id}
                      onClick={() => handleToggleStatus(lang)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ${
                        lang.is_active ? "bg-indigo-600" : "bg-slate-200"
                      } ${actionLoading === lang.id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lang.is_active ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                  </td>
                  {/* Cột 4: Điều khiển */}
                  <td className="px-8 py-6 text-right">
                    {lang.is_active && (
                      <button
                        onClick={() => handleSyncPOI(lang)}
                        disabled={actionLoading === `sync-${lang.id}`}
                        className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl text-xs font-black transition-all border border-amber-200 disabled:opacity-30"
                      >
                        {actionLoading === `sync-${lang.id}` ? "Processing..." : "🔄 Đồng bộ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}