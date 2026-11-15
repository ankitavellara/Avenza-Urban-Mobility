import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";
import { getNeo4jDatabase, getNeo4jDriver } from "@/lib/neo4j";
import { requireUser } from "@/lib/auth";

function numberValue(value: unknown) {
  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

export async function GET(request: Request) {
  const auth = await requireUser();
  const url = new URL(request.url);
  if (auth.response) return auth.response;
  const from = url.searchParams.get("from")?.trim() ?? "";
  const to = url.searchParams.get("to")?.trim() ?? "";

  if (!from || !to || from === to) {
    return NextResponse.json(
      { success: false, error: "Choose two different localities." },
      { status: 400 },
    );
  }

  try {
    const result = await getNeo4jDriver().executeQuery(
      `MATCH (sourceLocality:Locality {name: $from})-[fromEndpoint:HAS_ENDPOINT {role: 'origin'}]->(start:RoadSegment)
       MATCH (destinationLocality:Locality {name: $to})-[toEndpoint:HAS_ENDPOINT {role: 'destination'}]->(finish:RoadSegment)
       WHERE fromEndpoint.routeId = toEndpoint.routeId
       MATCH (route:Route {id: fromEndpoint.routeId})-[startRel:HAS_SEGMENT]->(start)
       MATCH (route)-[endRel:HAS_SEGMENT]->(finish)
       WHERE startRel.sequenceNo < endRel.sequenceNo
       MATCH (route)-[segmentRel:HAS_SEGMENT]->(segment:RoadSegment)
       WHERE segmentRel.sequenceNo >= startRel.sequenceNo
         AND segmentRel.sequenceNo <= endRel.sequenceNo
       WITH route, segmentRel, segment
       ORDER BY segmentRel.sequenceNo
       WITH route, collect(segment) AS pathSegments
       RETURN route.id AS routeId,
              route.name AS routeName,
              route.origin AS origin,
              route.destination AS destination,
              [segment IN pathSegments | {
                id: segment.id,
                name: segment.name,
                lengthM: segment.lengthM,
                nearbyStops: [
                  (segment)-[near:NEAR_STOP]->(stop:TransportStop) |
                  {
                    id: stop.id,
                    name: stop.name,
                    type: stop.type,
                    distanceM: near.distanceM
                  }
                ],
                incidents: [
                  (segment)-[:HAS_INCIDENT]->(incident:Incident) |
                  {
                    id: incident.id,
                    type: incident.type,
                    severity: incident.severity,
                    occurredAt: incident.occurredAt
                  }
                ]
              }] AS segments,
              reduce(total = 0, segment IN pathSegments | total + segment.lengthM) AS distanceM,
              reduce(total = 0, segment IN pathSegments | total + segment.incidentCount) AS incidentCount,
              round(toFloat(reduce(total = 0, segment IN pathSegments | total + coalesce(segment.lightingLevel, 0))) / size(pathSegments), 2) AS averageLighting,
              round(toFloat(reduce(total = 0, segment IN pathSegments | total + coalesce(segment.accessibilityLevel, 0))) / size(pathSegments), 2) AS averageAccessibility
       ORDER BY incidentCount ASC, averageAccessibility DESC, averageLighting DESC, distanceM ASC
       LIMIT 5`,
      { from, to },
      { database: getNeo4jDatabase() },
    );

    const paths = result.records.map((record) => ({
      routeId: numberValue(record.get("routeId")),
      routeName: record.get("routeName") as string,
      origin: record.get("origin") as string,
      destination: record.get("destination") as string,
      segments: (record.get("segments") as Array<Record<string, unknown>>).map(
        (segment) => ({
          id: numberValue(segment.id),
          name: segment.name as string,
          lengthM: numberValue(segment.lengthM),
          nearbyStops: (segment.nearbyStops as Array<Record<string, unknown>>).map(
            (stop) => ({
              id: numberValue(stop.id),
              name: stop.name as string,
              type: stop.type as string,
              distanceM: numberValue(stop.distanceM),
            }),
          ),
          incidents: (segment.incidents as Array<Record<string, unknown>>).map(
            (incident) => ({
              id: numberValue(incident.id),
              type: incident.type as string,
              severity: incident.severity as string,
              occurredAt: incident.occurredAt as string,
            }),
          ),
        }),
      ),
      distanceM: numberValue(record.get("distanceM")),
      incidentCount: numberValue(record.get("incidentCount")),
      averageLighting: Number(record.get("averageLighting")),
      averageAccessibility: Number(record.get("averageAccessibility")),
    }));

    return NextResponse.json({ success: true, paths });
  } catch (error) {
    console.error("GET /api/graph/paths failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not search the Neo4j route graph." },
      { status: 503 },
    );
  }
}
