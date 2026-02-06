import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Public Header */}
      <header className="bg-card border-b border-border p-4">
        <nav className="container mx-auto flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-foreground">
            Food Tour
          </Link>
          <Link
            href="/map"
            className="text-muted-foreground hover:text-foreground"
          >
            Bản đồ
          </Link>
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground"
          >
            Quản trị
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
