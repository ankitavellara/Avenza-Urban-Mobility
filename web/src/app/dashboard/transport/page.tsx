
"use client";

import { useEffect, useMemo, useState } from "react";

type Segment = {
  segmentId: number;
  road: string;
  distanceM: number;
};

type Stop = {
  stopId: number;
  stopName: string;
  transportType: string;
  latitude: number | null;
  longitude: number | null;
  linkedSegments: Segment[];
};

export default function TransportPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");

  useEffect(() => {
    async function loadStops() {
      try {
        const response = await fetch("/api/transport");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load transport stops.");
        }

        setStops(data.stops ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStops();
  }, []);

  const types = useMemo(
    () => Array.from(new Set(stops.map((stop) => stop.transportType))),
    [stops]
  );

  const filteredStops = useMemo(() => {
    const term = search.toLowerCase().trim();

    return stops.filter((stop) => {
      const matchesType =
        type === "ALL" || stop.transportType === type;

      const matchesSearch =
        !term ||
        stop.stopName.toLowerCase().includes(term) ||
        stop.transportType.toLowerCase().includes(term) ||
        stop.linkedSegments.some((segment) =>
          segment.road.toLowerCase().includes(term)
        );

      return matchesType && matchesSearch;
    });
  }, [stops, search, type]);

  const connectedSegmentCount = new Set(
    stops.flatMap((stop) =>
      stop.linkedSegments.map((segment) => segment.segmentId)
    )
  ).size;

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-8 text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Avenza · Urban Mobility
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Public Transport
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Explore transit stops and the road segments connected to them.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total stops</p>
            <p className="mt-2 text-3xl font-bold">{stops.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Transport types</p>
            <p className="mt-2 text-3xl font-bold">{types.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Connected segments</p>
            <p className="mt-2 text-3xl font-bold">
              {connectedSegmentCount}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stops or connected roads..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-600"
          >
            <option value="ALL">All transport types</option>

            {types.map((transportType) => (
              <option key={transportType} value={transportType}>
                {transportType}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading transport stops...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No transport stops match your search.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStops.map((stop) => (
              <article
                key={stop.stopId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-700">
                      {stop.transportType}
                    </p>

                    <h2 className="text-lg font-semibold">
                      {stop.stopName}
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Stop ID · {stop.stopId}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl">
                    {stop.transportType.toLowerCase().includes("rail")
                      ? "🚆"
                      : stop.transportType.toLowerCase().includes("metro")
                      ? "🚇"
                      : stop.transportType.toLowerCase().includes("bus")
                      ? "🚌"
                      : "🚏"}
                  </div>
                </div>

                {stop.latitude != null && stop.longitude != null && (
                  <p className="mb-4 text-xs text-slate-500">
                    {stop.latitude}, {stop.longitude}
                  </p>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Connected roads
                    </h3>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {stop.linkedSegments.length}
                    </span>
                  </div>

                  {stop.linkedSegments.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No road segments linked.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stop.linkedSegments.map((segment) => (
                        <div
                          key={segment.segmentId}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {segment.road}
                            </p>

                            <p className="text-xs text-slate-400">
                              Segment #{segment.segmentId}
                            </p>
                          </div>

                          <span className="whitespace-nowrap text-xs font-medium text-slate-600">
                            {segment.distanceM} m
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
