"use client";

import { useEffect, useState } from "react";
import { OwnerPlan, User, UserRole } from "@/types/user";
import { authApi, OwnerPlanCatalogItem, paymentApi, userApi } from "@/lib/api";
import { toast } from "react-hot-toast";

type PlanFormState = {
  key: string;
  title: string;
  shortDescription: string;
  priceVnd: string;
  durationDays: string;
  maxThumbnailUploads: string;
  maxAudioRadiusMeters: string;
  featuresText: string;
  isActive: boolean;
};

const EMPTY_PLAN_FORM: PlanFormState = {
  key: "",
  title: "",
  shortDescription: "",
  priceVnd: "0",
  durationDays: "",
  maxThumbnailUploads: "3",
  maxAudioRadiusMeters: "30",
  featuresText: "",
  isActive: true,
};

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [ownerPlans, setOwnerPlans] = useState<OwnerPlanCatalogItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "visitor" as UserRole,
    owner_plan: "free" as OwnerPlan,
  });

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<OwnerPlanCatalogItem | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);

  useEffect(() => {
    bootstrapData();
  }, []);

  const bootstrapData = async () => {
    await Promise.all([fetchUsers(), fetchOwnerPlans()]);
  };

  const activeOwnerPlans = ownerPlans.filter((plan) => plan.isActive !== false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userApi.getAll({
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchTerm,
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOwnerPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await paymentApi.getAdminOwnerPlans();
      setOwnerPlans(res.data.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách gói:", err);
      toast.error("Không tải được danh sách gói owner");
    } finally {
      setLoadingPlans(false);
    }
  };

  const openModal = (user: User | null = null) => {
    const fallbackPlanKey = activeOwnerPlans[0]?.key || "free";

    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: "", // Không sửa password ở đây
        full_name: user.full_name || "",
        role: user.role,
        owner_plan: user.owner_plan || fallbackPlanKey,
      });
    } else {
      setEditingUser(null);
      setFormData({ username: "", email: "", password: "", full_name: "", role: "visitor", owner_plan: fallbackPlanKey });
    }
    setIsModalOpen(true);
  };

  const openPlanModal = (plan: OwnerPlanCatalogItem | null = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        key: plan.key,
        title: plan.title,
        shortDescription: plan.shortDescription || "",
        priceVnd: String(plan.priceVnd ?? 0),
        durationDays: plan.durationDays === null ? "" : String(plan.durationDays),
        maxThumbnailUploads: String(plan.maxThumbnailUploads ?? 0),
        maxAudioRadiusMeters: String(plan.maxAudioRadiusMeters ?? 0),
        featuresText: (plan.features || []).join("\n"),
        isActive: plan.isActive !== false,
      });
    } else {
      setEditingPlan(null);
      setPlanForm(EMPTY_PLAN_FORM);
    }
    setIsPlanModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: Partial<User> = {
          full_name: formData.full_name,
          role: formData.role,
        };

        if (formData.role === "owner") {
          payload.owner_plan = formData.owner_plan;
        }

        // Cập nhật
        await userApi.update(editingUser.id, payload);
        toast.success("Cập nhật thành công");
      } else {
        // Thêm mới (Sử dụng API register hiện có hoặc admin create)
        await authApi.register(formData as any);
        toast.success("Thêm người dùng mới thành công");
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      key: planForm.key.trim().toLowerCase(),
      title: planForm.title.trim(),
      shortDescription: planForm.shortDescription.trim(),
      priceVnd: Number(planForm.priceVnd),
      durationDays: planForm.durationDays.trim() === "" ? null : Number(planForm.durationDays),
      maxThumbnailUploads: Number(planForm.maxThumbnailUploads),
      maxAudioRadiusMeters: Number(planForm.maxAudioRadiusMeters),
      features: planForm.featuresText
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      isActive: planForm.isActive,
    };

    if (!editingPlan && !payload.key) {
      toast.error("Key gói không được để trống");
      return;
    }

    try {
      if (editingPlan) {
        await paymentApi.updateAdminOwnerPlan(editingPlan.key, {
          title: payload.title,
          shortDescription: payload.shortDescription,
          priceVnd: payload.priceVnd,
          durationDays: payload.durationDays,
          maxThumbnailUploads: payload.maxThumbnailUploads,
          maxAudioRadiusMeters: payload.maxAudioRadiusMeters,
          features: payload.features,
          isActive: payload.isActive,
        });
        toast.success("Cập nhật gói thành công");
      } else {
        await paymentApi.createAdminOwnerPlan(payload as OwnerPlanCatalogItem);
        toast.success("Tạo gói mới thành công");
      }

      setIsPlanModalOpen(false);
      await fetchOwnerPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể lưu gói owner");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
      try {
        await userApi.delete(id);
        await fetchUsers();
      } catch (err) {
        toast.error("Lỗi khi xóa tài khoản. Vui lòng thử lại.");
      }
    }
  };

  const handleDeletePlan = async (key: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa gói '${key}'?`)) {
      try {
        await paymentApi.deleteAdminOwnerPlan(key);
        toast.success("Đã xóa gói thành công");
        await fetchOwnerPlans();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Không thể xóa gói");
      }
    }
  };

  return (
    <div className="p-8 space-y-10 bg-muted/20 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">QUẢN LÝ TÀI KHOẢN</h1>
          <p className="text-muted-foreground">Thêm, sửa, xóa và phân quyền thành viên</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
        >
          + Thêm thành viên
        </button>
      </div>

      <div className="flex gap-4 bg-card p-4 rounded-3xl border border-border">
        <input
          placeholder="Tìm kiếm..."
          className="flex-1 bg-muted/50 px-4 py-2 rounded-xl outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="bg-muted/40 px-4 rounded-xl border border-border"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="visitor">Visitor</option>
        </select>
        <button onClick={fetchUsers} className="bg-secondary px-6 rounded-xl font-bold">Lọc</button>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-xs font-black uppercase text-muted-foreground">
            <tr>
              <th className="p-5">Thành viên</th>
              <th className="p-5">Vai trò</th>
              <th className="p-5">Gói owner</th>
              <th className="p-5">Số dư</th>
              <th className="p-5">Điểm</th>
              <th className="p-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loadingUsers && (
              <tr>
                <td className="p-5 text-muted-foreground" colSpan={6}>Đang tải danh sách tài khoản...</td>
              </tr>
            )}
            {!loadingUsers && users.length === 0 && (
              <tr>
                <td className="p-5 text-muted-foreground" colSpan={6}>Không có dữ liệu phù hợp.</td>
              </tr>
            )}
            {!loadingUsers && users.map(u => (
              <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-5">
                  <div className="font-bold">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-5 capitalize font-medium">{u.role}</td>
                <td className="p-5">
                  {u.role === "owner" ? (
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${u.owner_plan === "premium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {u.owner_plan || "free"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-5 font-bold text-emerald-600">{Number(u.balance).toLocaleString()}đ</td>
                <td className="p-5 font-bold text-orange-600">{u.points} ⭐</td>
                <td className="p-5 text-right space-x-2">
                  <button onClick={() => openModal(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Sửa</button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight">QUẢN LÝ GÓI OWNER</h2>
            <p className="text-muted-foreground">Admin thêm, sửa, xóa và bật/tắt gói thành viên cho chủ quán</p>
          </div>
          <button
            onClick={() => openPlanModal()}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            + Thêm gói
          </button>
        </div>

        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border text-xs font-black uppercase text-muted-foreground">
              <tr>
                <th className="p-5">Key / Tên gói</th>
                <th className="p-5">Giá</th>
                <th className="p-5">Chu kỳ</th>
                <th className="p-5">Hạn mức</th>
                <th className="p-5">Trạng thái</th>
                <th className="p-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingPlans && (
                <tr>
                  <td className="p-5 text-muted-foreground" colSpan={6}>Đang tải danh sách gói...</td>
                </tr>
              )}
              {!loadingPlans && ownerPlans.length === 0 && (
                <tr>
                  <td className="p-5 text-muted-foreground" colSpan={6}>Chưa có gói nào.</td>
                </tr>
              )}
              {!loadingPlans && ownerPlans.map((plan) => (
                <tr key={plan.key} className="hover:bg-muted/10 transition-colors">
                  <td className="p-5">
                    <div className="font-black uppercase">{plan.key}</div>
                    <div className="font-semibold">{plan.title}</div>
                    <div className="text-xs text-muted-foreground">{plan.shortDescription}</div>
                  </td>
                  <td className="p-5 font-bold text-emerald-600">{Number(plan.priceVnd || 0).toLocaleString()}đ</td>
                  <td className="p-5 text-sm">
                    {plan.durationDays ? `${plan.durationDays} ngày` : "Không giới hạn"}
                  </td>
                  <td className="p-5 text-sm">
                    <div>{plan.maxThumbnailUploads} ảnh</div>
                    <div className="text-muted-foreground">Audio {plan.maxAudioRadiusMeters}m</div>
                  </td>
                  <td className="p-5">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${plan.isActive === false ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {plan.isActive === false ? "inactive" : "active"}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    <button onClick={() => openPlanModal(plan)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Sửa</button>
                    <button onClick={() => handleDeletePlan(plan.key)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-black">{editingUser ? "CHỈNH SỬA HỒ SƠ" : "THÊM THÀNH VIÊN MỚI"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Họ và tên</label>
                <input 
                  required
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Email</label>
                <input 
                  required
                  type="email"
                  disabled={!!editingUser}
                  className={`w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none ${editingUser ? 'bg-muted/10 text-muted-foreground' : 'bg-muted/30 focus:ring-2 focus:ring-primary'}`}
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="text-xs font-black text-muted-foreground uppercase">Mật khẩu</label>
                  <input 
                    required
                    type="password"
                    className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Vai trò</label>
                <select 
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                >
                  <option value="visitor">Visitor</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Gói owner</label>
                <select
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold disabled:opacity-60"
                  value={formData.owner_plan}
                  onChange={e => setFormData({ ...formData, owner_plan: e.target.value as OwnerPlan })}
                  disabled={formData.role !== "owner"}
                >
                  {activeOwnerPlans.length === 0 && <option value="free">free</option>}
                  {formData.owner_plan && !activeOwnerPlans.some((plan) => plan.key === formData.owner_plan) && (
                    <option value={formData.owner_plan}>{formData.owner_plan} (inactive)</option>
                  )}
                  {activeOwnerPlans.map((plan) => (
                    <option key={plan.key} value={plan.key}>{plan.key} - {plan.title}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Chỉ áp dụng khi vai trò là owner.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-muted border border-border rounded-xl font-bold hover:bg-muted/80 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  {editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-black">{editingPlan ? "CHỈNH SỬA GÓI OWNER" : "THÊM GÓI OWNER MỚI"}</h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handlePlanSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Key</label>
                <input
                  required
                  disabled={!!editingPlan}
                  className={`w-full mt-1 px-4 py-3 border border-border rounded-xl outline-none ${editingPlan ? 'bg-muted/10 text-muted-foreground' : 'bg-muted/30 focus:ring-2 focus:ring-primary'}`}
                  value={planForm.key}
                  onChange={e => setPlanForm({ ...planForm, key: e.target.value })}
                  placeholder="vd: vip-90"
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Tên gói</label>
                <input
                  required
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.title}
                  onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black text-muted-foreground uppercase">Mô tả ngắn</label>
                <input
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.shortDescription}
                  onChange={e => setPlanForm({ ...planForm, shortDescription: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Giá (VND)</label>
                <input
                  required
                  min={0}
                  type="number"
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.priceVnd}
                  onChange={e => setPlanForm({ ...planForm, priceVnd: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Chu kỳ (ngày)</label>
                <input
                  min={1}
                  type="number"
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.durationDays}
                  onChange={e => setPlanForm({ ...planForm, durationDays: e.target.value })}
                  placeholder="Để trống nếu không giới hạn"
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Số ảnh tối đa</label>
                <input
                  required
                  min={0}
                  type="number"
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.maxThumbnailUploads}
                  onChange={e => setPlanForm({ ...planForm, maxThumbnailUploads: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-black text-muted-foreground uppercase">Bán kính audio tối đa (m)</label>
                <input
                  required
                  min={1}
                  type="number"
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.maxAudioRadiusMeters}
                  onChange={e => setPlanForm({ ...planForm, maxAudioRadiusMeters: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black text-muted-foreground uppercase">Danh sách tính năng (mỗi dòng 1 ý)</label>
                <textarea
                  rows={5}
                  className="w-full mt-1 px-4 py-3 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={planForm.featuresText}
                  onChange={e => setPlanForm({ ...planForm, featuresText: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="plan-active"
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={e => setPlanForm({ ...planForm, isActive: e.target.checked })}
                />
                <label htmlFor="plan-active" className="text-sm font-semibold">Kích hoạt gói</label>
              </div>

              <div className="md:col-span-2 pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-3 bg-muted border border-border rounded-xl font-bold hover:bg-muted/80 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  {editingPlan ? "Lưu thay đổi" : "Tạo gói"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
