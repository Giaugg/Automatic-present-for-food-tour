"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { getFileUrl, poiApi, tourApi } from "@/lib/api";
import { CreateTourDTO, Tour, TourStop, UpdateTourScheduleDTO } from "@/types/tour";
import { POIWithTranslation } from "@/types/pois";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";

export default function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);
  const [draftSourceTourId, setDraftSourceTourId] = useState<string | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [price, setPrice] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const [scheduleStops, setScheduleStops] = useState<TourStop[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<string>("");

  const selectedTour = useMemo(
    () => tours.find((t: Tour) => t.id === selectedTourId) || null,
    [tours, selectedTourId]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tourRes, poiRes] = await Promise.all([
        tourApi.getAll("vi-VN", true),
        poiApi.getAll("vi-VN"),
      ]);
      setTours(tourRes.data);
      setPois(poiRes.data);
    } catch (error) {
      toast.error("Không thể tải dữ liệu tour");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTourDetails = useCallback(async (tourId: string) => {
    try {
      const res = await tourApi.getDetails(tourId, "vi-VN");
      const details = res.data;
      setScheduleStops(details.stops || []);
      setPrice(Number(details.price || 0));
      setThumbnailUrl(details.thumbnail_url || "");
      setIsActive(Boolean(details.is_active));
      setTitle(details.title || "");
      setSummary(details.summary || "");
    } catch (error) {
      toast.error("Không thể tải chi tiết tour");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Chỉ auto-select lần đầu để không ghi đè trạng thái "soạn tour mới".
    if (!hasInitializedSelection && !selectedTourId && tours.length > 0) {
      setSelectedTourId(tours[0].id);
      setHasInitializedSelection(true);
    }
  }, [hasInitializedSelection, selectedTourId, tours]);

  useEffect(() => {
    if (selectedTourId) {
      loadTourDetails(selectedTourId);
    }
  }, [selectedTourId, loadTourDetails]);

  const resetFormForNewTour = () => {
    if (selectedTourId && !isCreatingTour) {
      setDraftSourceTourId(selectedTourId);
    }

    setIsCreatingTour(true);
    setSelectedTourId(null);
    setHasInitializedSelection(true);
    setPrice(0);
    setThumbnailUrl("");
    setIsActive(true);
    setTitle("");
    setSummary("");
    setScheduleStops([]);
    toast.success('Đã chuyển sang chế độ tạo tour mới');
  };

  const handleCancelCreateTour = () => {
    const fallbackTourId =
      draftSourceTourId && tours.some((t: Tour) => t.id === draftSourceTourId)
        ? draftSourceTourId
        : (tours[0]?.id || null);

    setIsCreatingTour(false);
    setDraftSourceTourId(null);
    setHasInitializedSelection(true);

    if (fallbackTourId) {
      setSelectedTourId(fallbackTourId);
      toast.success("Đã hủy tạo tour mới");
      return;
    }

    setSelectedTourId(null);
    setPrice(0);
    setThumbnailUrl("");
    setIsActive(true);
    setTitle("");
    setSummary("");
    setScheduleStops([]);
    toast.success("Đã hủy tạo tour mới");
  };

  const handleUploadThumbnail = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("thumbnail", file);

    setUploadingThumbnail(true);
    try {
      const res = await tourApi.uploadThumbnail(formData);
      setThumbnailUrl(res.data.thumbnail_url);
      toast.success("Upload thumbnail thành công");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Upload thumbnail thất bại");
    } finally {
      setUploadingThumbnail(false);
      e.target.value = "";
    }
  };

  const handleSaveTour = async () => {
    if (!title.trim()) {
      toast.error("Cần nhập tiêu đề tiếng Việt cho tour");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateTourDTO = {
        price,
        thumbnail_url: thumbnailUrl || undefined,
        is_active: isActive,
        translations: [
          {
            language_code: "vi-VN",
            title: title.trim(),
            summary: summary.trim(),
          },
        ],
      };

      let activeTourId = selectedTourId;

      if (selectedTourId) {
        await tourApi.update(selectedTourId, payload);
        toast.success("Đã cập nhật tour");
      } else {
        const res = await tourApi.create(payload);
        activeTourId = res.data.id;
        setIsCreatingTour(false);
        setDraftSourceTourId(null);
        setSelectedTourId(activeTourId);
        toast.success("Đã tạo tour mới");
      }

      await fetchData();
      if (activeTourId) {
        await loadTourDetails(activeTourId);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Lưu tour thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa tour này?")) return;

    try {
      await tourApi.delete(tourId);
      toast.success("Đã xóa tour");
      if (selectedTourId === tourId) {
        resetFormForNewTour();
      }
      await fetchData();
    } catch (error) {
      toast.error("Xóa tour thất bại");
    }
  };

  const addPoiToSchedule = () => {
    if (!selectedPoiId) return;

    const existing = scheduleStops.find((s: TourStop) => s.poi_id === selectedPoiId);
    if (existing) {
      toast.error("POI đã có trong lộ trình");
      return;
    }

    const poi = pois.find((p: POIWithTranslation) => p.id === selectedPoiId);
    if (!poi) return;

    setScheduleStops((prev: TourStop[]) => [
      ...prev,
      {
        step_order: prev.length + 1,
        poi_id: poi.id,
        name: poi.name,
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category,
        thumbnail: poi.thumbnail_url,
        audio_url: poi.audio_url || undefined,
      },
    ]);
    setSelectedPoiId("");
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    setScheduleStops((prev: TourStop[]) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const removeStop = (poiId: string) => {
    setScheduleStops((prev: TourStop[]) =>
      prev
        .filter((s: TourStop) => s.poi_id !== poiId)
        .map((s: TourStop, i: number) => ({ ...s, step_order: i + 1 }))
    );
  };

  const handleSaveSchedule = async () => {
    if (!selectedTourId) {
      toast.error("Hãy tạo tour trước khi lưu lộ trình");
      return;
    }
    if (scheduleStops.length === 0) {
      toast.error("Lộ trình không được rỗng");
      return;
    }

    setScheduleSaving(true);
    try {
      const payload: UpdateTourScheduleDTO = {
        items: scheduleStops.map((s: TourStop, i: number) => ({ poi_id: s.poi_id, step_order: i + 1 })),
      };
      await tourApi.updateSchedule(selectedTourId, payload);
      toast.success("Đã lưu lộ trình tour");
      await loadTourDetails(selectedTourId);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Lưu lộ trình thất bại");
    } finally {
      setScheduleSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Đang tải dữ liệu tour...</div>;
  }

  return (
    <main className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Tour</h1>
          <p className="text-gray-500">Tạo và sắp xếp lộ trình POI cho các tour</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            Làm mới
          </button>
          <button
            onClick={resetFormForNewTour}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={16} />
            Soạn tour mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <section className="bg-white border rounded-xl p-4 h-fit">
          <h2 className="font-bold mb-3">Danh sách tour</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {tours.map((tour: Tour) => (
              <button
                key={tour.id}
                onClick={() => {
                  setIsCreatingTour(false);
                  setDraftSourceTourId(null);
                  setSelectedTourId(tour.id);
                  setHasInitializedSelection(true);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTourId === tour.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <p className="font-semibold text-sm truncate">{tour.title || "(Chưa có tiêu đề)"}</p>
                <p className="text-xs text-gray-500">
                  {Number(tour.price || 0).toLocaleString("vi-VN")}đ • {tour.is_active ? "Active" : "Inactive"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border rounded-xl p-5 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Giá tour</label>
              <input
                type="number"
                value={price}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Thumbnail Tour</label>
              <div className="mt-1 flex items-center gap-2">
                <label className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold cursor-pointer hover:bg-gray-50">
                  {uploadingThumbnail ? "Đang upload..." : "Chọn ảnh"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadThumbnail}
                    disabled={uploadingThumbnail}
                    className="hidden"
                  />
                </label>
              </div>
              {thumbnailUrl && (
                <p className="mt-2 text-xs text-emerald-700 font-medium truncate">{thumbnailUrl}</p>
              )}
              {thumbnailUrl && (
                <img
                  src={getFileUrl(thumbnailUrl)}
                  alt="Tour thumbnail preview"
                  className="mt-2 w-full h-28 object-cover rounded-lg border"
                />
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setIsActive(e.target.checked)}
            />
            Tour đang hoạt động
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 space-y-2 md:col-span-2">
              <p className="text-xs font-bold uppercase text-gray-500">Ngôn ngữ mặc định: vi-VN</p>
              <input
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Tiêu đề tour"
              />
              <textarea
                value={summary}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSummary(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 min-h-24"
                placeholder="Mô tả ngắn"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveTour}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Đang lưu..." : selectedTourId ? "Cập nhật tour" : "Tạo tour"}
            </button>

            {isCreatingTour && (
              <button
                onClick={handleCancelCreateTour}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold disabled:opacity-60"
              >
                Hủy tạo mới
              </button>
            )}

            {selectedTour && (
              <button
                onClick={() => handleDeleteTour(selectedTour.id)}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 size={16} />
                Xóa tour
              </button>
            )}
          </div>

          <hr />

          <div className="space-y-3">
            <h3 className="font-bold">Lộ trình POI trong Tour</h3>
            <div className="flex gap-2">
              <select
                value={selectedPoiId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPoiId(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2"
              >
                <option value="">Chọn POI để thêm</option>
                {pois.map((poi: POIWithTranslation) => (
                  <option key={poi.id} value={poi.id}>
                    {poi.name}
                  </option>
                ))}
              </select>
              <button onClick={addPoiToSchedule} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                Thêm
              </button>
            </div>

            <div className="space-y-2">
              {scheduleStops.map((stop, index) => (
                <div key={stop.poi_id} className="flex items-center gap-2 border rounded-lg p-2">
                  <span className="w-8 h-8 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{stop.name}</p>
                    <p className="text-xs text-gray-500 truncate">{stop.category || "N/A"}</p>
                  </div>
                  <button onClick={() => moveStop(index, -1)} className="p-1 rounded border">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveStop(index, 1)} className="p-1 rounded border">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => removeStop(stop.poi_id)} className="p-1 rounded border text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {scheduleStops.length === 0 && (
                <p className="text-sm text-gray-500 italic">Chưa có POI trong lộ trình.</p>
              )}
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={scheduleSaving || !selectedTourId}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {scheduleSaving ? "Đang lưu lịch trình..." : "Lưu lịch trình"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
