"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";

type NodeType = "Locality" | "Route" | "RoadSegment" | "TransportStop" | "Incident";
type GraphNode = { id: string; label: string; type: NodeType; detail: string };
type GraphEdge = { id: string; source: string; target: string; type: string; detail: string };
type GraphData = { nodes: GraphNode[]; edges: GraphEdge[]; locality: string; mappedSegments: number };

const nodeStyle: Record<NodeType, { color: string; short: string }> = {
  Locality: { color: "#2563EB", short: "L" },
  Route: { color: "#7C3AED", short: "R" },
  RoadSegment: { color: "#0F766E", short: "S" },
  TransportStop: { color: "#0284C7", short: "T" },
  Incident: { color: "#DC3545", short: "!" },
};

const edgeColors: Record<string, string> = {
  HAS_ROAD_SEGMENT: "#3B82F6",
  HAS_SEGMENT: "#8B5CF6",
  CONNECTS_TO: "#0F766E",
  NEAR_STOP: "#0284C7",
  HAS_INCIDENT: "#DC3545",
};

export default function Neo4jGraphView({
  localities,
  ready,
}: {
  localities: string[];
  ready: boolean;
}) {
  const [locality, setLocality] = useState("");
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!locality && localities.length > 0) setLocality(localities[0]);
  }, [locality, localities]);

  useEffect(() => {
    if (!ready || !locality) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/graph/visualization?locality=${encodeURIComponent(locality)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Could not load the Neo4j graph.");
        }
        setGraph(data);
        setSelectedNodeId("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the Neo4j graph.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ready, locality]);

  const layout = useMemo(() => {
    if (!graph) return { positions: new Map<string, { x: number; y: number }>(), width: 1040, height: 580 };
    const byType = new Map<NodeType, GraphNode[]>();
    for (const node of graph.nodes) byType.set(node.type, [...(byType.get(node.type) ?? []), node]);
    const positions = new Map<string, { x: number; y: number }>();
    const columns: Record<NodeType, { x: number; minY: number; maxY: number }> = {
      Locality: { x: 85, minY: 270, maxY: 270 },
      Route: { x: 315, minY: 60, maxY: 520 },
      RoadSegment: { x: 555, minY: 35, maxY: 545 },
      TransportStop: { x: 835, minY: 65, maxY: 255 },
      Incident: { x: 835, minY: 325, maxY: 530 },
    };
    for (const [type, nodes] of byType) {
      const column = columns[type];
      nodes.forEach((node, index) => {
        const y = nodes.length <= 1
          ? (column.minY + column.maxY) / 2
          : column.minY + ((column.maxY - column.minY) * index) / (nodes.length - 1);
        positions.set(node.id, { x: column.x, y });
      });
    }
    return { positions, width: 1040, height: 580 };
  }, [graph]);

  const selectedNode = graph?.nodes.find((node) => node.id === selectedNodeId);
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    const connected = new Set([selectedNodeId]);
    graph.edges.forEach((edge) => {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    });
    return connected;
  }, [graph, selectedNodeId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E1E7F0] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8EDF4] p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#648CC7]"><GitBranch size={15} /> Neo4j visualization</p>
          <h2 className="mt-2 text-xl font-bold text-[#172033]">Explore connected graph data</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748B]">
            This view reads nodes and relationships from Neo4j. Choose a locality to inspect its mapped road segments, saved routes, nearby stops, incidents, and road connections.
          </p>
        </div>
        <label className="min-w-56 text-sm font-medium text-[#526078]">
          Focus locality
          <select
            value={locality}
            onChange={(event) => setLocality(event.target.value)}
            disabled={!ready || localities.length === 0}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-[#D6DFEC] bg-white px-3 text-sm text-[#172033] disabled:bg-[#F5F7FB]"
          >
            {localities.length === 0 ? <option value="">No localities available</option> : localities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#E8EDF4] px-5 py-3 text-xs text-[#526078] sm:px-6">
        {(Object.keys(nodeStyle) as NodeType[]).map((type) => (
          <span key={type} className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: nodeStyle[type].color }} />{type === "RoadSegment" ? "Road segment" : type === "TransportStop" ? "Transport stop" : type}</span>
        ))}
        {graph && <span className="ml-auto">{graph.nodes.length} nodes · {graph.edges.length} relationships</span>}
      </div>

      {loading ? (
        <div role="status" className="flex h-[420px] items-center justify-center text-sm text-[#64748B]">Loading a locality subgraph from Neo4j…</div>
      ) : error ? (
        <div role="alert" className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : graph && graph.nodes.length > 0 ? (
        <>
          <div className="overflow-x-auto bg-[#FBFCFE]">
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-[500px] min-w-[900px] w-full" role="img" aria-label={`Neo4j relationship graph focused on ${graph.locality}`}>
              <defs>
                <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#8391A5" />
                </marker>
              </defs>
              {graph.edges.map((edge) => {
                const from = layout.positions.get(edge.source);
                const to = layout.positions.get(edge.target);
                if (!from || !to) return null;
                const sameColumn = from.x === to.x;
                const path = sameColumn
                  ? `M ${from.x} ${from.y} C ${from.x + 90} ${from.y}, ${to.x + 90} ${to.y}, ${to.x} ${to.y}`
                  : `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
                const isActive = !selectedNodeId || edge.source === selectedNodeId || edge.target === selectedNodeId;
                return <path key={edge.id} d={path} fill="none" stroke={edgeColors[edge.type] ?? "#AAB4C2"} strokeWidth={selectedNodeId && isActive ? 2.5 : 1.7} strokeOpacity={isActive ? 0.68 : 0.12} markerEnd="url(#graph-arrow)"><title>{`${edge.type}${edge.detail ? ` · ${edge.detail}` : ""}`}</title></path>;
              })}
              {graph.nodes.map((node) => {
                const point = layout.positions.get(node.id);
                if (!point) return null;
                const style = nodeStyle[node.type];
                const isSelected = selectedNodeId === node.id;
                const isDimmed = selectedNodeId !== "" && !connectedNodeIds.has(node.id);
                return (
                  <g key={node.id} role="button" tabIndex={0} aria-label={`${node.type}: ${node.label}`} onClick={() => setSelectedNodeId(isSelected ? "" : node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedNodeId(isSelected ? "" : node.id); }} className="cursor-pointer" opacity={isDimmed ? 0.35 : 1}>
                    <title>{`${node.type}: ${node.label} · ${node.detail}`}</title>
                    <circle cx={point.x} cy={point.y} r={isSelected ? 18 : 15} fill={style.color} stroke={isSelected ? "#172033" : "white"} strokeWidth={isSelected ? 3 : 2.5} />
                    <text x={point.x} y={point.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" pointerEvents="none">{style.short}</text>
                    <text x={point.x + 22} y={point.y + 4} fill="#344054" fontSize="12" fontWeight={isSelected ? "700" : "500"} pointerEvents="none">{node.label.length > 25 ? `${node.label.slice(0, 23)}…` : node.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#E8EDF4] px-5 py-3 text-xs text-[#64748B] sm:px-6">
            {Object.entries(edgeColors).map(([type, color]) => <span key={type} className="inline-flex items-center gap-2"><span className="h-0.5 w-5" style={{ background: color }} />{type}</span>)}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-5 text-xs text-[#8794A7] sm:px-6">
            <p>{graph.mappedSegments === 0 ? `No road segments are mapped to ${graph.locality}; choose another locality.` : "Showing up to 12 mapped road segments, 6 related routes, 8 stops, and 8 incidents for this locality. Click a node to highlight its direct connections."}</p>
            {selectedNode && <p className="max-w-lg rounded-lg bg-[#F5F7FB] px-3 py-2 text-[#526078]"><strong>{selectedNode.type}: {selectedNode.label}</strong><br />{selectedNode.detail}</p>}
          </div>
        </>
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 px-5 text-center text-sm text-[#64748B]">
          <GitBranch size={24} className="text-[#8A9AB1]" />
          <p>No Neo4j nodes are mapped to {locality} yet.</p>
        </div>
      )}
    </section>
  );
}
