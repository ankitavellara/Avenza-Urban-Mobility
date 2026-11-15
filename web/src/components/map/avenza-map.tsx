
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";

type MapCategory = "incident" | "transport" | "road";

type MapLocation = {
  id: string;
  name: string;
  description: string;
  category: MapCategory;
  position: [number, number];
  path?: [[number, number], [number, number]];
  severity?: "High" | "Medium" | "Low";
};

type AvenzaMapProps = {
  compact?: boolean;
  showFilters?: boolean;
};

type MapDataResponse = {
  success: boolean;
  error?: string;
  roads: Array<{
    id: number;
    name: string;
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
    lengthM: number;
  }>;
  stops: Array<{
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
  }>;
  incidents: Array<{
    id: number;
    type: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    occurredAt: string;
    segmentId: number;
    road: string;
    latitude: number;
    longitude: number;
  }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]!,
  );
}

const categoryColors: Record<MapCategory, string> = {
  incident: "#D9485F",
  transport: "#477AC0",
  road: "#24836B",
};

export default function AvenzaMap({
  compact = false,
  showFilters = true,
}: AvenzaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [showIncidents, setShowIncidents] = useState(true);
  const [showTransport, setShowTransport] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [target, setTarget] = useState<{
    position: [number, number];
    zoom: number;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMapData() {
      try {
        const response = await fetch("/api/map-data");
        const data = (await response.json()) as MapDataResponse;
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Could not load map data from MySQL.");
        }

        const mapLocations: MapLocation[] = [
          ...data.roads.map((road) => ({
            id: `road-${road.id}`,
            name: road.name,
            description: `Road segment #${road.id} · ${road.lengthM} m`,
            category: "road" as const,
            position: [(road.startLat + road.endLat) / 2, (road.startLon + road.endLon) / 2] as [number, number],
            path: [[road.startLat, road.startLon], [road.endLat, road.endLon]] as [[number, number], [number, number]],
          })),
          ...data.stops.map((stop) => ({
            id: `stop-${stop.id}`,
            name: stop.name,
            description: `${stop.type} stop`,
            category: "transport" as const,
            position: [stop.latitude, stop.longitude] as [number, number],
          })),
          ...data.incidents.map((incident) => ({
            id: `incident-${incident.id}`,
            name: `${incident.type} · ${incident.road}`,
            description: `Incident #${incident.id} on segment #${incident.segmentId}, ${new Date(incident.occurredAt).toLocaleString("en-IN")}`,
            category: "incident" as const,
            position: [incident.latitude, incident.longitude] as [number, number],
            severity: incident.severity.charAt(0) + incident.severity.slice(1).toLowerCase() as "High" | "Medium" | "Low",
          })),
        ];

        if (active) setLocations(mapLocations);
      } catch (error) {
        if (active) {
          setDataError(error instanceof Error ? error.message : "Could not load map data.");
        }
      } finally {
        if (active) setDataLoading(false);
      }
    }

    loadMapData();
    return () => {
      active = false;
    };
  }, []);

  const visibleLocations = useMemo(
    () =>
      locations.filter((location) => {
        if (location.category === "incident") return showIncidents;
        if (location.category === "transport") return showTransport;
        return showRoads;
      }),
    [locations, showIncidents, showTransport, showRoads]
  );

  // Initialize and clean up the Leaflet map.
  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [12.9716, 77.5946],
      zoom: 13,
      scrollWheelZoom: !compact,
      zoomControl: !compact,
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);

    setMapReady(true);

    // Leaflet needs the final container dimensions to lay out its tiles.
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      markersRef.current?.clearLayers();
      markersRef.current = null;

      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      setMapReady(false);
    };
  }, [compact]);

  // Render markers whenever the selected layers change.
  useEffect(() => {
    const markerLayer = markersRef.current;

    if (!mapReady || !markerLayer) return;

    markerLayer.clearLayers();

    visibleLocations.forEach((location) => {
      const color = categoryColors[location.category];
      const marker = location.path
        ? L.polyline(location.path, { color, weight: 5, opacity: 0.8 })
        : L.circleMarker(location.position, {
            radius: location.category === "incident" ? 9 : 7,
            color: "#FFFFFF",
            weight: 2.5,
            fillColor: color,
            fillOpacity: 0.95,
          });

      const severity = location.severity
        ? `<p style="margin:4px 0;color:#B42336;font-size:12px;font-weight:600">Severity: ${escapeHtml(location.severity)}</p>`
        : "";

      const popup = `
        <div style="min-width:180px">
          <strong style="color:#172033">${escapeHtml(location.name)}</strong>
          ${severity}
          <p style="margin:6px 0;color:#526178;line-height:1.5">
            ${escapeHtml(location.description)}
          </p>
          <p style="margin:4px 0;color:#8794A7;font-size:12px">
            ${location.position[0].toFixed(4)}, ${location.position[1].toFixed(4)}
          </p>
        </div>
      `;

      marker.bindPopup(popup);
      marker.addTo(markerLayer);
    });
  }, [mapReady, visibleLocations]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !locations.length || target) return;
    const bounds = L.latLngBounds(
      locations.flatMap((location) => location.path ?? [location.position]),
    );
    mapRef.current.fitBounds(bounds.pad(0.08), { maxZoom: compact ? 12 : 14 });
  }, [mapReady, locations, target, compact]);

  // Recenter only when the user explicitly requests their location.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !target) return;

    mapRef.current.flyTo(target.position, target.zoom, {
      duration: 0.8,
    });
  }, [mapReady, target]);

  function locateUser() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage(
        "Your browser doesn't support location services."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTarget({
          position: [
            position.coords.latitude,
            position.coords.longitude,
          ],
          zoom: 16,
        });

        setLocating(false);
        setLocationMessage("Map centered on your current location.");
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. Allow location access in your browser to use this feature.",
          2: "Your current location is unavailable. Try again in a moment.",
          3: "The location request timed out. Please try again.",
        };

        setLocationMessage(
          messages[error.code] ??
            "Couldn't get your location. Please try again."
        );

        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#E1E7F0] bg-white px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8794A7]">
            Map layers
          </span>

          <LayerToggle
            label="Safety reports"
            color={categoryColors.incident}
            checked={showIncidents}
            onChange={setShowIncidents}
          />

          <LayerToggle
            label="Transport"
            color={categoryColors.transport}
            checked={showTransport}
            onChange={setShowTransport}
          />

          <LayerToggle
            label="Roads"
            color={categoryColors.road}
            checked={showRoads}
            onChange={setShowRoads}
          />
        </div>
      )}

      <div
        className={`relative isolate overflow-hidden rounded-2xl border border-[#DCE3ED] bg-[#EAF0F5] ${
          compact ? "h-[320px] sm:h-[360px]" : "h-[520px] sm:h-[640px]"
        }`}
      >
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ background: "#EAF0F5" }}
        />

        <button
          type="button"
          onClick={locateUser}
          disabled={locating}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-2 rounded-xl border border-[#DCE3ED] bg-white px-3 py-2.5 text-sm font-semibold !text-[#344054] shadow-md transition hover:bg-[#F5F7FB] disabled:cursor-wait disabled:opacity-60"
        >
          <LocateFixed size={17} />
          {locating ? "Locating..." : "My location"}
        </button>

        {!compact && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-white/70 bg-white/95 px-3 py-2 text-xs font-medium text-[#526178] shadow-sm">
            <MapPin size={13} className="mr-1 inline-block" />
            Bengaluru · MySQL map records
          </div>
        )}
      </div>

      {dataLoading && (
        <p role="status" className="text-sm text-[#64748B]">Loading map records from MySQL…</p>
      )}
      {dataError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{dataError}</p>
      )}

      {locationMessage && (
        <p role="status" className="text-sm text-[#526178]">
          {locationMessage}
        </p>
      )}

      {!compact && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#718096]">
          <LegendItem
            color={categoryColors.incident}
            label="Safety reports"
          />
          <LegendItem
            color={categoryColors.transport}
            label="Transport stops"
          />
          <LegendItem
            color={categoryColors.road}
            label="Road segments"
          />
          <span className="ml-auto">
            Map data © OpenStreetMap contributors
          </span>
        </div>
      )}

      {compact && (
        <p className="text-xs leading-5 text-[#8794A7]">
          Road geometry, incident markers, and transport stops are loaded from MySQL.
        </p>
      )}
    </div>
  );
}

function LayerToggle({
  label,
  color,
  checked,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#526178]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[#CBD5E1] accent-[#477AC0]"
      />

      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      {label}
    </label>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
