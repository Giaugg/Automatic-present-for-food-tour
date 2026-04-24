"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trialApi } from "@/lib/api";
import {
  Users,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Calendar,
  Smartphone,
  CheckCircle,
  XCircle,
  Hourglass,
} from "lucide-react";

interface TrialAccount {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  max_devices: number;
  max_sessions: number;
  max_ips: number;
  trial_start_at: string;
  trial_end_at: string;
  trial_status: string;
  max_duration_days: number;
  days_remaining: number;
  features: any;
}

export default function TrialAccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [trialAccounts, setTrialAccounts] = useState<TrialAccount[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    max_devices: 3,
    max_sessions: 5,
    max_ips: 5,
    max_duration_days: 7,
  });

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const [accountsRes, statsRes] = await Promise.all([
        trialApi.getTrialAccounts(selectedStatus),
        trialApi.getTrialStats(),
      ]);

      setTrialAccounts(accountsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setErrorMessage("");
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        router.replace("/login");
        return;
      }
      setErrorMessage("Không thể tải dữ liệu. Vui lòng thử lại.");
      console.error("Lỗi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrial = async () => {
    if (!formData.email) {
      setErrorMessage("Email là bắt buộc");
      return;
    }

    setIsCreating(true);
    try {
      await trialApi.createTrialAccount({
        email: formData.email,
        full_name: formData.full_name || "Khách hàng dùng thử",
        max_devices: formData.max_devices,
        max_sessions: formData.max_sessions,
        max_ips: formData.max_ips,
        max_duration_days: formData.max_duration_days,
      });

      setShowCreateModal(false);
      setFormData({
        email: "",
        full_name: "",
        max_devices: 3,
        max_sessions: 5,
        max_ips: 5,
        max_duration_days: 7,
      });
      alert("Tạo tài khoản dùng thử thành công!");
      await fetchData();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || "Lỗi tạo trial account");
    } finally {
      setIsCreating(false);
    }
  };

  const handleExtendTrial = async (userId: string) => {
    const days = prompt("Gia hạn bao nhiêu ngày?", "7");
    if (!days) return;

    try {
      await trialApi.extendTrialAccount(userId, parseInt(days));
      alert("Gia hạn trial thành công!");
      await fetchData();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || "Lỗi gia hạn trial");
    }
  };

  const handleCancelTrial = async (userId: string) => {
    if (!confirm("Bạn chắc chắn muốn hủy trial này không?")) return;

    try {
      await trialApi.cancelTrialAccount(userId, "Admin cancelled");
      alert("Hủy trial thành công!");
      await fetchData();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || "Lỗi hủy trial");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string, daysRemaining: number) => {
    if (status === "active" && daysRemaining > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
          <CheckCircle className="w-3 h-3" /> Đang hoạt động
        </span>
      );
    } else if (status === "expired" || daysRemaining <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
          <XCircle className="w-3 h-3" /> Hết hạn
        </span>
      );
    } else if (status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
          <AlertCircle className="w-3 h-3" /> Đã hủy
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Trial Accounts</h1>
          <p className="text-muted-foreground">Tạo và quản lý tài khoản dùng thử</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tạo Trial Mới
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Tổng Trial"
            value={stats.total_trials}
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            title="Đang Hoạt Động"
            value={stats.active_trials}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          />
          <StatCard
            title="Hết Hạn"
            value={stats.expired_trials}
            icon={<XCircle className="w-5 h-5 text-red-500" />}
          />
          <StatCard
            title="Chưa Hết Hạn"
            value={stats.unexpired_active}
            icon={<Hourglass className="w-5 h-5 text-orange-500" />}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["active", "expired", "cancelled", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedStatus === status
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {status === "active"
              ? "Đang Hoạt Động"
              : status === "expired"
              ? "Hết Hạn"
              : status === "cancelled"
              ? "Đã Hủy"
              : "Tất Cả"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Tên Đầy Đủ</th>
                <th className="px-4 py-3 text-left">Giới Hạn</th>
                <th className="px-4 py-3 text-left">Bắt Đầu</th>
                <th className="px-4 py-3 text-left">Kết Thúc</th>
                <th className="px-4 py-3 text-center">Ngày Còn Lại</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {trialAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có tài khoản dùng thử
                  </td>
                </tr>
              ) : (
                trialAccounts.map((trial) => (
                  <tr key={trial.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{trial.email}</td>
                    <td className="px-4 py-3">{trial.full_name}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="space-y-1">
                        <div>Devices: {trial.max_devices}</div>
                        <div>Sessions: {trial.max_sessions}</div>
                        <div>IPs: {trial.max_ips}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(trial.trial_start_at)}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(trial.trial_end_at)}</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          trial.days_remaining > 3
                            ? "bg-green-100 text-green-700"
                            : trial.days_remaining > 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {trial.days_remaining} ngày
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(trial.trial_status, trial.days_remaining)}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => handleExtendTrial(trial.user_id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Gia hạn"
                      >
                        Gia hạn
                      </button>
                      <button
                        onClick={() => handleCancelTrial(trial.user_id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Hủy"
                      >
                        Hủy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Tạo Trial Account Mới</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tên Đầy Đủ</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Khách hàng"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Devices</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_devices}
                    onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Sessions</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.max_sessions}
                    onChange={(e) => setFormData({ ...formData, max_sessions: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max IPs</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_ips}
                    onChange={(e) => setFormData({ ...formData, max_ips: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thời Gian Dùng Thử (Ngày)</label>
                <select
                  value={formData.max_duration_days}
                  onChange={(e) =>
                    setFormData({ ...formData, max_duration_days: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 ngày</option>
                  <option value={3}>3 ngày</option>
                  <option value={7}>7 ngày</option>
                  <option value={14}>14 ngày</option>
                  <option value={30}>30 ngày</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTrial}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isCreating ? "Đang tạo..." : "Tạo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
