// components/Map/MapPopup.tsx
import { Headphones, Info } from "lucide-react";
import { getFileUrl } from "@/lib/api";
import { getFullAudioUrl } from "./MapUtils";
import toast from "react-hot-toast";

interface MapPopupProps {
  poi: any;
  activeAudioKey: string | null;
  toggleAudio: (id: string, url: string) => void;
}

export default function MapPopup({ poi, activeAudioKey, toggleAudio }: MapPopupProps) {
  
  const handleAudioClick = () => {
    const url = getFullAudioUrl(poi.audio_url);
    if (!url) {
      toast.error("Địa điểm này chưa có thuyết minh âm thanh!");
      return;
    }
    toggleAudio(poi.id, url);
  };

  return (
    <div className="flex flex-col bg-white overflow-hidden rounded-[2rem] w-80 shadow-2xl border border-slate-100">
      
      {/* --- PHẦN HÌNH ẢNH (HEADER) --- */}
      <div className="relative h-44 overflow-hidden bg-slate-200">
        <img
          // Ưu tiên ảnh từ server, fallback về placeholder local nếu null/lỗi
          src={getFileUrl(poi.thumbnail_url)} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          alt={poi.name}
          onError={(e) => {
            // Ngăn chặn vòng lặp lỗi nếu chính file placeholder cũng không tồn tại
            const target = e.target as HTMLImageElement;
            if (target.src !== window.location.origin + "/placeholder.png") {
              target.src = "/placeholder.png";
            }
          }}
        />
        
        {/* Badge Thể loại */}
        <div className="absolute top-4 left-4 bg-orange-500/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase shadow-lg border border-white/20 tracking-wider">
          {poi.category || "Discovery"}
        </div>

        {/* Overlay gradient nhẹ phía dưới ảnh để text nổi bật nếu cần */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* --- PHẦN NỘI DUNG (BODY) --- */}
      <div className="p-6 bg-white relative">
        <h3 className="text-xl font-black text-slate-900 uppercase mb-2 leading-none tracking-tighter">
          {poi.name}
        </h3>
        
        {/* Description Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 max-h-32 overflow-y-auto text-[13px] text-slate-600 leading-relaxed scrollbar-hide italic shadow-inner">
          {poi.description ? `"${poi.description}"` : "Chưa có thông tin mô tả chi tiết cho địa điểm này."}
        </div>

        {/* --- HÀNH ĐỘNG (FOOTER) --- */}
        <div className="flex gap-3">
          {/* Nút Nghe Thuyết Minh */}
          <button
            onClick={handleAudioClick}
            className={`flex-1 py-4 rounded-[1.25rem] text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
              ${
                activeAudioKey === poi.id
                  ? "bg-red-500 text-white ring-4 ring-red-500/10 shadow-red-200"
                  : "bg-slate-900 text-white hover:bg-blue-600 shadow-slate-900/20"
              }
            `}
          >
            {activeAudioKey === poi.id ? (
              <>
                {/* Animation sóng nhạc khi đang phát */}
                <div className="flex gap-0.5 items-end h-3">
                  <div className="w-1 bg-white animate-[bounce_0.6s_infinite]" />
                  <div className="w-1 bg-white animate-[bounce_0.6s_infinite_0.2s]" />
                  <div className="w-1 bg-white animate-[bounce_0.6s_infinite_0.4s]" />
                </div>
                <span>Dừng phát</span>
              </>
            ) : (
              <>
                <Headphones size={16} strokeWidth={3} />
                <span>Nghe thuyết minh</span>
              </>
            )}
          </button>
          
          {/* Nút Chi tiết (Icon Only) */}
          <button className="w-14 h-14 bg-white border-2 border-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-100 hover:bg-blue-50 transition-all group shadow-sm">
            <Info size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}