
"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  BusFront,
  Clock,
  MapPin,
  Search,
  TrainFront,
  TramFront,
  X,
} from "lucide-react";

type TransportMode = "Bus" | "Metro" | "Train";

type TransportStop = {
  id: number;
  name: string;
  area: string;
  mode: TransportMode;
  routes: string[];
  distanceToRoad: number;
  operatingHours: string;
  accessible: boolean;
};

const demoStops: TransportStop[] = [
  {
    id: 1,
    name: "Central Bus Stop",
    area: "Central Bengaluru",
    mode: "Bus",
    routes: ["201", "301", "500"],
    distanceToRoad: 120,
    operatingHours: "05:30–23:00",
    accessible: true,
  },
  {
    id: 2,
    name: "City Market Junction",
    area: "Chickpet",
    mode: "Bus",
    routes: ["12", "45", "60"],
    distanceToRoad: 85,
    operatingHours: "05:00–22:30",
    accessible: false,
  },
  {
    id: 3,
    name: "MG Road Station",
    area: "MG Road",
    mode: "Metro",
    routes: ["Purple Line"],
    distanceToRoad: 160,
    operatingHours: "05:00–23:00",
    accessible: true,
  },
  {
    id: 4,
    name: "Cubbon Park Station",
    area: "Cubbon Park",
    mode: "Metro",
    routes: ["Purple Line"],
    distanceToRoad: 210,
    operatingHours: "05:00–23:00",
    accessible: true,
  },
  {
    id: 5,
    name: "Majestic Terminal",
    area: "Majestic",
    mode: "Bus",
    routes: ["15", "43", "215", "500"],
    distanceToRoad: 95,
    operatingHours: "04:30–00:00",
    accessible: true,
  },
  {
    id: 6,
    name: "City Railway Station",
    area: "Majestic",
    mode: "Train",
    routes: ["Regional rail"],
    distanceToRoad: 240,
    operatingHours: "Station dependent",
    accessible: false,
  },
  {
    id: 7,
    name: "Trinity Metro Station",
    area: "Trinity",
    mode: "Metro",
    routes: ["Purple Line"],
    distanceToRoad: 140,
    operatingHours: "05:00–23:00",
    accessible: true,
  },
  {
    id: 8,
    name: "Shivajinagar Bus Stand",
    area: "Shivajinagar",
    mode: "Bus",
    routes: ["13", "25", "115"],
    distanceToRoad: 110,
    operatingHours: "05:00–22:30",
    accessible: false,
  },
];

const modeStyles: Record<TransportMode, string> = {
  Bus: "bg-blue-50 text-blue-700",
  Metro: "bg-violet-50 text-violet-700",
  Train: "bg-amber-50 text-amber-700",
};

function ModeIcon({ mode }: { mode: TransportMode }) {
  if (mode === "Metro") return <TramFront size={18} />;
  if (mode === "Train") return <TrainFront size={18} />;
  return <BusFront size={18} />;
}

