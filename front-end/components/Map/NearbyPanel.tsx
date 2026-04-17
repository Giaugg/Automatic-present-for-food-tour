// components/Map/NearbyPanel.tsx
import { Utensils, MapPin, Navigation2, Loader2 } from "lucide-react";
import { getFileUrl } from "@/lib/api";

interface NearbyPanelProps {
  items: any[];
  onSelect: (poi: any) => void;
  loading?: boolean;
}

export default function NearbyPanel({ items, onSelect, loading }: NearbyPanelProps) {
  // Debug: Bỏ comment dòng dưới để xem dữ liệu có tới được Panel không
  // console.log("Nearby Items in Panel:", items);

  return (
    <div className="absolute top-10 z-[9999] w-80 pointer-events-auto bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl border border-white/50 transition-all duration-500">
      {/* Tiêu đề Panel */}
      <div className="flex items-center gap-2 mb-4 ml-2">
        <div className="bg-orange-600 p-2 rounded-xl shadow-lg shadow-orange-200 animate-bounce">
          <Utensils size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <h2 className="font-black text-[12px] uppercase tracking-wider text-slate-800 leading-none">
            Quán ăn quanh đây
          </h2>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
            Cập nhật theo vị trí của bạn
          </span>
        </div>
      </div>

      {/* Danh sách cuộn */}
      <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
        {items.length > 0 ? (
          items.map((poi) => (
            <div 
              key={poi.id}
              onClick={() => {
                console.log("Selected POI:", poi.name);
                onSelect(poi);
              }}
              className="group flex gap-4 p-3 bg-white/95 backdrop-blur-md rounded-[1.5rem] border-2 border-transparent hover:border-blue-500 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-blue-100 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                <img 
                  src={getFileUrl(poi.thumbnail_url) || "/placeholder.png"} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt={poi.name}
                />
              </div>
              
              <div className="flex flex-col justify-center min-w-0">
                <h4 className="font-black text-slate-900 text-[14px] uppercase truncate leading-tight tracking-tighter">
                  {poi.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  {poi.owner_plan === "premium" && (
                    <div className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[8px] font-black uppercase border border-amber-200">
                      Premium
                    </div>
                  )}
                  <div className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase">
                    {poi.category || "Food"}
                  </div>
                  <span className="text-[10px] font-bold text-blue-600">
                    {(poi.distance * 1000).toFixed(0)}m
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Không có quán ăn nào <br/> trong bán kính gần
            </p>
          </div>
        )}
      </div>
    </div>
  );
}