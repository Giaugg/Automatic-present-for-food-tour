"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Pause, Play } from "lucide-react";
import { getFileUrl, getFullAudioUrl, poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import toast from "react-hot-toast";

export default function PoiDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [poi, setPoi] = useState<POIWithTranslation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayDone, setAutoplayDone] = useState(false);

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchPoi = async () => {
      if (!params?.id) return;
      const langFromQuery = searchParams?.get("lang");
      const lang = langFromQuery || localStorage.getItem("preferred_lang") || "vi-VN";

      try {
        const res = await poiApi.getById(params.id, lang);
        setPoi(res.data);
        console.log("Fetched POI details:", res.data);
      } catch (err) {
        console.error("Loi tai chi tiet POI:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoi();
  }, [params?.id, searchParams]);

  useEffect(() => {
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, [audioEl]);

  const toggleAudio = () => {
    if (!poi?.audio_url) {
      toast.error("Quán này chưa có audio thuyết minh.");
      return;
    }

    const source = getFullAudioUrl(poi.audio_url);
    console.log("Audio source:", source);
    if (!source) {
      toast.error("Không tìm thấy file audio.");
      return;
    }

    if (audioEl && isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
      return;
    }

    if (audioEl && !isPlaying) {
      audioEl.play().then(() => setIsPlaying(true)).catch(() => {
        toast.error("Không thể phát audio.");
      });
      return;
    }

    const freshAudio = new Audio(source);
    freshAudio.onended = () => setIsPlaying(false);
    freshAudio.play().then(() => {
      setAudioEl(freshAudio);
      setIsPlaying(true);
    }).catch(() => {
      toast.error("Không thể phát audio tự động trên thiết bị này.");
    });
  };

  useEffect(() => {
    const shouldAutoplay = searchParams?.get("autoplay") === "1";
    if (!poi || !shouldAutoplay || autoplayDone) return;

    setAutoplayDone(true);
    setTimeout(() => {
      toggleAudio();
    }, 200);
  }, [poi, searchParams, autoplayDone]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!poi) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-slate-500 font-semibold">Khong tim thay dia diem.</p>
        <button
          onClick={() => router.push("/map")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
        >
          Quay lai ban do
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <button
          onClick={() => router.push("/map")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Quay lai ban do
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <img
            src={getFileUrl(poi.thumbnail_url || null)}
            alt={poi.name}
            className="w-full h-64 object-cover"
          />

          <div className="p-5 space-y-3">
            <div className="inline-flex px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold uppercase border border-orange-100">
              {poi.category || "food"}
            </div>

            <h1 className="text-2xl font-black text-slate-900 leading-tight">{poi.name}</h1>

            <p className="text-slate-600 leading-relaxed">
              {poi.description || "Chua co mo ta chi tiet cho dia diem nay."}
            </p>

            <button
              onClick={toggleAudio}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase transition-colors ${isPlaying ? "bg-red-600 text-white" : "bg-slate-900 text-white"}`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? "Dung audio" : "Phat audio"}
            </button>

            <div className="grid grid-cols-2 gap-2 text-sm pt-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-400 uppercase text-[10px] font-bold">Latitude</p>
                <p className="font-mono text-slate-800">{poi.latitude.toFixed(6)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-400 uppercase text-[10px] font-bold">Longitude</p>
                <p className="font-mono text-slate-800">{poi.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
