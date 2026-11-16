import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";
import { requireUser } from "@/lib/auth";
import { getNeo4jDatabase, getNeo4jDriver } from "@/lib/neo4j";

type GraphNodeType = "Locality" | "Route" | "RoadSegment" | "TransportStop" | "Incident";
type GraphNode = { id: string; label: string; type: GraphNodeType; detail: string };
type GraphEdge = { id: string; source: string; target: string; type: string; detail: string };

function numberValue(value: unknown) {
  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const locality = new URL(request.url).searchParams.get("locality")?.trim() ?? "";
  if (!locality || locality.length > 100) {
    return NextResponse.json({ success: false, error: "Choose a locality to visualize." }, { status: 400 });
  }

  try {
    const driver = getNeo4jDriver();
    const database = getNeo4jDatabase();
    const [segmentResult] = await Promise.all([
      driver.executeQuery(
        `MATCH (:Locality {name: $locality})-[:HAS_ROAD_SEGMENT]->(segment:RoadSegment)
         RETURN segment.id AS id, segment.name AS name, segment.lengthM AS lengthM
         ORDER BY id
         LIMIT 12`,
        { locality },
        { database },
      ),
    ]);

    const segments = segmentResult.records.map((record) => ({
      id: numberValue(record.get("id")),
      name: record.get("name") as string,
      lengthM: numberValue(record.get("lengthM")),
    }));
    const segmentIds = segments.map((segment) => segment.id);

    const [routeResult, connectionResult, stopResult, incidentResult] = segmentIds.length
      ? await Promise.all([
          driver.executeQuery(
            `MATCH (route:Route)-[:HAS_SEGMENT]->(segment:RoadSegment)
             WHERE segment.id IN $segmentIds
             WITH route, count(DISTINCT segment) AS sharedSegments
             ORDER BY sharedSegments DESC, route.id
             LIMIT 6
             MATCH (route)-[rel:HAS_SEGMENT]->(segment:RoadSegment)
             WHERE segment.id IN $segmentIds
             RETURN route.id AS routeId, route.name AS routeName,
                    route.origin AS origin, route.destination AS destination,
                    segment.id AS segmentId, rel.sequenceNo AS sequenceNo
             ORDER BY routeName, sequenceNo`,
            { segmentIds },
            { database },
          ),
          driver.executeQuery(
            `MATCH (a:RoadSegment)-[:CONNECTS_TO]->(b:RoadSegment)
             WHERE a.id IN $segmentIds AND b.id IN $segmentIds
             RETURN a.id AS fromId, b.id AS toId
             ORDER BY fromId, toId
             LIMIT 30`,
            { segmentIds },
            { database },
          ),
          driver.executeQuery(
            `MATCH (segment:RoadSegment)-[rel:NEAR_STOP]->(stop:TransportStop)
             WHERE segment.id IN $segmentIds
             RETURN segment.id AS segmentId, stop.id AS stopId,
                    stop.name AS name, stop.type AS type, rel.distanceM AS distanceM
             ORDER BY distanceM, name
             LIMIT 8`,
            { segmentIds },
            { database },
          ),
          driver.executeQuery(
            `MATCH (segment:RoadSegment)-[:HAS_INCIDENT]->(incident:Incident)
             WHERE segment.id IN $segmentIds
             RETURN segment.id AS segmentId, incident.id AS incidentId,
                    incident.type AS type, incident.severity AS severity,
                    incident.description AS description, incident.occurredAt AS occurredAt
             ORDER BY occurredAt DESC
             LIMIT 8`,
            { segmentIds },
            { database },
          ),
        ])
      : [null, null, null, null];

    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const addNode = (node: GraphNode) => nodes.set(node.id, node);
    const addEdge = (source: string, target: string, type: string, detail = "") => {
      if (!nodes.has(source) || !nodes.has(target)) return;
      const id = `${source}|${type}|${target}`;
      edges.set(id, { id, source, target, type, detail });
    };

    const localityId = `locality:${locality}`;
    addNode({ id: localityId, label: locality, type: "Locality", detail: "Selected locality" });
    for (const segment of segments) {
      const id = `segment:${segment.id}`;
      addNode({ id, label: segment.name, type: "RoadSegment", detail: `${segment.lengthM} m · segment #${segment.id}` });
      addEdge(localityId, id, "HAS_ROAD_SEGMENT");
    }

    for (const record of routeResult?.records ?? []) {
      const routeId = numberValue(record.get("routeId"));
      const segmentId = numberValue(record.get("segmentId"));
      const routeKey = `route:${routeId}`;
      const routeName = record.get("routeName") as string;
      const origin = record.get("origin") as string;
      const destination = record.get("destination") as string;
      addNode({ id: routeKey, label: routeName, type: "Route", detail: `${origin} → ${destination}` });
      addEdge(routeKey, `segment:${segmentId}`, "HAS_SEGMENT", `Order ${numberValue(record.get("sequenceNo"))}`);
    }

    for (const record of connectionResult?.records ?? []) {
      addEdge(`segment:${numberValue(record.get("fromId"))}`, `segment:${numberValue(record.get("toId"))}`, "CONNECTS_TO");
    }

    for (const record of stopResult?.records ?? []) {
      const stopId = numberValue(record.get("stopId"));
      const stopKey = `stop:${stopId}`;
      const name = record.get("name") as string;
      const type = record.get("type") as string;
      const distanceM = numberValue(record.get("distanceM"));
      addNode({ id: stopKey, label: name, type: "TransportStop", detail: `${type} · ${distanceM} m away` });
      addEdge(`segment:${numberValue(record.get("segmentId"))}`, stopKey, "NEAR_STOP", `${distanceM} m`);
    }

    for (const record of incidentResult?.records ?? []) {
      const incidentId = numberValue(record.get("incidentId"));
      const incidentKey = `incident:${incidentId}`;
      const type = record.get("type") as string;
      const severity = record.get("severity") as string;
      const description = (record.get("description") as string | null) ?? "No narrative provided";
      const occurredAt = record.get("occurredAt") as string;
      addNode({ id: incidentKey, label: `${severity} ${type}`, type: "Incident", detail: `${occurredAt} · ${description}` });
      addEdge(`segment:${numberValue(record.get("segmentId"))}`, incidentKey, "HAS_INCIDENT");
    }

    return NextResponse.json({
      success: true,
      locality,
      mappedSegments: segments.length,
      nodes: [...nodes.values()],
      edges: [...edges.values()],
    });
  } catch (error) {
    console.error("GET /api/graph/visualization failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not load the Neo4j graph visualization." },
      { status: 503 },
    );
  }
}
