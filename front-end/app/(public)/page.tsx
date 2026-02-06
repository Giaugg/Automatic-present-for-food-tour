import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-6">Food Tour</h1>
        <p className="text-muted-foreground mb-8">
          Khám phá ẩm thực địa phương
        </p>
        <Link
          href="/map"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-(--radius) hover:opacity-90"
        >
          Xem bản đồ
        </Link>
      </div>
    </main>
  );
}
