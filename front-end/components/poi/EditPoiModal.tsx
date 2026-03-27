"use client";

import { useState, useEffect, useRef } from "react";
import { poiApi, getFileUrl } from "@/lib/api"; // Đảm bảo có getFileUrl
import { toast } from "react-hot-toast";
import dynamic from 'next/dynamic';
import { ImageIcon, XCircle, Loader2, AlertCircle, Pencil } from "lucide-react";

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center font-black italic">MAP IS LOADING...</div>
});

export default function EditPoiModal({ open, onClose, poi, languages, onSuccess }) {
  const [activeTab, setActiveTab] = useState("vi-VN");
  const [formData, setFormData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Quản lý Cleanup Preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 2. Khởi tạo dữ liệu từ POI hiện tại
  useEffect(() => {
    if (open && poi && languages?.length > 0) {
      const mergedTranslations = languages.map((lang) => {
        const existingTrans = poi.all_translations?.find(
          (t) => t.language_code === lang.code
        );
        return existingTrans || {
          language_code: lang.code,
          name: "",
          description: "",
        };
      });

      setFormData({
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category || "Ẩm thực",
        thumbnail_url: poi.thumbnail_url,
        translations: mergedTranslations,
      });

      setActiveTab("vi-VN");
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [open, poi, languages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = ""; 
      return toast.error("Ảnh quá lớn (Giới hạn 5MB)");
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    toast.success("Ảnh đã sẵn sàng để tải lên!");
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const tid = toast.loading("Đang cập nhật Landmark...");

    try {
      const data = new FormData();
      data.append('latitude', String(formData.latitude));
      data.append('longitude', String(formData.longitude));
      data.append('category', formData.category.trim());
      data.append('translations', JSON.stringify(formData.translations));
      
      if (selectedFile) {
        data.append('thumbnail', selectedFile);
      } else {
        // Gửi lại URL cũ nếu không thay đổi ảnh để backend giữ nguyên
        data.append('thumbnail_url', formData.thumbnail_url || "");
      }

      await poiApi.update(poi.id, data);
      
      toast.success("Cập nhật hoàn tất!", { id: tid });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Lỗi cập nhật";
      toast.error(msg, { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black rounded-[32px] w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Header */}
        <div className="p-6 border-b-4 border-black bg-emerald-400 flex justify-between items-center">
          <h2 className="font-black italic text-2xl uppercase tracking-tighter text-black">Edit Landmark</h2>
          <button 
            disabled={isSubmitting}
            onClick={onClose} 
            className="w-10 h-10 border-4 border-black bg-white rounded-full flex items-center justify-center font-black hover:bg-red-500 hover:text-white transition-all disabled:opacity-20"
          >✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Left Column */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="block font-black text-xs uppercase opacity-40 tracking-widest">Visual Cover</label>
                  <div 
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className="aspect-video border-4 border-black rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all overflow-hidden relative bg-gray-50 group"
                  >
                    {/* Hiển thị ảnh mới chọn hoặc ảnh từ server */}
                    <img 
                    src={
                      // 1. Ảnh user đang chọn để thay thế
                      previewUrl || 
                      
                      // 2. Ảnh cũ đã lưu trên server, dùng helper để nối URL
                      getFileUrl(formData.thumbnail_url) ||
                      
                      // 3. Ảnh placeholder mặc định của bạn (nếu POI chưa từng có ảnh)
                      "@/public/placeholder.png" // Path đến ảnh bạn đã tải về thư mục public
                    } 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    alt="POI Preview" 
                  />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                       <Pencil className="w-8 h-8 mb-1" />
                       <p className="font-black text-[10px] uppercase">Change Image</p>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
               </div>

               <div className="space-y-2">
                  <label className="block font-black text-xs uppercase opacity-40 tracking-widest">Category</label>
                  <input 
                    disabled={isSubmitting}
                    className="w-full border-4 border-black p-4 rounded-2xl font-black outline-none focus:ring-4 ring-emerald-400/20 disabled:bg-gray-100 transition-all" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
               </div>
            </div>
            
            <div className="space-y-2">
              <label className="block font-black text-xs uppercase opacity-40 tracking-widest">Location Pin</label>
              <div className="h-[300px] border-4 border-black rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-gray-100">
                <MapPicker 
                  position={[formData.latitude, formData.longitude]} 
                  setPosition={(pos) => setFormData({...formData, latitude: pos[0], longitude: pos[1]})} 
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col h-full min-h-[400px]">
            <label className="block font-black text-xs mb-3 uppercase opacity-40 tracking-widest">Content Details</label>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {languages?.map((l) => (
                <button 
                  key={l.code} 
                  onClick={() => setActiveTab(l.code)}
                  className={`px-5 py-2 border-4 border-black rounded-2xl font-black text-[10px] whitespace-nowrap transition-all uppercase ${
                    activeTab === l.code ? 'bg-black text-white -translate-y-1 shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>

            <div className="border-4 border-black p-6 rounded-[32px] bg-white flex-1 space-y-5 shadow-inner mt-2">
              {formData.translations?.map((t, idx) => t.language_code === activeTab && (
                <div key={t.language_code} className="space-y-4 animate-in slide-in-from-right-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase opacity-30 px-1">Place Name</span>
                    <input 
                      className="w-full border-4 border-black p-4 rounded-2xl font-black outline-none focus:bg-emerald-50 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      value={t.name}
                      onChange={e => {
                        const newTrans = [...formData.translations];
                        newTrans[idx].name = e.target.value;
                        setFormData({...formData, translations: newTrans});
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase opacity-30 px-1">Full Description</span>
                    <textarea 
                      rows={8}
                      className="w-full border-4 border-black p-4 rounded-2xl font-black outline-none resize-none focus:bg-emerald-50 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      value={t.description}
                      onChange={e => {
                        const newTrans = [...formData.translations];
                        newTrans[idx].description = e.target.value;
                        setFormData({...formData, translations: newTrans});
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-8 border-t-4 border-black bg-gray-50 flex flex-col sm:flex-row gap-4">
          <button 
            disabled={isSubmitting}
            onClick={handleSave} 
            className="flex-[2] bg-black text-white p-5 rounded-[24px] font-black text-xl hover:bg-emerald-400 hover:text-black transition-all active:scale-[0.98] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] flex items-center justify-center gap-4 disabled:bg-gray-400 uppercase italic"
          >
            {isSubmitting ? <><Loader2 className="w-6 h-6 animate-spin" /> Updating...</> : "Save Changes"}
          </button>
          <button 
            disabled={isSubmitting}
            onClick={onClose} 
            className="flex-1 border-4 border-black p-5 rounded-[24px] font-black text-xl hover:bg-white transition-all uppercase italic"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}