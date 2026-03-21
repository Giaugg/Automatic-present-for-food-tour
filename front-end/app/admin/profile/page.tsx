"use client";

import { useEffect, useState } from "react";
import { User, UserRole } from "@/types/user";
import { userApi, authApi } from "@/lib/api";
import { toast } from "react-hot-toast"; // Hoặc alert bình thường

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "visitor" as UserRole,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll({ 
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchTerm 
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal để Thêm hoặc Sửa
  const openModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: "", // Không sửa password ở đây
        full_name: user.full_name || "",
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({ username: "", email: "", password: "", full_name: "", role: "visitor" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Cập nhật
        await userApi.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role
        });
        toast.success("Cập nhật thành công");
      } else {
        // Thêm mới (Sử dụng API register hiện có hoặc admin create)
        await authApi.register(formData as any);
        toast.success("Thêm người dùng mới thành công");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
      try {
        await userApi.delete(id);
        fetchUsers();
      } catch (err) {
        alert("Không thể xóa người dùng");
      }
    }
  };

  return (
    <div className="p-8 space-y-6 bg-muted/20 min-h-screen">
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

      {/* Filter Bar (Giữ nguyên như cũ) */}
      <div className="flex gap-4 bg-card p-4 rounded-3xl border border-border">
         <input 
            placeholder="Tìm kiếm..." 
            className="flex-1 bg-muted/50 px-4 py-2 rounded-xl outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
         <button onClick={fetchUsers} className="bg-secondary px-6 rounded-xl font-bold">Lọc</button>
      </div>

      {/* Bảng dữ liệu (Giữ Table cũ nhưng thêm nút Sửa) */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border text-xs font-black uppercase text-muted-foreground">
            <tr>
              <th className="p-5">Thành viên</th>
              <th className="p-5">Vai trò</th>
              <th className="p-5">Số dư</th>
              <th className="p-5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-5">
                  <div className="font-bold">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-5 capitalize font-medium">{u.role}</td>
                <td className="p-5 font-bold text-emerald-600">{Number(u.balance).toLocaleString()}đ</td>
                <td className="p-5 text-right space-x-2">
                  <button onClick={() => openModal(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Sửa</button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL THÊM/SỬA --- */}
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
    </div>
  );
}