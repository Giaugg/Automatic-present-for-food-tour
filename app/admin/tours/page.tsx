"use client";

import { useEffect, useState } from "react";
import { Tour, CreateTourDTO, TourTranslation } from "@/types/tour";
import { tourApi, poiApi } from "@/lib/api";
import { POIWithTranslation } from "@/types/pois";
import { toast } from "react-hot-toast";

export default function AdminTourManagement() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [pois, setPois] = useState<POIWithTranslation[]>([]); // Để chọn POI vào tour
  const [loading, setLoading] = useState(true);
  
  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTourDTO>({
    price: 0,
    thumbnail_url: "",
    is_active: true,
    translations: [
      { language_code: "vi", title: "", summary: "" },
      { language_code: "en", title: "", summary: "" },
    ],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tourRes, poiRes] = await Promise.all([
        tourApi.getAll("vi"),
        poiApi.getAll("vi")
      ]);
      setTours(tourRes.data);
      setPois(poiRes.data);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tour: Tour | null = null) => {
    if (tour) {
      setEditingId(tour.id);
      // Lấy chi tiết để có bản dịch đầy đủ
      tourApi.getDetails(tour.id, "all").then((res) => {
        const d = res.data;
        setFormData({
          price: Number(d.price),
          thumbnail_url: d.thumbnail_url || "",
          is_active: d.is_active,
          translations: d.translations || formData.translations,
        });
      });
    } else {
      setEditingId(null);
      setFormData({
        price: 0,
        thumbnail_url: "",
        is_active: true,
        translations: [
          { language_code: "vi", title: "", summary: "" },
          { language_code: "en", title: "", summary: "" },
        ],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await tourApi.update(editingId, formData);
        toast.success("Cập nhật Tour thành công");
      } else {
        await tourApi.create(formData);
        toast.success("Tạo Tour mới thành công");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Lỗi khi lưu Tour");
    }
  };

  return (
    <div className="p-8 space-y-6 bg-muted/20 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Quản lý Food Tours</h1>
          <p className="text-muted-foreground font-medium">Thiết kế và điều chỉnh các hành trình ẩm thực</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          + TẠO TOUR MỚI
        </button>
      </div>

      {/* Danh sách Tour Table */}
      <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-[10px] font-black uppercase text-muted-foreground tracking-widest">
            <tr>
              <th className="p-6">Tour / Hành trình</th>
              <th className="p-6">Giá niêm yết</th>
              <th className="p-6">Địa điểm</th>
              <th className="p-6">Trạng thái</th>
              <th className="p-6 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tours.map((tour) => (
              <tr key={tour.id} className="hover:bg-muted/5 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={tour.thumbnail_url || "/placeholder.jpg"} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                    <div>
                      <div className="font-black text-foreground group-hover:text-primary transition-colors">{tour.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{tour.summary}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 font-bold text-sm">
                   {Number(tour.price).toLocaleString('vi-VN')}đ
                </td>
                <td className="p-6">
                  <span className="bg-secondary/30 px-3 py-1 rounded-lg text-xs font-bold">
                    📍 {tour.stops_count || 0} điểm dừng
                  </span>
                </td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${tour.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                    {tour.is_active ? "Công khai" : "Bản nháp"}
                  </span>
                </td>
                <td className="p-6 text-right space-x-3">
                  <button onClick={() => openModal(tour)} className="text-sm font-bold text-primary hover:underline">Sửa tin</button>
                  <button className="text-sm font-bold text-muted-foreground hover:text-foreground">Lộ trình</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-card w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-border overflow-hidden">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <h2 className="text-2xl font-black">{editingId ? "CẬP NHẬT TOUR" : "THIẾT KẾ TOUR MỚI"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-muted rounded-full font-bold">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black uppercase text-muted-foreground">Giá tour (VNĐ)</label>
                  <input 
                    type="number" required
                    className="w-full mt-2 p-4 bg-muted/30 border border-border rounded-2xl font-bold focus:ring-2 focus:ring-primary outline-none"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-muted-foreground">URL Ảnh đại diện</label>
                  <input 
                    className="w-full mt-2 p-4 bg-muted/30 border border-border rounded-2xl outline-none"
                    value={formData.thumbnail_url}
                    onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
                  />
                </div>
              </div>

              {/* Loop qua bản dịch */}
              {formData.translations.map((t, idx) => (
                <div key={t.language_code} className="p-6 bg-muted/20 rounded-[2rem] border border-border space-y-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Ngôn ngữ: {t.language_code}</p>
                  <input 
                    placeholder="Tên Tour..." required
                    className="w-full p-4 bg-background border border-border rounded-xl font-bold"
                    value={t.title}
                    onChange={e => {
                      const newT = [...formData.translations];
                      newT[idx].title = e.target.value;
                      setFormData({...formData, translations: newT});
                    }}
                  />
                  <textarea 
                    placeholder="Tóm tắt hành trình..." required
                    className="w-full p-4 bg-background border border-border rounded-xl h-24"
                    value={t.summary}
                    onChange={e => {
                      const newT = [...formData.translations];
                      newT[idx].summary = e.target.value;
                      setFormData({...formData, translations: newT});
                    }}
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 px-2">
                <input 
                  type="checkbox" id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 accent-primary"
                />
                <label htmlFor="is_active" className="text-sm font-bold cursor-pointer">Công khai Tour này lên ứng dụng</label>
              </div>

              <button type="submit" className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/30 hover:opacity-90 transition-all">
                {editingId ? "LƯU THAY ĐỔI" : "XÁC NHẬN TẠO TOUR"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}