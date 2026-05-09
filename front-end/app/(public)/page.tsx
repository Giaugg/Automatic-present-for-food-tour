import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col items-center justify-center text-center w-full">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 md:mb-8 break-words">Food Tour</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 max-w-2xl px-2">
          Khám phá ẩm thực địa phương
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link
            href="/map"
            className="inline-block px-4 sm:px-6 py-2.5 sm:py-3 md:py-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all text-sm sm:text-base font-medium whitespace-nowrap"
          >
            Xem bản đồ
          </Link>
        </div>
      </div>
    </main>
  );
}