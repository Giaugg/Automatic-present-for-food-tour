"use client";

import { useEffect, useState } from "react";
import { POIWithTranslation, CreatePOIDTO, POITranslation } from "@/types/pois";
import { poiApi } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function AdminPOIManagement() {
  const [pois, setPois] = useState<POIWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePOIDTO>({
    latitude: 10.7769,
    longitude: 106.7009,
    trigger_radius: 50,
    category: "Street Food",
    status: true,
    translations: [
      { language_code: "vi", name: "", description: "" },
      { language_code: "en", name: "", description: "" },
    ],
  });

  useEffect(() => {
    fetchPOIs();
  }, []);

  const fetchPOIs = async () => {
    try {
      const { data: list } = await poiApi.getAll("vi");
      const fullData = await Promise.all(
        list.map(async (p: any) => {
          try {
            const { data: details } = await poiApi.getDetails(p.id);
            return { ...p, all_translations: details.translations };
          } catch {
            return p;
          }
        })
      );
      setPois(fullData);
      console.log("Fetched POIs:", fullData);
    } catch {
      toast.error("Lỗi tải danh sách địa điểm");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (poi: POIWithTranslation | null = null) => {
    if (poi) {
      setEditingId(poi.id);
      // Giả sử lấy details để có đủ bản dịch
      poiApi.getDetails(poi.id).then((res) => {
        const d = res.data;
        setFormData({
          latitude: d.latitude,
          longitude: d.longitude,
          trigger_radius: d.trigger_radius,
          category: d.category,
          status: d.status,
          translations: d.translations || [],
        });
      });
    } else {
      setEditingId(null);
      setFormData({
        latitude: 10.7769,
        longitude: 106.7009,
        trigger_radius: 50,
        category: "Street Food",
        status: true,
        translations: [
          { language_code: "vi", name: "", description: "" },
          { language_code: "en", name: "", description: "" },
        ],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await poiApi.update(editingId, formData);
        toast.success("Cập nhật địa điểm thành công");
      } else {
        await poiApi.create(formData);
        toast.success("Thêm địa điểm mới thành công");
      }
      setIsModalOpen(false);
      fetchPOIs();
    } catch (err) {
      toast.error("Có lỗi xảy ra khi lưu dữ liệu");
    }
  };

  const toggleStatus = async (poi: POIWithTranslation) => {
    try {
      await poiApi.update(poi.id, { status: !poi.status });
      fetchPOIs();
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  return (
    <div className="p-8 space-y-6 bg-muted/20 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">QUẢN LÝ ĐỊA ĐIỂM (POI)</h1>
          <p className="text-muted-foreground font-medium">Danh sách các điểm dừng ẩm thực trên bản đồ</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          + Thêm địa điểm
        </button>
      </div>

      {/* Danh sách POI Table */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-xs font-black uppercase text-muted-foreground">
            <tr>
              <th className="p-5">Địa điểm (VN)</th>
              <th className="p-5">Tọa độ</th>
              <th className="p-5">Danh mục</th>
              <th className="p-5">Trạng thái</th>
              <th className="p-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pois.map((poi) => (
              <tr key={poi.id} className="hover:bg-muted/5 transition-colors">
                <td className="p-5 font-bold">{poi.name}</td>
                <td className="p-5 text-sm text-muted-foreground">
                  {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                </td>
                <td className="p-5">
                  <span className="bg-secondary/50 px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {poi.category}
                  </span>
                </td>
                <td className="p-5">
                  <button 
                    onClick={() => toggleStatus(poi)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                      poi.status ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}
                  >
                    {poi.status ? "Hoạt động" : "Tạm ngưng"}
                  </button>
                </td>
                <td className="p-5 text-right space-x-2">
                  <button onClick={() => openModal(poi)} className="text-primary font-bold hover:underline">Sửa</button>
                  <button className="text-destructive font-bold hover:underline">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
              <h2 className="text-xl font-black uppercase">{editingId ? "Cập nhật địa điểm" : "Thêm địa điểm mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Tọa độ & Cơ bản */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase opacity-60">Vĩ độ (Latitude)</label>
                  <input 
                    type="number" step="any" required
                    className="w-full mt-1 p-3 bg-muted/30 border border-border rounded-xl"
                    value={formData.latitude}
                    onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase opacity-60">Kinh độ (Longitude)</label>
                  <input 
                    type="number" step="any" required
                    className="w-full mt-1 p-3 bg-muted/30 border border-border rounded-xl"
                    value={formData.longitude}
                    onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              {/* Bản dịch (Loop qua translations) */}
              {formData.translations.map((trans, index) => (
                <div key={trans.language_code} className="p-4 bg-muted/20 rounded-2xl border border-border space-y-3">
                  <p className="font-black text-primary uppercase text-xs">Ngôn ngữ: {trans.language_code === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}</p>
                  <input 
                    placeholder="Tên địa điểm..."
                    className="w-full p-3 bg-background border border-border rounded-xl font-bold"
                    value={trans.name}
                    onChange={e => {
                      const newTrans = [...formData.translations];
                      newTrans[index].name = e.target.value;
                      setFormData({...formData, translations: newTrans});
                    }}
                  />
                  <textarea 
                    placeholder="Mô tả chi tiết về quán..."
                    className="w-full p-3 bg-background border border-border rounded-xl h-24"
                    value={trans.description}
                    onChange={e => {
                      const newTrans = [...formData.translations];
                      newTrans[index].description = e.target.value;
                      setFormData({...formData, translations: newTrans});
                    }}
                  />
                </div>
              ))}

              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20">
                {editingId ? "CẬP NHẬT NGAY" : "TẠO ĐỊA ĐIỂM"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}