export default function TransportPage() {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("All");
  const [accessFilter, setAccessFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [selectedStop, setSelectedStop] = useState<TransportStop | null>(
    null
  );

  const filteredStops = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoStops
      .filter((stop) => {
        const matchesSearch =
          !query ||
          stop.name.toLowerCase().includes(query) ||
          stop.area.toLowerCase().includes(query) ||
          stop.routes.some((route) =>
            route.toLowerCase().includes(query)
          );

        const matchesMode =
          modeFilter === "All" || stop.mode === modeFilter;

        const matchesAccess =
          accessFilter === "All" ||
          (accessFilter === "Accessible" && stop.accessible) ||
          (accessFilter === "Not accessible" && !stop.accessible);

        return matchesSearch && matchesMode && matchesAccess;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          return a.distanceToRoad - b.distanceToRoad;
        }

        if (sortBy === "mode") {
          return a.mode.localeCompare(b.mode);
        }

        return a.name.localeCompare(b.name);
      });
  }, [search, modeFilter, accessFilter, sortBy]);

  const busCount = demoStops.filter((stop) => stop.mode === "Bus").length;
  const metroCount = demoStops.filter((stop) => stop.mode === "Metro").length;
  const accessibleCount = demoStops.filter((stop) => stop.accessible).length;

  return (
    <div className="space-y-7 pb-10">
      <section>
        <p className="mb-2 text-sm font-medium text-[#648CC7]">
          PUBLIC TRANSPORT
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
          Transport stops
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B] sm:text-base">
          Explore transport access points and their connections to
          the surrounding road network.
        </p>
      </section>

      <div className="rounded-xl border border-[#D9E6F7] bg-[#EDF4FD] px-4 py-3">
        <p className="text-sm leading-6 text-[#526A89]">
          These are demonstration records for the interface. Stop details,
          routes, distances, and accessibility information have not yet
          been verified against the project database.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Bus stops",
            value: busCount,
            icon: BusFront,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Metro stations",
            value: metroCount,
            icon: TramFront,
            color: "bg-violet-50 text-violet-700",
          },
          {
            label: "Marked accessible",
            value: accessibleCount,
            icon: MapPin,
            color: "bg-emerald-50 text-emerald-700",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E1E7F0] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#64748B]">
                  {item.label}
                </p>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon size={20} />
                </div>
              </div>

              <p className="mt-3 text-3xl font-bold text-[#172033]">
                {item.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[#E1E7F0] bg-white shadow-sm">
        <div className="border-b border-[#E1E7F0] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#172033]">
                Stop directory
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                {filteredStops.length} of {demoStops.length} stops
              </p>
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stops, areas, routes..."
                className="min-h-11 w-full rounded-xl border border-[#D8E1ED] bg-white py-2 pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#83ACE5] focus:ring-2 focus:ring-[#EAF2FD]"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-[#526078]">
                Transport mode
              </span>

              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                className="min-h-10 w-full rounded-lg border border-[#D8E1ED] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#83ACE5]"
              >
                <option value="All">All modes</option>
                <option value="Bus">Bus</option>
                <option value="Metro">Metro</option>
                <option value="Train">Train</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-[#526078]">
                Accessibility
              </span>

              <select
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value)}
                className="min-h-10 w-full rounded-lg border border-[#D8E1ED] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#83ACE5]"
              >
                <option value="All">All stops</option>
                <option value="Accessible">Marked accessible</option>
                <option value="Not accessible">Not marked accessible</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-[#526078]">
                Sort by
              </span>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-h-10 w-full rounded-lg border border-[#D8E1ED] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#83ACE5]"
              >
                <option value="name">Stop name</option>
                <option value="distance">Road distance</option>
                <option value="mode">Transport mode</option>
              </select>
            </label>
          </div>
        </div>

        <div className="divide-y divide-[#EDF0F5]">
          {filteredStops.map((stop) => (
            <button
              key={stop.id}
              type="button"
              onClick={() => setSelectedStop(stop)}
              className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-[#F8FAFD] sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${modeStyles[stop.mode]}`}
                >
                  <ModeIcon mode={stop.mode} />
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-[#172033]">
                    {stop.name}
                  </h3>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[#718096]">
                    <MapPin size={14} />
                    {stop.area}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {stop.routes.map((route) => (
                      <span
                        key={route}
                        className="rounded-md bg-[#F1F5F9] px-2 py-1 text-xs text-[#526078]"
                      >
                        {route}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-[#344054]">
                    {stop.distanceToRoad} m
                  </p>

                  <p className="mt-1 text-xs text-[#8794A7]">
                    From road segment
                  </p>
                </div>

                <ArrowDownUp
                  size={16}
                  className="rotate-90 text-[#98A2B3]"
                />
              </div>
            </button>
          ))}

          {filteredStops.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Search
                size={26}
                className="mx-auto text-[#98A2B3]"
              />

              <p className="mt-3 font-semibold text-[#344054]">
                No matching stops
              </p>

              <p className="mt-1 text-sm text-[#718096]">
                Try another search term or change the filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setModeFilter("All");
                  setAccessFilter("All");
                  setSortBy("name");
                }}
                className="mt-4 text-sm font-semibold text-[#5079B4] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {selectedStop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/45 p-4"
          onClick={() => setSelectedStop(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="stop-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${modeStyles[selectedStop.mode]}`}
                >
                  <ModeIcon mode={selectedStop.mode} />
                  {selectedStop.mode}
                </span>

                <h2
                  id="stop-dialog-title"
                  className="mt-3 text-xl font-bold text-[#172033]"
                >
                  {selectedStop.name}
                </h2>

                <p className="mt-1 text-sm text-[#718096]">
                  {selectedStop.area}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close stop details"
                onClick={() => setSelectedStop(null)}
                className="rounded-lg p-2 text-[#718096] hover:bg-[#F1F5F9]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F5F7FB] p-4">
                <p className="text-xs font-medium text-[#718096]">
                  Distance to road
                </p>

                <p className="mt-1 text-lg font-bold text-[#172033]">
                  {selectedStop.distanceToRoad} m
                </p>
              </div>

              <div className="rounded-xl bg-[#F5F7FB] p-4">
                <p className="text-xs font-medium text-[#718096]">
                  Accessibility
                </p>

                <p className="mt-1 text-lg font-bold text-[#172033]">
                  {selectedStop.accessible
                    ? "Marked accessible"
                    : "Not marked accessible"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#344054]">
                Routes served
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedStop.routes.map((route) => (
                  <span
                    key={route}
                    className="rounded-lg border border-[#E1E7F0] px-3 py-1.5 text-sm text-[#526078]"
                  >
                    {route}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 text-sm text-[#64748B]">
              <Clock size={17} className="mt-0.5 shrink-0" />

              <div>
                <p className="font-medium text-[#344054]">
                  Listed operating hours
                </p>

                <p className="mt-1">{selectedStop.operatingHours}</p>
              </div>
            </div>

            <p className="mt-5 rounded-lg bg-[#EDF4FD] p-3 text-xs leading-5 text-[#526A89]">
              Demonstration record. Verify these details before using them
              for actual travel planning.
            </p>

            <button
              type="button"
              onClick={() => setSelectedStop(null)}
              className="mt-5 min-h-11 w-full rounded-xl bg-[#172033] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#293750]"
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
