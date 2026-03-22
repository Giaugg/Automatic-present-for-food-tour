import MapClient1 from "@/components/mapclient";

export default function MapPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col">
        <section className="flex-1">
          <MapClient1 />
        </section>
      </div>
    </main>
  );
}
