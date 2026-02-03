import Link from "next/link";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] p-4">
        <h2 className="text-xl font-bold mb-6 text-[var(--sidebar-foreground)]">Dashboard</h2>
        <nav className="space-y-2">
          <Link 
            href="/admin" 
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Quản trị
          </Link>
          <Link 
            href="/vendor" 
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Gian hàng
          </Link>
          <Link 
            href="/profile" 
            className="block p-2 rounded-[var(--radius)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
          >
            Hồ sơ
          </Link>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 text-[var(--foreground)]">{children}</div>
    </div>
  );
}
