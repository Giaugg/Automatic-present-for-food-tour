import MapClient from "@/components/mapclient";
import Sidebar from "@/components/sidebar/sidebar";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col">
        <section className="flex-1">
          <MapClient />
        </section>
        <div className="h-[30vh] w-full rounded bg-white">
          <Sidebar />
        </div>
      </div>
    </main>
  );
}

