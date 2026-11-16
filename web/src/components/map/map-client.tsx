
"use client";

import dynamic from "next/dynamic";

const AvenzaMap = dynamic(() => import("./avenza-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-2xl border border-[#E1E7F0] bg-[#F5F7FB] text-sm text-[#64748B]">
      Loading interactive map...
    </div>
  ),
});

export default function MapClient({
  compact = false,
  showFilters = true,
  routeView = false,
}: {
  compact?: boolean;
  showFilters?: boolean;
  routeView?: boolean;
}) {
  return <AvenzaMap compact={compact} showFilters={showFilters} routeView={routeView} />;
}
