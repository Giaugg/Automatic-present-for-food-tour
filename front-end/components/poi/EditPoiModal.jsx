"use client";

import { useState, useEffect } from "react";
import { poiApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import dynamic from 'next/dynamic';

export default function EditPoiModal({ open, onClose, poi, languages, onSuccess }) {
  const [activeTab, setActiveTab] = useState("");
  const [formData, setFormData] = useState(null);



  const MapPicker = dynamic(
    () => import('./MapPicker'), // Đường dẫn đến file của bạn
    { 
      ssr: false,
      loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">LOADING MAP...</div>
    }
  );


  useEffect(() => {
    if (open && poi) {
      // Đảm bảo formData luôn có đủ các ngôn ngữ hiện có trong hệ thống
      // Nếu một ngôn ngữ mới được bật mà POI cũ chưa có, chúng ta khởi tạo rỗng cho nó
      const mergedTranslations = languages.map((lang) => {
        const existingTrans = poi.all_translations?.find(
          (t) => t.language_code === lang.code
        );
        return (
          existingTrans || {
            language_code: lang.code,
            name: "",
            description: "",
          }
        );
      });

      setFormData({
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category || "Ẩm thực",
        translations: mergedTranslations,
      });

      // Mặc định mở tab tiếng Việt nếu có, không thì mở tab đầu tiên
      setActiveTab(languages.find(l => l.code === "vi-VN") ? "vi-VN" : languages[0]?.code || "");
    }
  }, [open, poi, languages]);

  if (!open || !formData) return null;

  const handleSave = async () => {
    const tid = toast.loading("Đang cập nhật dữ liệu...");
    try {
      await poiApi.update(poi.id, formData);
      toast.success("Cập nhật POI thành công!", { id: tid });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Lỗi cập nhật: " + (err.response?.data?.message || err.message), { id: tid });
    }
  };

  const updateTranslation = (idx, field, value) => {
    const newTrans = [...formData.translations];
    newTrans[idx][field] = value;
    setFormData({ ...formData, translations: newTrans });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
      <div className="bg-white border-4 border-black rounded-[32px] w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Header */}
        <div className="p-6 border-b-4 border-black bg-emerald-400 flex justify-between items-center">
          <h2 className="font-black italic text-2xl uppercase text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            Chỉnh sửa POI: {poi.id.slice(0, 8)}
          </h2>
          <button 
            onClick={onClose} 
            className="text-2xl font-black bg-white w-10 h-10 rounded-full border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Cột trái: Map & Thông tin cơ bản */}
          <div className="space-y-6">
            <div>
              <label className="block font-black uppercase text-xs tracking-widest mb-2">Danh mục chung</label>
              <input 
                className="w-full border-4 border-black p-4 rounded-2xl font-black outline-none focus:bg-yellow-50 transition-colors" 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>

            <div>
              <label className="block font-black uppercase text-xs tracking-widest mb-2">Vị trí địa lý (Kéo/Thả Marker)</label>
              <div className="h-[380px] border-4 border-black rounded-3xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(16,185,129,0.2)]">
                <MapPicker 
                  position={[formData.latitude, formData.longitude]} 
                  setPosition={(pos) => setFormData({...formData, latitude: pos[0], longitude: pos[1]})} 
                />
              </div>
              <p className="mt-2 text-[10px] font-bold text-gray-400">Tọa độ hiện tại: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</p>
            </div>
          </div>

          {/* Cột phải: Tabs dịch thuật thủ công */}
          <div className="flex flex-col">
             <label className="block font-black uppercase text-xs tracking-widest mb-4 opacity-50">Nội dung đa ngôn ngữ</label>
             
             {/* Tab Navigation */}
             <div className="flex flex-wrap gap-1">
                {languages.map((l) => (
                  <button 
                    key={l.code} 
                    onClick={() => setActiveTab(l.code)}
                    className={`px-4 py-2 border-t-4 border-l-4 border-r-4 border-black rounded-t-xl font-black text-[10px] uppercase transition-all ${
                      activeTab === l.code ? 'bg-white translate-y-[4px] z-10' : 'bg-gray-100 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
             </div>

             {/* Tab Content */}
             <div className="border-4 border-black p-6 rounded-b-2xl rounded-tr-2xl bg-white flex-1 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {formData.translations.map((t, idx) => t.language_code === activeTab && (
                  <div key={t.language_code} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <label className="block text-[10px] font-black uppercase mb-1 opacity-40">Tên địa điểm ({t.language_code})</label>
                      <input 
                        placeholder="Nhập tên..." 
                        className="w-full border-2 border-black p-3 rounded-xl font-bold focus:ring-2 ring-emerald-400 outline-none"
                        value={t.name}
                        onChange={e => updateTranslation(idx, "name", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase mb-1 opacity-40">Mô tả chi tiết</label>
                      <textarea 
                        placeholder="Nhập mô tả..." 
                        rows={10}
                        className="w-full border-2 border-black p-3 rounded-xl font-bold focus:ring-2 ring-emerald-400 outline-none"
                        value={t.description}
                        onChange={e => updateTranslation(idx, "description", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t-4 border-black bg-gray-50 flex gap-4">
          <button 
            onClick={handleSave} 
            className="flex-1 bg-black text-white p-4 rounded-2xl font-black text-xl hover:bg-emerald-400 hover:text-black transition-all active:scale-95 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]"
          >
            LƯU THAY ĐỔI
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