import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Public Header */}
      <header className="bg-[var(--card)] border-b border-[var(--border)] p-4">
        <nav className="container mx-auto flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-[var(--foreground)]">
            Food Tour
          </Link>
          <Link
            href="/map"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Bản đồ
          </Link>
          <Link
            href="/admin"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Quản trị
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
