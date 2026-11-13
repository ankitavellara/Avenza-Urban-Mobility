
import { Suspense } from "react";
import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  BusFront,
  Map,
  MapPin,
  ShieldAlert,
  Signpost,
} from "lucide-react";

import MapClient from "@/components/map/map-client";
import pool from "@/lib/db";

const sections = [
  {
    title: "Routes",
    description:
      "Browse routes and compare the journey options available in Avenza.",
    href: "/dashboard/routes",
    icon: Map,
  },
  {
    title: "Road infrastructure",
    description:
      "Explore road segments, lighting, surface conditions, and accessibility.",
    href: "/dashboard/segments",
    icon: Signpost,
  },
  {
    title: "Safety incidents",
    description:
      "Review reported incidents and examine their details.",
    href: "/dashboard/incidents",
    icon: ShieldAlert,
  },
  {
    title: "Transport stops",
    description:
      "Explore public transport stops and their connections to road segments.",
    href: "/dashboard/transport",
    icon: BusFront,
  },
];

async function getDashboardStats() {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM routes) AS routes,
        (SELECT COUNT(*) FROM road_segments) AS roadSegments,
        (SELECT COUNT(*) FROM incidents) AS incidents,
        (SELECT COUNT(*) FROM transport_stops) AS transportStops
    `);

    return (
      rows as {
        routes: number;
        roadSegments: number;
        incidents: number;
        transportStops: number;
      }[]
    )[0];
  } catch (error) {
    console.error("Dashboard stats query failed:", error);
    return null;
  }
}

async function DashboardContent() {
  const stats = await getDashboardStats();

  const metrics = [
    {
      label: "Registered routes",
      value: stats ? String(stats.routes) : "—",
      note: "Predefined walking routes",
      icon: Map,
    },
    {
      label: "Road segments",
      value: stats ? String(stats.roadSegments) : "—",
      note: "Tracked road infrastructure",
      icon: Signpost,
    },
    {
      label: "Safety incidents",
      value: stats ? String(stats.incidents) : "—",
      note: "Reported incidents",
      icon: ShieldAlert,
    },
    {
      label: "Transport stops",
      value: stats ? String(stats.transportStops) : "—",
      note: "Nearby mobility connections",
      icon: BusFront,
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#648CC7]">
            URBAN MOBILITY
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
            Explore Avenza
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B] sm:text-base">
            Explore routes through the city with road infrastructure,
            public transport access, and pedestrian safety information
            in one place.
          </p>
        </div>

        <Link
          href="/dashboard/map"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold !text-white transition hover:bg-[#293750]"
        >
          <MapPin size={17} />
          <span className="!text-white">Explore map</span>
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#172033]">
              Map
            </h2>

            <p className="mt-1 text-sm text-[#64748B]">
              Explore the map and inspect the locations shown.
            </p>
          </div>

          <Link
            href="/dashboard/map"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#D8E1ED] px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#F5F7FB] sm:self-auto"
          >
            Open full map
            <ArrowRight size={16} />
          </Link>
        </div>

        <MapClient compact showFilters={false} />

        <p className="mt-3 text-xs leading-5 text-[#8794A7]">
          Map locations are illustrative examples.
        </p>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#172033] sm:text-2xl">
              Database overview
            </h2>

            <p className="mt-1 text-sm text-[#58677D]">
              Key resources tracked by Avenza.
            </p>
          </div>

          <span className="rounded-lg border border-[#E1E7F0] bg-white px-3 py-2 text-xs font-semibold text-[#58677D]">
            {stats ? "Live database counts" : "Database unavailable"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-[#E1E7F0] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#64748B]">
                    {metric.label}
                  </p>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#5079B4]">
                    <Icon size={20} />
                  </div>
                </div>

                <p className="mt-3 text-3xl font-bold text-[#172033]">
                  {metric.value}
                </p>

                <p className="mt-1 text-xs text-[#8794A7]">
                  {metric.note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#172033]">
            Explore the platform
          </h2>

          <p className="mt-1 text-sm text-[#64748B]">
            Choose the information you want to explore.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Link
                key={section.title}
                href={section.href}
                className="group flex items-start gap-4 rounded-2xl border border-[#E1E7F0] bg-white p-5 transition hover:border-[#C6D8F1] hover:shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FD] text-[#5079B4]">
                  <Icon size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#172033]">
                    {section.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#718096]">
                    {section.description}
                  </p>
                </div>

                <ArrowRight
                  size={17}
                  className="mt-1 shrink-0 text-[#98A2B3] transition group-hover:translate-x-1 group-hover:text-[#5079B4]"
                />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#E1E7F0] bg-white p-6 sm:p-7 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#172033]">
                Explore the database
              </h2>

              <p className="mt-1 text-sm text-[#58677D]">
                Jump into the data behind each part of Avenza.
              </p>
            </div>

            <div className="rounded-xl bg-[#EAF2FD] p-3 text-[#496FA8]">
              <MapPin size={22} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sections.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-xl border border-[#E1E7F0] p-4 transition hover:border-[#A5C5F0] hover:bg-[#F8FAFD]"
                >
                  <div className="flex items-center justify-between">
                    <Icon size={21} className="text-[#668EC6]" />

                    <ArrowRight
                      size={18}
                      className="text-[#8A9AB1] transition group-hover:text-[#294C7C]"
                    />
                  </div>

                  <h3 className="mt-4 font-bold text-[#172033]">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#58677D]">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E1E7F0] bg-white p-6 sm:p-7">
          <h2 className="text-xl font-bold text-[#172033]">
            Data quality checklist
          </h2>

          <p className="mt-1 text-sm leading-6 text-[#58677D]">
            Important checks for a reliable mobility database.
          </p>

          <div className="mt-6 space-y-5">
            <ChecklistItem
              title="Infrastructure ratings"
              description="Check lighting, road condition, and accessibility."
            />

            <ChecklistItem
              title="Incident integrity"
              description="Verify incident timestamps and severity values."
            />

            <ChecklistItem
              title="Transport connections"
              description="Check stop distances and segment associations."
            />

            <ChecklistItem
              title="Pedestrian observations"
              description="Validate density levels and observation timestamps."
            />
          </div>

          <div className="mt-6 rounded-xl bg-[#EDF3FB] p-4">
            <p className="text-sm font-bold text-[#294C7C]">
              Next step
            </p>

            <p className="mt-1 text-sm leading-6 text-[#42536D]">
              Review the database quality checks and verify the underlying
              mobility data.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E1E7F0] bg-white p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#172033]">
              Recent activity
            </h2>

            <p className="mt-1 text-sm text-[#58677D]">
              Database activity will appear here once activity tracking is
              implemented.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#F1F4F8] px-3 py-1.5 text-xs font-semibold text-[#58677D]">
            <span className="h-2 w-2 rounded-full bg-[#9AA9BC]" />
            No live activity yet
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-[#D6DFEC] px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF2FD] text-[#496FA8]">
            <ShieldAlert size={23} />
          </div>

          <h3 className="mt-4 font-bold text-[#172033]">
            Activity feed not connected
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#58677D]">
            Once activity tracking is implemented, this section can display
            incident reports, infrastructure changes, and other database
            activity.
          </p>
        </div>
      </section>

      <p className="text-center text-xs text-[#8A9AB1]">
        AVENZA · URBAN MOBILITY & PEDESTRIAN SAFETY
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="h-40 animate-pulse rounded-3xl bg-[#E1E7F0]" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl bg-[#E1E7F0]"
              />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function ChecklistItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2FD] text-[#496FA8]">
        <ArrowDownRight size={15} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-[#172033]">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-[#58677D]">
          {description}
        </p>
      </div>
    </div>
  );
}
