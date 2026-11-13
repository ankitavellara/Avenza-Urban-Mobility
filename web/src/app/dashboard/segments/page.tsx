"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, ArrowUpDown } from "lucide-react";

type Segment = {
  id: number;
  road: string;
  length: number;
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
  lighting: number | null;
  condition: number | null;
  accessibility: number | null;
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [search, setSearch] = useState("");
  const [minLighting, setMinLighting] = useState("0");
  const [condition, setCondition] = useState("All");
  const [sort, setSort] = useState("road");
  const [selected, setSelected] = useState<Segment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/segments")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load road segments");
        return res.json();
      })
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Could not load road segments");
        setSegments(data.segments);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return segments
      .filter((s) => {
        const matchesSearch = s.road.toLowerCase().includes(q);
        const matchesLighting = minLighting === "0" || (s.lighting !== null && s.lighting >= Number(minLighting));
        const matchesCondition =
          condition === "All" ||
          (condition === "Good" && s.condition !== null && s.condition >= 4) ||
          (condition === "Needs attention" && s.condition !== null && s.condition <= 3);
        return matchesSearch && matchesLighting && matchesCondition;
      })
      .sort((a, b) => {
        if (sort === "lighting") return (b.lighting ?? 0) - (a.lighting ?? 0);
        if (sort === "condition") return (b.condition ?? 0) - (a.condition ?? 0);
        if (sort === "length") return Number(b.length) - Number(a.length);
        return a.road.localeCompare(b.road);
      });
  }, [segments, search, minLighting, condition, sort]);

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-[#668EC6]">INFRASTRUCTURE MANAGEMENT</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Road segments</h2>
        <p className="mt-2 text-base text-[#58677D]">Live road conditions, street lighting, and pedestrian accessibility ratings.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Matching segments" value={String(filtered.length)} />
        <Summary label="Good road condition" value={String(filtered.filter((s) => s.condition !== null && s.condition >= 4).length)} />
        <Summary label="Low lighting" value={String(filtered.filter((s) => s.lighting !== null && s.lighting <= 2).length)} />
      </div>

      <section className="rounded-2xl border border-[#E1E7F0] bg-white p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9AB1]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search road name..." className={`${inputClass} pl-11`} />
          </div>
          <select value={minLighting} onChange={(e) => setMinLighting(e.target.value)} className={inputClass}>
            <option value="0">All lighting ratings</option><option value="2">Lighting ≥ 2</option><option value="3">Lighting ≥ 3</option><option value="4">Lighting ≥ 4</option><option value="5">Lighting = 5</option>
          </select>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
            <option value="All">All road conditions</option><option value="Good">Good (4–5)</option><option value="Needs attention">Needs attention (1–3)</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#58677D]">{loading ? "Loading segments from MySQL..." : `Showing ${filtered.length} of ${segments.length} database segments`}</p>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <ArrowUpDown size={16} className="text-[#668EC6]" /> Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#D6DFEC] bg-white px-3 py-2">
              <option value="road">Road name</option><option value="lighting">Lighting</option><option value="condition">Road condition</option><option value="length">Length</option>
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-[#F8FAFD] text-xs uppercase tracking-wider text-[#58677D]">
              <tr><th className="px-6 py-4">Road segment</th><th className="px-6 py-4">Length</th><th className="px-6 py-4">Lighting</th><th className="px-6 py-4">Condition</th><th className="px-6 py-4">Accessibility</th><th className="px-6 py-4">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E1E7F0]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFD]">
                  <td className="px-6 py-5"><p className="font-bold">{s.road}</p><p className="mt-1 text-sm text-[#58677D]">Segment ID: {s.id}</p></td>
                  <td className="px-6 py-5 text-sm">{s.length} m</td>
                  <td className="px-6 py-5"><Rating value={s.lighting} /></td>
                  <td className="px-6 py-5"><Rating value={s.condition} /></td>
                  <td className="px-6 py-5"><Rating value={s.accessibility} /></td>
                  <td className="px-6 py-5"><button onClick={() => setSelected(s)} className="font-bold text-[#496FA8] hover:underline">View</button></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-[#58677D]">No segments match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-[#8A9AB1]">LIVE DATABASE DATA · RATINGS MAY BE UNRECORDED</p>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/40 p-4" onClick={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><p className="text-sm font-semibold text-[#668EC6]">SEGMENT DETAILS</p><h3 className="mt-2 text-2xl font-extrabold">{selected.road}</h3><p className="mt-1 text-sm text-[#58677D]">Segment ID: {selected.id}</p></div>
              <button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 hover:bg-[#F5F7FB]"><X size={21} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <Detail label="Length" value={`${selected.length} metres`} />
              <Detail label="Lighting" value={ratingText(selected.lighting)} />
              <Detail label="Road condition" value={ratingText(selected.condition)} />
              <Detail label="Accessibility" value={ratingText(selected.accessibility)} />
              <Detail label="Start coordinates" value={`${selected.startLat ?? "—"}, ${selected.startLon ?? "—"}`} />
              <Detail label="End coordinates" value={`${selected.endLat ?? "—"}, ${selected.endLon ?? "—"}`} />
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

function Rating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-[#8A9AB1]">Not rated</span>;
  return <span className="inline-flex items-center gap-2"><span className="h-2 w-16 overflow-hidden rounded-full bg-[#E7ECF3]"><span className="block h-full rounded-full bg-[#83ACE5]" style={{ width: `${(value / 5) * 100}%` }} /></span><span className="text-sm font-bold">{value}/5</span></span>;
}

function ratingText(value: number | null) {
  return value === null ? "Not rated" : `${value}/5`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-[#E1E7F0] pb-3"><span className="text-sm text-[#58677D]">{label}</span><span className="text-right text-sm font-bold">{value}</span></div>;
}
