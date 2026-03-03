import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-4">
        <h2 className="text-xl font-bold mb-6 text-sidebar-foreground">
          Admin Dashboard
        </h2>
        <nav className="space-y-2">
          <Link
            href="/admin"
            className="block p-2 rounded-(--radius) text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/profile"
            className="block p-2 rounded-(--radius) text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Hồ sơ
          </Link>
          <Link
            href="/admin/vendor"
            className="block p-2 rounded-(--radius) text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Quản lý Vendor
          </Link>
          <Link
            href="/admin/stores"
            className="block p-2 rounded-(--radius) text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Quản lý cửa hàng
          </Link>
        </nav>
      </aside>

      {/* Navbar + Main content */}
      <div className="flex-1 flex flex-col">
        <nav className="bg-card border-b border-border p-4 flex justify-between items-center">
          <span className="font-semibold text-foreground">Quản trị hệ thống</span>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Về trang chủ
          </Link>
        </nav>
        <main className="flex-1 text-foreground">{children}</main>
      </div>
    </div>
  );
}
