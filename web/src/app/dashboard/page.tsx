
import Link from "next/link";
import {
  ArrowRight,
  BusFront,
  Map,
  MapPin,
  ShieldAlert,
  Signpost,
} from "lucide-react";
import MapClient from "@/components/map/map-client";

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

export default function DashboardPage() {
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
    </div>
  );
}
