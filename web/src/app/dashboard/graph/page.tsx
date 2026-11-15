"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GitBranch } from "lucide-react";

type NearbyStop = {
  id: number;
  name: string;
  type: string;
  distanceM: number;
};

type GraphStats = { routes: number; roadSegments: number; transportStops: number };

type PathIncident = {
  id: number;
  type: string;
  severity: string;
  occurredAt: string;
};
type PathSegment = {
  id: number;
  name: string;
  lengthM: number;
  incidents: PathIncident[];
  nearbyStops: NearbyStop[];
};
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

export default function GraphPage() {
  const [stats, setStats] = useState<GraphStats>({ routes: 0, roadSegments: 0, transportStops: 0 });
  const [localities, setLocalities] = useState<string[]>([]);
  const [startLocality, setStartLocality] = useState("");
  const [finishLocality, setFinishLocality] = useState("");
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [pathError, setPathError] = useState("");
  const [searchingPaths, setSearchingPaths] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/graph")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Could not connect to Neo4j.");
        }
        setStats(data.stats ?? { routes: 0, roadSegments: 0, transportStops: 0 });
        setLocalities(data.localities ?? []);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not connect to Neo4j.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function findPaths(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPathError("");
    setPaths([]);

    if (!startLocality || !finishLocality || startLocality === finishLocality) {
      setPathError("Choose two different localities.");
      return;
    }

    setSearchingPaths(true);
    try {
      const response = await fetch(
        `/api/graph/paths?from=${encodeURIComponent(startLocality)}&to=${encodeURIComponent(finishLocality)}`,
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not find connected paths.");
      }
      setPaths(data.paths ?? []);
      if (!data.paths?.length) {
        setPathError(
          "No saved route contains both selected locations. Try another start or end point.",
        );
      }
    } catch (reason) {
      setPathError(
        reason instanceof Error ? reason.message : "Could not find connected paths.",
      );
    } finally {
      setSearchingPaths(false);
    }
  }

  return (
    <div className="space-y-7 pb-10">
      <section>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#648CC7]">
          <GitBranch size={16} /> Neo4j graph database
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
          Route relationships
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B] sm:text-base">
          Use Neo4j to traverse connected road segments and compare candidate
          paths by distance, infrastructure ratings, and recorded incidents.
          MySQL remains the source of truth for the underlying records.
        </p>
      </section>

      <div className="rounded-xl border border-[#D9E6F7] bg-[#EDF4FD] px-4 py-3 text-sm leading-6 text-[#526A89]">
        Graph model: <strong>RoadSegment</strong> —[CONNECTS_TO]—{" "}
        <strong>RoadSegment</strong>. Connections come from the ordered
        segments in MySQL routes; transit links use <strong>NEAR_STOP</strong>.
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Routes in graph" value={stats.routes} />
        <Metric label="Connected road segments" value={stats.roadSegments} />
        <Metric label="Connected transit stops" value={stats.transportStops} />
      </section>

      {!loading && !error && (
        <section className="rounded-2xl border border-[#E1E7F0] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              Find available paths
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Choose two Bengaluru localities. Neo4j traverses connected road
              segments between routes that start and end there, then ranks up to
              five options by incidents, accessibility, lighting, and distance.
            </p>
          </div>

          <form onSubmit={findPaths} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-[#526078]">
              Starting locality
              <select
                value={startLocality}
                onChange={(event) => {
                  setStartLocality(event.target.value);
                  setPaths([]);
                  setPathError("");
                }}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#D6DFEC] bg-white px-3 text-sm text-[#172033]"
                required
                disabled={localities.length === 0}
              >
                <option value="" disabled>Select a starting locality</option>
                {localities.map((locality) => (
                  <option key={locality} value={locality}>
                    {locality}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[#526078]">
              Destination
              <select
                value={finishLocality}
                onChange={(event) => {
                  setFinishLocality(event.target.value);
                  setPaths([]);
                  setPathError("");
                }}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#D6DFEC] bg-white px-3 text-sm text-[#172033]"
                required
                disabled={localities.length === 0}
              >
                <option value="" disabled>Select a destination locality</option>
                {localities.map((locality) => (
                  <option key={locality} value={locality}>
                    {locality}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={searchingPaths || localities.length < 2}
              className="self-end rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293750] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searchingPaths ? "Searching paths..." : "Search paths"}
            </button>
          </form>

          {pathError && (
            <p className="mt-4 rounded-lg bg-[#F5F7FB] px-3 py-2 text-sm text-[#526078]">
              {pathError}
            </p>
          )}

          {paths.length > 0 && (
            <ol className="mt-4 space-y-3">
              {paths.map((path, index) => (
                <li
                  key={`${path.routeId}-${index}`}
                  className="rounded-xl border border-[#E8EDF4] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#172033]">
                      {index + 1}. {path.routeName} · {path.distanceM} m
                    </h3>
                    <span className="text-xs text-[#64748B]">
                      {path.incidentCount} reported incidents · lighting {path.averageLighting}/5 · accessibility {path.averageAccessibility}/5
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8794A7]">
                    {path.origin} → {path.destination}
                  </p>
                  <ol className="mt-3 space-y-3">
                    {path.segments.map((segment, segmentIndex) => (
                      <li
                        key={`${path.routeId}-${segment.id}-${segmentIndex}`}
                        className="rounded-lg bg-[#F8FAFD] p-3"
                      >
                        <p className="text-sm font-medium text-[#344054]">
                          {segmentIndex + 1}. {segment.name} · {segment.lengthM} m
                        </p>
                        {segment.nearbyStops.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-[#526078]">Nearby transport</p>
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {segment.nearbyStops.map((stop) => (
                                <li key={stop.id} className="rounded-md bg-[#EAF1FA] px-2 py-1 text-xs text-[#42536D]">
                                  {stop.name} · {stop.distanceM} m
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {segment.incidents.length > 0 ? (
                          <ul className="mt-2 space-y-1.5">
                            {segment.incidents.map((incident) => (
                              <li key={incident.id}>
                                <details className="rounded-lg border border-rose-100 bg-white px-3 py-2">
                                  <summary className="cursor-pointer text-xs font-medium leading-5 text-[#7A3440] marker:text-[#A34E5B]">
                                    {incident.severity} {incident.type} · {incident.occurredAt}
                                    <span className="ml-2 text-[#64748B]">Incident details</span>
                                  </summary>
                                  <p className="mt-2 text-xs leading-5 text-[#526178]">
                                    {incident.type === "ACCIDENT"
                                      ? "An accident report was recorded."
                                      : incident.type === "THEFT"
                                        ? "A theft report was recorded."
                                        : incident.type === "HARASSMENT"
                                          ? "A harassment report was recorded."
                                          : "An incident was recorded under the other category."}
                                    {` It is linked to ${segment.name} (segment #${segment.id}) with ${incident.severity.toLowerCase()} severity.`}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-[#8794A7]">
                                    This database record has no additional narrative description.
                                  </p>
                                </details>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-[#8794A7]">
                            No incidents reported on this segment.
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {loading ? (
        <p className="rounded-2xl border border-[#E1E7F0] bg-white p-8 text-center text-[#64748B]">
          Syncing and loading the Neo4j route graph...
        </p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Neo4j is not available yet.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2">
            Start your local Neo4j database and set its connection values in
            the web app&apos;s environment before refreshing this page.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E1E7F0] bg-white p-5">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#172033]">{value}</p>
    </div>
  );
}
