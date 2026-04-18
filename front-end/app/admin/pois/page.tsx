"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { poiApi, languageApi } from "@/lib/api";
import { getFullAudioUrl } from "@/lib/api";
import { toast } from "react-hot-toast";
import CreatePoiModal from "@/components/poi/CreatePoiModal";
import EditPoiModal from "@/components/poi/EditPoiModal";
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Volume2, 
  Languages,
  QrCode,
  Copy,
  ExternalLink
} from "lucide-react";

export default function AdminPOIManagement() {
  // --- States ---
  const [pois, setPois] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [deletingAudioKey, setDeletingAudioKey] = useState<string | null>(null);
  
  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<any>(null);
  const [qrPoi, setQrPoi] = useState<any>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Actions: Fetch Data ---
  const fetchPOIs = useCallback(async () => {
    try {
      const res = await poiApi.getAll("vi-VN");
      // Load thêm chi tiết để lấy all_translations cho từng dòng
      const fullData = await Promise.all(
        res.data.map(async (p: any) => {
          const details = await poiApi.getDetails(p.id);
          // Lưu ý: data.data.translations tùy thuộc vào cấu trúc trả về của API bạn
          return { ...p, all_translations: details.data.data?.translations || [] };
        })
      );
      setPois(fullData);
    } catch (err) {
      toast.error("Không thể cập nhật danh sách POI");
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const langRes = await languageApi.getActive();
      setLanguages(langRes.data.data || []);
      await fetchPOIs();
    } catch (err) {
      toast.error("Lỗi kết nối hệ thống");
    } finally {
      setLoading(false);
    }
  }, [fetchPOIs]);

  useEffect(() => {
    fetchInitialData();
    // Cleanup audio khi đóng trang
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [fetchInitialData]);

  // --- Actions: Audio Logic ---
  const handleToggleAudio = (poiId: string, langCode: string, url: string | null) => {
    if (!url) return;
    
    const key = `${poiId}_${langCode}`;

    // Nếu đang phát đúng file này -> Dừng
    if (activeAudioKey === key) {
      audioRef.current?.pause();
      setActiveAudioKey(null);
      return;
    }

    // Dừng file cũ nếu có
    if (audioRef.current) audioRef.current.pause();

    // Chuẩn hóa URL: http://localhost:5000/uploads/audio/...
    const finalUrl = getFullAudioUrl(url) || url;
    console.log("Original audio URL:", finalUrl);
    // Anti-cache string

    const audio = new Audio(finalUrl);
    audioRef.current = audio;
    setActiveAudioKey(key);

    audio.play().catch(() => {
      toast.error("Lỗi: Không tìm thấy file audio trên server");
      setActiveAudioKey(null);
    });

    audio.onended = () => setActiveAudioKey(null);
  };

  const handleAudioOperation = async (id: string, type: 'sync' | 'rebuild') => {
    const tid = toast.loading(type === 'sync' ? "Đang quét bản dịch..." : "Đang tạo lại toàn bộ Audio...");
    try {
      if (type === 'sync') await poiApi.syncMissingAudio(id);
      else await poiApi.rebuildAudio(id);
      
      toast.success("Xử lý Audio hoàn tất!", { id: tid });
      fetchPOIs();
    } catch (err) {
      toast.error("Thao tác thất bại", { id: tid });
    }
  };

  const handleDeleteSingleAudio = async (poiId: string, translationId: string, langCode: string) => {
    const key = `${poiId}_${langCode}`;
    if (!confirm(`Xóa audio ngôn ngữ ${langCode} cho POI này?`)) return;

    setDeletingAudioKey(key);
    const tid = toast.loading(`Đang xóa audio ${langCode}...`);
    try {
      await poiApi.deleteAudio(poiId, translationId);

      if (activeAudioKey === key) {
        audioRef.current?.pause();
        setActiveAudioKey(null);
      }

      toast.success("Đã xóa audio thành công", { id: tid });
      await fetchPOIs();
    } catch (err) {
      toast.error("Xóa audio thất bại", { id: tid });
    } finally {
      setDeletingAudioKey(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa địa điểm này và toàn bộ bản dịch liên quan?")) return;
    try {
      await poiApi.delete(id);
      toast.success("Đã xóa địa điểm");
      fetchPOIs();
    } catch (err) {
      toast.error("Xóa thất bại");
    }
  };

  const getPoiQrTargetUrl = (poi: any) => {
    if (typeof window === "undefined") return "";
    const lang = localStorage.getItem("preferred_lang") || "vi-VN";
    const configuredBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();
    const normalizedBasePath = configuredBasePath
      ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
      : "";

    const targetUrl = new URL(`${normalizedBasePath}/map/${poi.id}`, window.location.origin);
    targetUrl.searchParams.set("lang", lang);
    targetUrl.searchParams.set("autoplay", "1");
    targetUrl.searchParams.set("src", "qr");

    return targetUrl.toString();
  };

  const copyQrLink = async (poi: any) => {
    try {
      await navigator.clipboard.writeText(getPoiQrTargetUrl(poi));
      toast.success("Đã copy link QR");
    } catch (err) {
      toast.error("Không thể copy link");
    }
  };

  // --- Render Helpers ---
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-black border-t-yellow-400 rounded-full animate-spin" />
        <p className="font-black uppercase italic tracking-widest text-sm">Loading System...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 bg-[#F8F9FA] min-h-screen text-black font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8]">
            POI Audio <span className="text-yellow-400">CMS</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-4 tracking-[0.2em] uppercase flex items-center gap-2">
            <Volume2 size={14} /> Quản lý nội dung & Thuyết minh tự động
          </p>
        </div>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-black text-white px-10 py-5 rounded-2xl font-black shadow-[8px_8px_0px_0px_rgba(234,179,8,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={24} strokeWidth={3} />
          ADD NEW LOCATION
        </button>
      </div>

      {/* Main Table Section */}
      <div className="bg-white border-[4px] border-black rounded-[40px] overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-black text-white uppercase text-[11px] tracking-[0.15em] font-black">
            <tr>
              <th className="p-7">POI Info</th>
              <th className="p-7">Audio Translations</th>
              <th className="p-7 text-center">Auto Engine</th>
              <th className="p-7 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-[4px] divide-black/5">
            {pois.map((poi) => (
              <tr key={poi.id} className="hover:bg-yellow-50/30 transition-colors">
                {/* 1. Thông tin cơ bản */}
                <td className="p-7">
                  <div className="space-y-1">
                    <span className="font-black text-2xl uppercase block leading-none">{poi.name}</span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">{poi.category}</span>
                      <span>ID: {poi.id.slice(0,8)}...</span>
                    </div>
                  </div>
                </td>

                {/* 2. Trạng thái Audio & Ngôn ngữ */}
                <td className="p-7">
                  <div className="flex flex-wrap gap-3">
                    {languages.map((lang) => {
                      const trans = poi.all_translations?.find((t: any) => t.language_code === lang.code);
                      const isPlaying = activeAudioKey === `${poi.id}_${lang.code}`;
                      const isDeleting = deletingAudioKey === `${poi.id}_${lang.code}`;
                      const hasAudio = !!trans?.audio_url;

                      return (
                        <div key={lang.code} className="flex items-center gap-1">
                          <button
                            disabled={!hasAudio || isDeleting}
                            onClick={() => handleToggleAudio(poi.id, lang.code, trans?.audio_url || null)}
                            className={`
                              group relative px-4 py-2 rounded-xl border-2 border-black font-black text-[10px] flex items-center gap-2 transition-all
                              ${hasAudio 
                                ? (isPlaying ? "bg-black text-white scale-105 shadow-none" : "bg-white hover:bg-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]") 
                                : "opacity-20 grayscale cursor-not-allowed"}
                              ${isDeleting ? "opacity-60 cursor-wait" : ""}
                            `}
                          >
                            {isPlaying ? (
                              <Pause size={12} fill="currentColor" />
                            ) : (
                              <Play size={12} fill={hasAudio ? "black" : "none"} />
                            )}
                            {lang.code.split('-')[0].toUpperCase()}
                            {!hasAudio && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black" />}
                          </button>

                          {hasAudio && trans?.id && (
                            <button
                              onClick={() => handleDeleteSingleAudio(poi.id, trans.id, lang.code)}
                              title={`Xóa audio ${lang.code}`}
                              disabled={isDeleting}
                              className="h-8 w-8 flex items-center justify-center rounded-lg border-2 border-black bg-red-100 text-red-600 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>

                {/* 3. TTS Engine Control */}
                <td className="p-7">
                  <div className="flex justify-center items-center gap-3">
                    <button 
                      onClick={() => handleAudioOperation(poi.id, 'sync')}
                      title="Chỉ tạo những bản dịch còn thiếu"
                      className="group bg-emerald-400 border-2 border-black p-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                    >
                      <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <button 
                      onClick={() => handleAudioOperation(poi.id, 'rebuild')}
                      title="Xóa cũ và tạo mới lại toàn bộ file"
                      className="bg-orange-400 border-2 border-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-300 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                    >
                      Rebuild All
                    </button>
                  </div>
                </td>

                {/* 4. Quản lý POI */}
                <td className="p-7 text-right">
                  <div className="flex justify-end gap-6 font-black text-[11px] uppercase tracking-tighter">
                    <button 
                      onClick={() => { setSelectedPoi(poi); setIsEditOpen(true); }}
                      className="flex items-center gap-1.5 hover:text-blue-600 group"
                    >
                      <Edit3 size={16} className="group-hover:-rotate-12 transition-transform" />
                      Edit
                    </button>
                    <button
                      onClick={() => setQrPoi(poi)}
                      className="flex items-center gap-1.5 hover:text-purple-600 group"
                    >
                      <QrCode size={16} className="group-hover:scale-110 transition-transform" />
                      QR
                    </button>
                    <button 
                      onClick={() => handleDelete(poi.id)}
                      className="flex items-center gap-1.5 text-red-500 hover:text-red-700 group"
                    >
                      <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {pois.length === 0 && (
              <tr>
                <td colSpan={4} className="p-20 text-center font-black text-slate-300 italic uppercase text-2xl tracking-widest">
                  No Locations Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <CreatePoiModal 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        languages={languages} 
        onSuccess={fetchPOIs} 
      />
      
      {selectedPoi && (
        <EditPoiModal 
          open={isEditOpen} 
          poi={selectedPoi}
          onClose={() => setIsEditOpen(false)} 
          languages={languages} 
          onSuccess={fetchPOIs} 
        />
      )}

      {qrPoi && (
        <div className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border-4 border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">QR cho quán (Admin)</p>
                <h3 className="text-xl font-black leading-tight">{qrPoi.name}</h3>
              </div>
              <button
                onClick={() => setQrPoi(null)}
                className="px-2 py-1 rounded-lg border-2 border-black text-xs font-black"
              >
                Đóng
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 bg-slate-50 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(getPoiQrTargetUrl(qrPoi))}`}
                alt={`QR ${qrPoi.name}`}
                className="w-64 h-64 object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 break-all bg-slate-100 rounded-xl p-3 border border-slate-200">
              {getPoiQrTargetUrl(qrPoi)}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => copyQrLink(qrPoi)}
                className="py-2.5 rounded-xl border-2 border-black font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <Copy size={14} /> Copy Link
              </button>
              <a
                href={getPoiQrTargetUrl(qrPoi)}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> Mở thử
              </a>
            </div>

            <p className="text-[11px] text-slate-500">
              Người dùng quét QR sẽ vào trang chi tiết quán và tự phát audio nếu có file thuyết minh.
            </p>
          </div>
        </div>
      )}

      {/* UI Note */}
      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
        <p>Status: Cloud Connected</p>
        <p>Engine: Google Cloud TTS v1</p>
      </div>
    </div>
  );
}