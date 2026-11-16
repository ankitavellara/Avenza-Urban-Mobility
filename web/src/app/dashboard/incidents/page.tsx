
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileWarning,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

type IncidentType = "THEFT" | "HARASSMENT" | "ACCIDENT" | "OTHER";
type Severity = "LOW" | "MEDIUM" | "HIGH";
type Incident = {
  id: number;
  segmentId: number;
  type: IncidentType;
  severity: Severity;
  description: string;
  road: string;
  occurredAt: string;
  reportedAt: string;
  reportedBy: number | null;
  verifiedBy: number | null;
};

const typeLabels: Record<IncidentType, string> = {
  THEFT: "Theft",
  HARASSMENT: "Harassment",
  ACCIDENT: "Accident",
  OTHER: "Other",
};

const severityStyles: Record<Severity, string> = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${severityStyles[severity]}`}
    >
      {severity.charAt(0) + severity.slice(1).toLowerCase()}
    </span>
  );
}

function RecordedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
    >
      <CheckCircle2 size={13} />
      Recorded
    </span>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [segments, setSegments] = useState<{ id: number; road: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    type: "OTHER" as IncidentType,
    severity: "MEDIUM" as Severity,
    description: "",
    segmentId: "",
    occurredAt: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [incidentResponse, segmentResponse, sessionResponse] = await Promise.all([
          fetch("/api/incidents"),
          fetch("/api/segments"),
          fetch("/api/auth/session"),
        ]);

        const incidentData = await incidentResponse.json();
        const segmentData = await segmentResponse.json();

        if (!incidentResponse.ok || !incidentData.success) {
          throw new Error(incidentData.error || "Could not load incidents.");
        }

        if (!segmentResponse.ok || !segmentData.success) {
          throw new Error(segmentData.error || "Could not load road segments.");
        }

        setSegments(segmentData.segments ?? []);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setIsAdmin(sessionData.user?.role === "ADMIN");
        }

        setIncidents((incidentData.incidents ?? []).map((item: any) => ({
          id: Number(item.id),
          type: item.type as IncidentType,
          severity: item.severity as Severity,
          description: String(item.description ?? ""),
          road: item.road || `Segment ${item.segmentId}`,
          occurredAt: item.occurredAt,
          reportedAt: item.reportedAt,
          segmentId: Number(item.segmentId),
          reportedBy: item.reportedBy == null ? null : Number(item.reportedBy),
          verifiedBy: item.verifiedBy == null ? null : Number(item.verifiedBy),
        })));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load incidents.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);
  const stats = useMemo(
    () => ({
      total: incidents.length,
      high: incidents.filter((item) => item.severity === "HIGH").length,
      medium: incidents.filter((item) => item.severity === "MEDIUM").length,
      low: incidents.filter((item) => item.severity === "LOW").length,
    }),
    [incidents],
  );

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents
      .filter((incident) => {
        const matchesSearch =
          !query ||
          [
            incident.road,
            incident.id.toString(),
            incident.segmentId.toString(),
            typeLabels[incident.type],
          ].some((value) => value.toLowerCase().includes(query));

        const matchesSeverity =
          severityFilter === "ALL" ||
          incident.severity === severityFilter;

        const matchesType =
          typeFilter === "ALL" || incident.type === typeFilter;

        return matchesSearch && matchesSeverity && matchesType;
      })
      .sort((a, b) => {
        const difference =
          new Date(b.reportedAt).getTime() -
          new Date(a.reportedAt).getTime();

        return sortNewest ? difference : -difference;
      });
  }, [
    incidents,
    search,
    severityFilter,
    typeFilter,
    sortNewest,
  ]);

  function resetFilters() {
    setSearch("");
    setSeverityFilter("ALL");
    setTypeFilter("ALL");
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.segmentId || !form.occurredAt || form.description.trim().length < 10) {
      setFormError("Choose a road segment, enter when it happened, and describe it in at least 10 characters.");
      return;
    }

    const occurredDate = new Date(form.occurredAt);

    if (Number.isNaN(occurredDate.getTime())) {
      setFormError("Please enter a valid occurrence date and time.");
      return;
    }

    if (occurredDate.getTime() > Date.now()) {
      setFormError("The occurrence time cannot be in the future.");
      return;
    }

    const selectedSegment = segments.find(
      (segment) => segment.id === Number(form.segmentId),
    );

    if (!selectedSegment) {
      setFormError("Please select a road segment from the list.");
      return;
    }

    setIsSaving(true);
    let savedIncident: any;

    try {
      const response = await fetch(
        editingIncident ? `/api/incidents/${editingIncident.id}` : "/api/incidents",
        {
        method: editingIncident ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId: selectedSegment.id,
          type: form.type,
          severity: form.severity,
          description: form.description.trim(),
          occurredAt: form.occurredAt,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not save the incident.");
      }

      savedIncident = result.incident;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the incident.");
      setIsSaving(false);
      return;
    }

    const saved: Incident = {
      id: Number(savedIncident.id),
      segmentId: Number(savedIncident.segmentId),
      type: savedIncident.type as IncidentType,
      severity: savedIncident.severity as Severity,
      description: String(savedIncident.description ?? ""),
      road: savedIncident.road || selectedSegment.road,
      occurredAt: savedIncident.occurredAt,
      reportedAt: savedIncident.reportedAt,
      reportedBy: savedIncident.reportedBy == null ? null : Number(savedIncident.reportedBy),
      verifiedBy: savedIncident.verifiedBy == null ? null : Number(savedIncident.verifiedBy),
    };

    if (editingIncident) {
      setIncidents((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setNotice(`Incident #${saved.id} updated in MySQL.`);
    } else {
      setIncidents((previous) => [saved, ...previous]);
      setSearch("");
      setSeverityFilter("ALL");
      setTypeFilter("ALL");
      setSortNewest(true);
      setNotice(`Incident #${saved.id} saved to MySQL.`);
    }
    setIsSaving(false);
    setShowReportForm(false);
    setEditingIncident(null);
    setForm({
      type: "OTHER",
      severity: "MEDIUM",
      description: "",
      segmentId: "",
      occurredAt: "",
    });
    setTimeout(() => setNotice(""), 4000);
  }

  function closeReportForm() {
    setShowReportForm(false);
    setEditingIncident(null);
    setFormError("");
  }

  function startEditing(incident: Incident) {
    setForm({
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      segmentId: String(incident.segmentId),
      occurredAt: toDateTimeLocal(incident.occurredAt),
    });
    setEditingIncident(incident);
    setFormError("");
    setSelectedIncident(null);
    setShowReportForm(true);
  }

  async function deleteIncident() {
    if (!incidentToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/incidents/${incidentToDelete.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not delete incident.");
      setIncidents((previous) => previous.filter((item) => item.id !== incidentToDelete.id));
      setIncidentToDelete(null);
      setSelectedIncident(null);
      setNotice(`Incident #${incidentToDelete.id} deleted from MySQL.`);
      setTimeout(() => setNotice(""), 4000);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete incident.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-7 pb-10">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#64748B]">
            <ShieldCheck size={16} className="text-[#648CC7]" />
            Safety monitoring
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#172033] sm:text-4xl">
            Safety incidents
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B] sm:text-base">
            Report incidents with their intensity and description, then review community reports.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingIncident(null);
            setForm({ type: "OTHER", severity: "MEDIUM", description: "", segmentId: "", occurredAt: "" });
            setFormError("");
            setShowReportForm(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#293750]"
        >
          <Plus size={18} />
          Report an incident
        </button>
      </section>

      {/* Data source notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[#D9E6F7] bg-[#EDF4FD] px-4 py-3">
        <AlertTriangle
          size={19}
          className="mt-0.5 shrink-0 text-[#5079B4]"
        />
        <div>
          <p className="text-sm font-semibold text-[#294B78]">
            MySQL incident records
          </p>
          <p className="mt-0.5 text-sm leading-5 text-[#526A89]">
            Signed-in users can submit detailed reports to MySQL. New reports are linked to the reporter account and await administrator verification.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total incidents"
          value={stats.total}
          description="Loaded from MySQL"
          icon={<FileWarning size={20} />}
          iconClass="bg-[#EAF2FD] text-[#4B76B7]"
        />
        <StatCard
          label="High intensity"
          value={stats.high}
          description="Reports marked high"
          icon={<AlertTriangle size={20} />}
          iconClass="bg-rose-50 text-rose-600"
        />
        <StatCard
          label="Moderate intensity"
          value={stats.medium}
          description="Stored medium-severity reports"
          icon={<AlertTriangle size={20} />}
          iconClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Low intensity"
          value={stats.low}
          description="Stored low-severity reports"
          icon={<ShieldCheck size={20} />}
          iconClass="bg-emerald-50 text-emerald-600"
        />
      </section>

      {loadError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </p>
      )}

      {/* Incidents table */}
      <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white shadow-sm">
        <div className="border-b border-[#E8EDF4] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#172033]">
                Incident reports
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Browse and filter community-submitted reports.
              </p>
            </div>

            <span className="w-fit rounded-full bg-[#F1F5FA] px-3 py-1.5 text-xs font-semibold text-[#526178]">
              {loading ? "Loading..." : `${filteredIncidents.length} of ${incidents.length} reports`}
            </span>
          </div>

          {/* Search */}
          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8794A7]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search road, segment ID, type, or report ID..."
                className="h-11 w-full rounded-xl border border-[#DCE3ED] bg-white pl-10 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#83ACE5] focus:ring-2 focus:ring-[#A5C5F0]/40"
              />
            </div>

            <button
              onClick={() => setSortNewest((previous) => !previous)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DCE3ED] px-4 text-sm font-semibold text-[#526178] transition hover:bg-[#F5F7FB]"
            >
              <ArrowDownUp size={16} />
              {sortNewest ? "Newest first" : "Oldest first"}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Intensity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                ["ALL", "All intensities"],
                ["HIGH", "High"],
                ["MEDIUM", "Moderate"],
                ["LOW", "Low"],
              ]}
            />

            <FilterSelect
              label="Incident type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                ["ALL", "All incident types"],
                ["HARASSMENT", "Harassment"],
                ["THEFT", "Theft"],
                ["ACCIDENT", "Accident"],
                ["OTHER", "Other"],
              ]}
            />

          </div>

          {(search || severityFilter !== "ALL" || typeFilter !== "ALL") && (
            <button
              onClick={resetFilters}
              className="mt-3 text-sm font-semibold text-[#5079B4] hover:text-[#294B78]"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-[#F8FAFD]">
              <tr className="border-b border-[#E8EDF4] text-xs font-bold uppercase tracking-wider text-[#7B8798]">
                <th className="px-6 py-4">Incident</th>
                <th className="px-4 py-4">Intensity</th>
                <th className="px-4 py-4">Reported</th>
                <th className="px-4 py-4">Database</th>
                <th className="px-6 py-4 text-right">{isAdmin ? "Actions" : "Details"}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1F6]">
              {filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="transition hover:bg-[#FAFBFE]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F4FA] text-[#5D7394]">
                        <AlertTriangle size={19} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#172033]">
                          {typeLabels[incident.type]}
                        </p>
                        <p className="mt-0.5 text-xs text-[#718096]">
                          #{incident.id}
                        </p>
                        <p className="mt-2 flex items-start gap-1.5 text-sm text-[#526178]">
                          <MapPin
                            size={14}
                            className="mt-0.5 shrink-0 text-[#8492A6]"
                          />
                          <span>
                            {incident.road}
                            <span className="block text-xs text-[#8794A7]">
                              Segment #{incident.segmentId}
                            </span>
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <SeverityBadge severity={incident.severity} />
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-[#344054]">
                      {formatShortDate(incident.reportedAt)}
                    </p>
                    <p className="mt-1 text-xs text-[#8794A7]">
                      {new Date(incident.reportedAt).toLocaleTimeString(
                        "en-IN",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <RecordedBadge />
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelectedIncident(incident)} aria-label={`View incident ${incident.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DCE3ED] px-3 text-sm font-semibold text-[#526178] hover:bg-[#F0F5FD]">
                        <Eye size={15} /> View
                      </button>
                      {isAdmin && <>
                        <button onClick={() => startEditing(incident)} aria-label={`Edit incident ${incident.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DCE3ED] px-3 text-sm font-semibold text-[#526178] hover:bg-[#F0F5FD]">
                          <Pencil size={15} /> Edit
                        </button>
                        <button onClick={() => { setIncidentToDelete(incident); setDeleteError(""); }} aria-label={`Delete incident ${incident.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                          <Trash2 size={15} /> Delete
                        </button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-[#E8EDF4] md:hidden">
          {filteredIncidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className="w-full p-4 text-left transition hover:bg-[#F8FAFD]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F4FA] text-[#5D7394]">
                    <AlertTriangle size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#172033]">
                      {typeLabels[incident.type]}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8794A7]">
                      #{incident.id}
                    </p>
                    <p className="mt-2 text-sm text-[#526178]">
                      {incident.road}
                    </p>
                    <p className="mt-1 text-xs text-[#8794A7]">
                      {formatShortDate(incident.reportedAt)}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={17}
                  className="mt-1 shrink-0 text-[#8794A7]"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SeverityBadge severity={incident.severity} />
                <RecordedBadge />
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredIncidents.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F4FA] text-[#7B8CA6]">
              <Filter size={24} />
            </div>
            <h3 className="mt-4 font-bold text-[#172033]">
              No incidents found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#718096]">
              Try a different search term or clear your filters to see more
              reports.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-[#5079B4] hover:bg-[#F0F5FD]"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-[#E8EDF4] bg-[#FBFCFE] px-5 py-4 text-xs text-[#8794A7] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {filteredIncidents.length} incident
            {filteredIncidents.length === 1 ? "" : "s"}
          </span>
          <span>Incident records loaded from MySQL</span>
        </div>
      </section>

      {/* Report form modal */}
      {showReportForm && (
        <Modal onClose={closeReportForm} title={editingIncident ? `Edit incident #${editingIncident.id}` : "Report an incident"}>
          <form onSubmit={submitReport} className="space-y-5">
            <p className="text-sm leading-6 text-[#64748B]">
              Describe what happened, select its intensity, and link it to the affected road segment.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Incident type">
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as IncidentType,
                    })
                  }
                  className={fieldClass}
                >
                  <option value="THEFT">Theft</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="ACCIDENT">Accident</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Intensity">
                <select
                  value={form.severity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      severity: event.target.value as Severity,
                    })
                  }
                  className={fieldClass}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Moderate</option>
                  <option value="HIGH">High</option>
                </select>
              </FormField>
            </div>

            <FormField label="What happened?">
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className={`${fieldClass} min-h-28 resize-y`}
                placeholder="Briefly describe the incident and any relevant details. Avoid including private personal information."
                minLength={10}
                maxLength={2000}
                required
              />
              <p className="mt-1 text-right text-xs text-[#8794A7]">{form.description.length}/2000</p>
            </FormField>

            <FormField label="Road segment">
              <select
                value={form.segmentId}
                onChange={(event) => setForm({ ...form, segmentId: event.target.value })}
                className={fieldClass}
                required
              >
                <option value="">Select a road segment</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.road} · Segment #{segment.id}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="When did it occur?">
              <input
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) =>
                  setForm({ ...form, occurredAt: event.target.value })
                }
                max={new Date().toISOString().slice(0, 16)}
                className={fieldClass}
                required
              />
            </FormField>

            {formError && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
              >
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-[#E8EDF4] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReportForm}
                className="rounded-xl border border-[#DCE3ED] px-5 py-3 text-sm font-semibold text-[#526178] hover:bg-[#F5F7FB]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold text-white hover:bg-[#293750] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingIncident ? <Pencil size={17} /> : <Plus size={17} />}
                {isSaving ? "Saving..." : editingIncident ? "Save changes" : "Submit report"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Incident detail modal */}
      {selectedIncident && (
        <Modal
          onClose={() => setSelectedIncident(null)}
          title={`Incident #${selectedIncident.id}`}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#EEF3FA] px-3 py-1 text-xs font-bold text-[#526178]">
                {typeLabels[selectedIncident.type]}
              </span>
              <SeverityBadge severity={selectedIncident.severity} />
              <RecordedBadge />
            </div>

            <div className="rounded-xl border border-[#E1E7F0] bg-[#F8FAFD] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
                <MapPin size={17} className="text-[#648CC7]" />
                Location
              </p>
              <p className="mt-2 font-bold text-[#172033]">
                {selectedIncident.road}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                Road segment #{selectedIncident.segmentId}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8794A7]">
                  Occurred at
                </p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-[#344054]">
                  {formatDate(selectedIncident.occurredAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8794A7]">
                  Reported at
                </p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-[#344054]">
                  {formatDate(selectedIncident.reportedAt)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E1E7F0] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8794A7]">Incident description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526178]">
                {selectedIncident.description || "No description was added to this legacy record."}
              </p>
            </div>

            <div className="rounded-xl border border-[#E1E7F0] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8794A7]">Report status</p>
              <p className="mt-2 text-sm leading-6 text-[#526178]">
                {selectedIncident.reportedBy ? `Reported by user #${selectedIncident.reportedBy}.` : "Legacy report with no reporter recorded."}{" "}
                {selectedIncident.verifiedBy ? `Verified by user #${selectedIncident.verifiedBy}.` : "No verification has been recorded."}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E8EDF4] pt-4 sm:flex-row sm:justify-between">
              <button
                onClick={() => setSelectedIncident(null)}
                className="rounded-xl border border-[#DCE3ED] px-5 py-3 text-sm font-semibold text-[#526178] hover:bg-[#F5F7FB]"
              >
                Close
              </button>
              {isAdmin && <div className="flex gap-2">
                <button onClick={() => startEditing(selectedIncident)} className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3ED] px-4 py-3 text-sm font-semibold text-[#526178] hover:bg-[#F5F7FB]"><Pencil size={15} /> Edit</button>
                <button onClick={() => { setIncidentToDelete(selectedIncident); setDeleteError(""); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={15} /> Delete</button>
              </div>}
            </div>

          </div>
        </Modal>
      )}

      {incidentToDelete && (
        <Modal onClose={() => !isDeleting && setIncidentToDelete(null)} title="Delete incident?">
          <div className="space-y-5">
            <p className="text-sm leading-6 text-[#526178]">
              This permanently deletes incident #{incidentToDelete.id} ({typeLabels[incidentToDelete.type]}) on {incidentToDelete.road} from MySQL. This action cannot be undone.
            </p>
            {deleteError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{deleteError}</p>}
            <div className="flex justify-end gap-3 border-t border-[#E8EDF4] pt-4">
              <button disabled={isDeleting} onClick={() => setIncidentToDelete(null)} className="rounded-xl border border-[#DCE3ED] px-5 py-3 text-sm font-semibold text-[#526178] hover:bg-[#F5F7FB]">Cancel</button>
              <button disabled={isDeleting} onClick={deleteIncident} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"><Trash2 size={16} />{isDeleting ? "Deleting..." : "Delete incident"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success notification */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-xl"
        >
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-600"
          />
          <p className="text-sm font-medium leading-6 text-[#344054]">
            {notice}
          </p>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="text-[#8794A7] hover:text-[#344054]"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[#DCE3ED] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#83ACE5] focus:ring-2 focus:ring-[#A5C5F0]/40";

function StatCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E1E7F0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#172033]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-[#8794A7]">{description}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold text-[#64748B]">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-[#DCE3ED] bg-white px-3 text-sm text-[#344054] outline-none focus:border-[#83ACE5] focus:ring-2 focus:ring-[#A5C5F0]/40"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#344054]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#101828]/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8EDF4] bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8794A7]">
              Avenza safety
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#172033]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F0F3F8] hover:text-[#172033]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}


