"use client";

import { useState, useEffect } from "react";
import { poiApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import dynamic from 'next/dynamic';

export default function CreatePoiModal({ open, onClose, languages, onSuccess }) {
  const [activeTab, setActiveTab] = useState("");
  const [formData, setFormData] = useState(null);


  // Import component MapPicker một cách "động" và tắt SSR
  const MapPicker = dynamic(() => import('./MapPicker'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center font-black">LOADING MAP...</div>
  });

  useEffect(() => {
    if (open) {
      // Khởi tạo formData với tọa độ mặc định và mảng translations
      setFormData({
        latitude: 10.7769,
        longitude: 106.7009,
        category: "Ẩm thực",
        translations: languages.map((l) => ({
          language_code: l.code,
          name: "",
          description: "",
        })),
      });
      // Ưu tiên mở tab tiếng Việt trước
      setActiveTab("vi-VN");
    }
  }, [open, languages]);

  if (!open || !formData) return null;

  const handleSave = async () => {
    // Kiểm tra dữ liệu tiếng Việt trước khi gửi
    const viTrans = formData.translations.find(t => t.language_code === "vi-VN");
    if (!viTrans?.name || !viTrans?.description) {
      return toast.error("Vui lòng nhập đầy đủ Tên và Mô tả bằng tiếng Việt!");
    }

    const tid = toast.loading("Đang khởi tạo POI và dịch thuật...");
    try {
      await poiApi.create(formData);
      toast.success("Tạo POI thành công! Các ngôn ngữ khác đang được backend xử lý.", { id: tid });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Lỗi khi tạo POI: " + (err.response?.data?.message || err.message), { id: tid });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
      <div className="bg-white border-4 border-black rounded-[32px] w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Header */}
        <div className="p-6 border-b-4 border-black bg-yellow-400 flex justify-between items-center">
          <h2 className="font-black italic text-2xl uppercase">Tạo địa điểm mới</h2>
          <button onClick={onClose} className="text-2xl font-black hover:rotate-90 transition-transform">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Cột trái: Thông tin chung & Bản đồ */}
          <div className="space-y-6">
            <div>
              <label className="block font-black text-xs mb-2 uppercase opacity-50">Danh mục</label>
              <input 
                className="w-full border-4 border-black p-4 rounded-2xl font-black outline-none focus:bg-yellow-50" 
                placeholder="Ví dụ: Cà phê, Di tích..." 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block font-black text-xs mb-2 uppercase opacity-50">Vị trí (Chọn trên bản đồ)</label>
              <div className="h-[350px] border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <MapPicker 
                  position={[formData.latitude, formData.longitude]} 
                  setPosition={(pos) => setFormData({...formData, latitude: pos[0], longitude: pos[1]})} 
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Nội dung đa ngôn ngữ */}
          <div className="flex flex-col">
            <label className="block font-black text-xs mb-2 uppercase opacity-50">Nội dung chi tiết</label>
            
            {/* Tabs */}
            <div className="flex gap-1">
              {languages.map((l) => (
                <button 
                  key={l.code} 
                  onClick={() => setActiveTab(l.code)}
                  className={`px-4 py-2 border-t-4 border-l-4 border-r-4 border-black rounded-t-xl font-black text-[10px] transition-all ${
                    activeTab === l.code ? 'bg-white translate-y-[4px] z-10' : 'bg-gray-200 opacity-60'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* Nội dung theo Tab */}
            <div className="border-4 border-black p-6 rounded-b-2xl rounded-tr-2xl bg-white flex-1 space-y-4">
              {formData.translations.map((t, idx) => t.language_code === activeTab && (
                <div key={t.language_code} className="space-y-4 animate-in fade-in duration-300">
                  {t.language_code !== "vi-VN" && (
                    <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl text-[11px] font-bold text-blue-600 italic">
                      ℹ️ Bạn chỉ cần nhập Tiếng Việt. Hệ thống sẽ tự động dịch sang {languages.find(lang => lang.code === activeTab)?.name} sau khi lưu.
                    </div>
                  )}
                  
                  <input 
                    placeholder={`Tên địa điểm (${activeTab})...`}
                    disabled={t.language_code !== "vi-VN"}
                    className={`w-full border-2 border-black p-3 rounded-xl font-bold outline-none ${t.language_code !== "vi-VN" ? "bg-gray-50 cursor-not-allowed opacity-50" : "focus:ring-2 ring-yellow-400"}`}
                    value={t.name}
                    onChange={e => {
                      const newTrans = [...formData.translations];
                      newTrans[idx].name = e.target.value;
                      setFormData({...formData, translations: newTrans});
                    }}
                  />
                  
                  <textarea 
                    placeholder={`Mô tả chi tiết (${activeTab})...`}
                    disabled={t.language_code !== "vi-VN"}
                    rows={8}
                    className={`w-full border-2 border-black p-3 rounded-xl font-bold outline-none ${t.language_code !== "vi-VN" ? "bg-gray-50 cursor-not-allowed opacity-50" : "focus:ring-2 ring-yellow-400"}`}
                    value={t.description}
                    onChange={e => {
                      const newTrans = [...formData.translations];
                      newTrans[idx].description = e.target.value;
                      setFormData({...formData, translations: newTrans});
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-4 border-black bg-gray-50 flex gap-4">
          <button 
            onClick={handleSave} 
            className="flex-1 bg-black text-white p-4 rounded-2xl font-black text-xl hover:bg-yellow-400 hover:text-black transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
          >
            LƯU VÀ TỰ ĐỘNG DỊCH
          </button>
          <button 
            onClick={onClose}
            className="px-8 border-4 border-black p-4 rounded-2xl font-black text-xl hover:bg-white transition-colors"
          >
            HỦY
          </button>
        </div>
      </div>
    </div>
  );
}