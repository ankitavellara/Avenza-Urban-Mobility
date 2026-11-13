"use client";

import { useEffect, useMemo, useState } from "react";
import { Route as RouteIcon, Search, X } from "lucide-react";

type RouteRecord = {
  id: number;
  name: string;
  origin: string;
  destination: string;
  segments: number;
  distance: number;
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState<RouteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/routes")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load routes");
        return res.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Could not load routes");
        setRoutes(data.routes);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routes
      .filter((r) => [r.name, r.origin, r.destination].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === "distance") return Number(a.distance) - Number(b.distance);
        if (sort === "segments") return Number(a.segments) - Number(b.segments);
        return a.name.localeCompare(b.name);
      });
  }, [routes, search, sort]);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-[#668EC6]">MOBILITY MANAGEMENT</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Routes</h2>
        <p className="mt-2 text-base text-[#58677D]">
          Live predefined walking routes and their road-segment connections.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total routes" value={String(routes.length)} />
        <Summary label="Routes with segments" value={String(routes.filter((r) => r.segments > 0).length)} />
        <Summary label="Total route distance" value={`${routes.reduce((sum, r) => sum + Number(r.distance), 0).toFixed(1)} km`} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white">
        <div className="border-b border-[#E1E7F0] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9AB1]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search routes, origins, destinations..."
                className={`${inputClass} pl-11`}
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass}>
              <option value="name">Sort by name</option>
              <option value="distance">Sort by distance</option>
              <option value="segments">Sort by segments</option>
            </select>
          </div>
          <p className="mt-3 text-sm text-[#58677D]">
            {loading ? "Loading routes from MySQL..." : `Showing ${filtered.length} of ${routes.length} database routes`}
          </p>
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#F8FAFD] text-xs uppercase tracking-wider text-[#58677D]">
              <tr>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Distance</th>
                <th className="px-6 py-4">Segments</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E7F0]">
              {filtered.map((route) => (
                <tr key={route.id} className="transition hover:bg-[#F8FAFD]">
                  <td className="px-6 py-5">
                    <p className="font-bold">{route.name}</p>
                    <p className="mt-1 text-sm text-[#58677D]">{route.origin} → {route.destination}</p>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold">{Number(route.distance).toFixed(2)} km</td>
                  <td className="px-6 py-5 text-sm">{route.segments}</td>
                  <td className="px-6 py-5">
                    <button onClick={() => setSelected(route)} className="font-bold text-[#496FA8] hover:underline">View</button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <RouteIcon size={28} className="mx-auto text-[#8A9AB1]" />
                    <p className="mt-3 font-bold">No matching routes</p>
                    <p className="mt-1 text-sm text-[#58677D]">Try changing your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/40 p-4" onClick={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#668EC6]">ROUTE DETAILS</p>
                <h3 className="mt-2 text-2xl font-extrabold">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 hover:bg-[#F5F7FB]"><X size={21} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <Detail label="Origin" value={selected.origin} />
              <Detail label="Destination" value={selected.destination} />
              <Detail label="Distance" value={`${Number(selected.distance).toFixed(2)} km`} />
              <Detail label="Road segments" value={String(selected.segments)} />
            </div>
            <button onClick={() => setSelected(null)} className="mt-6 w-full rounded-xl bg-[#172033] py-3 font-bold text-white hover:bg-[#293951]">Close</button>
          </section>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-[#D6DFEC] bg-white px-4 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#8A9AB1] focus:border-[#83ACE5] focus:ring-2 focus:ring-[#A5C5F0]/40";

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#E1E7F0] bg-white p-5"><p className="text-sm font-semibold text-[#58677D]">{label}</p><p className="mt-3 text-3xl font-extrabold">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-[#E1E7F0] pb-3"><span className="text-sm text-[#58677D]">{label}</span><span className="text-right text-sm font-bold">{value}</span></div>;
}
