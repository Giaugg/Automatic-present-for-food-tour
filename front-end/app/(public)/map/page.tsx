import MapClient from "@/components/mapclient";

export default function MapPage() {
  return (
    <section className="h-[100dvh] sm:h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] w-full overflow-hidden">
      <MapClient />
    </section>
  );
}
