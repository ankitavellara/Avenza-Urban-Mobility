"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, MapPin, Route as RouteIcon, Search, X } from "lucide-react";

type RouteRecord = {
  id: number;
  name: string;
  origin: string;
  destination: string;
  segments: number;
  distance: number;
};

type NearbyStop = { id: number; name: string; type: string; distanceM: number };
type PathIncident = { id: number; type: string; severity: string; description: string; occurredAt: string };
type PathSegment = { id: number; name: string; lengthM: number; incidents: PathIncident[]; nearbyStops: NearbyStop[] };
type PathResult = {
  routeId: number;
  routeName: string;
  origin: string;
  destination: string;
  segments: PathSegment[];
  distanceM: number;
  incidentCount: number;
  averageLighting: number;
  averageAccessibility: number;
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState<RouteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localities, setLocalities] = useState<string[]>([]);
  const [graphStats, setGraphStats] = useState({ routes: 0, roadSegments: 0, transportStops: 0 });
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState("");
  const [localitiesLoading, setLocalitiesLoading] = useState(true);
  const [localitiesError, setLocalitiesError] = useState("");
  const [startLocality, setStartLocality] = useState("");
  const [destinationLocality, setDestinationLocality] = useState("");
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [pathError, setPathError] = useState("");
  const [searchingPaths, setSearchingPaths] = useState(false);

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

  useEffect(() => {
    fetch("/api/localities")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Could not load localities.");
        setLocalities((data.localities ?? []).map((item: { name: string }) => item.name));
      })
      .catch((reason: unknown) => setLocalitiesError(reason instanceof Error ? reason.message : "Could not load localities."))
      .finally(() => setLocalitiesLoading(false));

    fetch("/api/graph")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "Could not load locality path data.");
        setGraphStats(data.stats ?? { routes: 0, roadSegments: 0, transportStops: 0 });
      })
      .catch((reason: unknown) => setGraphError(reason instanceof Error ? reason.message : "Could not load locality path data."))
      .finally(() => setGraphLoading(false));
  }, []);

  async function searchPaths(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaths([]);
    setPathError("");
    if (!startLocality || !destinationLocality || startLocality === destinationLocality) {
      setPathError("Choose two different localities.");
      return;
    }

    setSearchingPaths(true);
    try {
      const response = await fetch(`/api/graph/paths?from=${encodeURIComponent(startLocality)}&to=${encodeURIComponent(destinationLocality)}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not find routes for those localities.");
      setPaths(data.paths ?? []);
      if (!data.paths?.length) setPathError("No saved route was found between these localities. Try another pair.");
    } catch (reason) {
      setPathError(reason instanceof Error ? reason.message : "Could not find routes for those localities.");
    } finally {
      setSearchingPaths(false);
    }
  }

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
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Find a route</h2>
        <p className="mt-2 text-base text-[#58677D]">
          Choose where you’re starting and where you’re going to see available paths and their reported incidents.
        </p>
      </header>

      <section className="rounded-2xl border border-[#D9E6F7] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#5079B4]"><GitBranch size={20} /></span>
          <div>
            <h3 className="text-lg font-bold text-[#172033]">Search paths with Neo4j</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">
              MySQL stores the routes, locality-to-road mappings, incidents, and transit records. Neo4j connects those records as a graph, finds route segments between your selected localities, and ranks the available paths by incidents, accessibility, lighting, and distance.
            </p>
          </div>
        </div>

        {graphLoading && <p role="status" className="mt-5 rounded-xl bg-[#F5F7FB] px-4 py-3 text-sm text-[#64748B]">Connecting Neo4j to the MySQL route data…</p>}
        {!graphLoading && graphError && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><p className="font-semibold">Neo4j is not connected.</p><p>{graphError} Start the Neo4j DBMS and refresh to sync it from MySQL. The locality selectors remain available below.</p></div>}
        {localitiesLoading ? (
          <p role="status" className="mt-5 rounded-xl bg-[#F5F7FB] px-4 py-3 text-sm text-[#64748B]">Loading localities from MySQL…</p>
        ) : localitiesError ? (
          <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{localitiesError}</p>
        ) : (
          <>
            <form onSubmit={searchPaths} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm font-semibold text-[#526078]">Starting locality
                <select required value={startLocality} onChange={(event) => { setStartLocality(event.target.value); setPaths([]); setPathError(""); }} className={inputClass}>
                  <option value="">Select a starting locality</option>
                  {localities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#526078]">Destination
                <select required value={destinationLocality} onChange={(event) => { setDestinationLocality(event.target.value); setPaths([]); setPathError(""); }} className={inputClass}>
                  <option value="">Select a destination locality</option>
                  {localities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                </select>
              </label>
              <button type="submit" disabled={searchingPaths || localities.length < 2} className="self-end rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold text-white hover:bg-[#293750] disabled:cursor-not-allowed disabled:opacity-50">
                {searchingPaths ? "Searching paths…" : "Search paths"}
              </button>
            </form>
            {!graphError && !graphLoading && <p className="mt-3 text-xs text-[#8794A7]">Neo4j graph: {graphStats.routes} routes · {graphStats.roadSegments} road segments · {graphStats.transportStops} connected stops</p>}
            {pathError && <p role="status" className="mt-4 rounded-xl bg-[#F5F7FB] px-4 py-3 text-sm text-[#526078]">{pathError}</p>}
            {paths.length > 0 && <ol className="mt-5 space-y-4">
              {paths.map((path, index) => <li key={`${path.routeId}-${index}`} className="rounded-xl border border-[#E1E7F0] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-[#668EC6]">Path {index + 1}</p><h4 className="mt-1 font-bold text-[#172033]">{path.routeName}</h4><p className="mt-1 text-sm text-[#64748B]">{path.origin} → {path.destination} · {path.distanceM} m</p></div>
                  <p className="text-sm text-[#526078]">{path.incidentCount} incidents · lighting {path.averageLighting}/5 · accessibility {path.averageAccessibility}/5</p>
                </div>
                <Link
                  href={`/dashboard/map?segments=${path.segments.map((segment) => segment.id).join(",")}&route=${encodeURIComponent(path.routeName)}&from=${encodeURIComponent(path.origin)}&to=${encodeURIComponent(path.destination)}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#C9D9EE] bg-white px-3 py-2 text-sm font-semibold text-[#365F98] transition hover:bg-[#F0F5FD]"
                >
                  <MapPin size={16} /> View on map
                </Link>
                <ol className="mt-4 space-y-3">{path.segments.map((segment, segmentIndex) => <li key={`${path.routeId}-${segment.id}-${segmentIndex}`} className="rounded-lg bg-[#F8FAFD] p-3">
                  <p className="text-sm font-semibold text-[#344054]">{segmentIndex + 1}. {segment.name} · {segment.lengthM} m</p>
                  {segment.nearbyStops.length > 0 ? <p className="mt-2 text-xs leading-5 text-[#526078]">Nearby transport: {segment.nearbyStops.map((stop) => `${stop.name} · ${stop.distanceM} m`).join(" · ")}</p> : <p className="mt-2 text-xs leading-5 text-[#8794A7]">No transport stop is within 800 m of this segment.</p>}
                  {segment.incidents.length > 0 ? <ul className="mt-2 space-y-1.5">{segment.incidents.map((incident) => <li key={incident.id}>
                    <details className="rounded-lg border border-rose-100 bg-white px-3 py-2"><summary className="cursor-pointer text-xs font-medium leading-5 text-[#7A3440]">{incident.severity} {incident.type} · {incident.occurredAt}<span className="ml-2 text-[#64748B]">Incident details</span></summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#526178]">{incident.description || `No description is available for this legacy ${incident.type.toLowerCase()} report.`}</p>
                      <p className="mt-1 text-xs leading-5 text-[#8794A7]">The database does not store an additional narrative description for this record.</p>
                    </details>
                  </li>)}</ul> : <p className="mt-2 text-xs text-[#8794A7]">No incidents reported on this segment.</p>}
                </li>)}</ol>
              </li>)}
            </ol>}
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total routes" value={String(routes.length)} />
        <Summary label="Routes with segments" value={String(routes.filter((r) => r.segments > 0).length)} />
        <Summary label="Total route distance" value={`${routes.reduce((sum, r) => sum + Number(r.distance), 0).toFixed(1)} km`} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white">
        <div className="border-b border-[#E1E7F0] p-5 sm:p-6">
          <h3 className="text-lg font-bold text-[#172033]">Browse saved routes</h3>
          <p className="mt-1 text-sm text-[#64748B]">Search and inspect the route records stored in MySQL.</p>
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
