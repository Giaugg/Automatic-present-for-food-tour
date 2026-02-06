import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] p-4">
        <h2 className="text-xl font-bold mb-6 text-[var(--sidebar-foreground)]">
          Admin Dashboard
        </h2>
        <nav className="space-y-2">
          <Link
            href="/admin"
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/profile"
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Hồ sơ
          </Link>
          <Link
            href="/admin/vendor"
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Quản lý Vendor
          </Link>
          <Link
            href="/admin/stores"
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Quản lý cửa hàng
          </Link>
        </nav>
      </aside>

      {/* Navbar + Main content */}
      <div className="flex-1 flex flex-col">
        <nav className="bg-[var(--card)] border-b border-[var(--border)] p-4 flex justify-between items-center">
          <span className="font-semibold text-[var(--foreground)]">Quản trị hệ thống</span>
          <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Về trang chủ
          </Link>
        </nav>
        <main className="flex-1 text-[var(--foreground)]">{children}</main>
      </div>
    </div>
  );
}
