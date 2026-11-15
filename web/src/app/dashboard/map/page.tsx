import MapClient from "@/components/map/map-client";

export default function MapPage() {
  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#648CC7]">
          Bengaluru · MySQL records
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
          Mobility map
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B] sm:text-base">
          Explore road-segment geometry, incident locations, and public transport
          stops loaded from the Avenza database.
        </p>
      </header>
      <MapClient showFilters />
    </div>
  );
}
