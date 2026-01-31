import MapClient from "@/components/mapclient";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col">
        <section className="flex-1">
          <MapClient />
        </section>
      </div>
    </main>
  );
}

