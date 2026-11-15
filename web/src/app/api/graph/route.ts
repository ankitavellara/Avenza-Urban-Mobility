import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getNeo4jDatabase, getNeo4jDriver } from "@/lib/neo4j";

type RouteSegmentRow = {
  routeId: number;
  routeName: string;
  origin: string;
  destination: string;
  sequenceNo: number;
  segmentId: number;
  roadName: string;
  lengthM: number;
  lightingLevel: number | null;
  roadConditionLevel: number | null;
  accessibilityLevel: number | null;
  incidentCount: number;
};

type StopLinkRow = {
  stopId: number;
  stopName: string;
  transportType: string;
  latitude: number;
  longitude: number;
  segmentId: number;
  distanceM: number;
};

type IncidentRow = {
  incidentId: number;
  segmentId: number;
  incidentType: string;
  severity: string;
  occurredAt: string;
};

type RouteEdge = {
  routeId: number;
  fromSegmentId: number;
  toSegmentId: number;
  fromSequence: number;
  toSequence: number;
};

type LocalityEndpoint = {
  name: string;
  segmentId: number;
  routeId: number;
  role: "origin" | "destination";
};

function numberValue(value: unknown) {
  return neo4j.isInt(value) ? value.toNumber() : Number(value);
}

async function synchronizeGraph() {
  const [routeRowsResult, stopRowsResult, incidentRowsResult] = await Promise.all([
    pool.query(`
      SELECT
        r.route_id AS routeId,
        r.route_name AS routeName,
        r.origin,
        r.destination,
        rs.sequence_no AS sequenceNo,
        s.segment_id AS segmentId,
        s.road_name AS roadName,
        s.length_m AS lengthM,
        si.lighting_level AS lightingLevel,
        si.road_condition_level AS roadConditionLevel,
        si.accessibility_level AS accessibilityLevel,
        COALESCE(ic.incidentCount, 0) AS incidentCount
      FROM routes r
      INNER JOIN route_segments rs ON rs.route_id = r.route_id
      INNER JOIN road_segments s ON s.segment_id = rs.segment_id
      LEFT JOIN segment_infrastructure si ON si.segment_id = s.segment_id
      LEFT JOIN (
        SELECT segment_id, COUNT(*) AS incidentCount
        FROM incidents
        GROUP BY segment_id
      ) ic ON ic.segment_id = s.segment_id
      ORDER BY r.route_id, rs.sequence_no
    `),
    pool.query(`
      SELECT
        ts.stop_id AS stopId,
        ts.stop_name AS stopName,
        ts.transport_type AS transportType,
        ts.latitude,
        ts.longitude,
        st.segment_id AS segmentId,
        st.distance_m AS distanceM
      FROM segment_transport st
      INNER JOIN transport_stops ts ON ts.stop_id = st.stop_id
      ORDER BY ts.stop_id, st.segment_id
    `),
    pool.query(`
      SELECT
        incident_id AS incidentId,
        segment_id AS segmentId,
        incident_type AS incidentType,
        severity,
        DATE_FORMAT(occurred_at, '%Y-%m-%d %H:%i:%s') AS occurredAt
      FROM incidents
      ORDER BY incident_id
    `),
  ]);

  const routeSegments = routeRowsResult[0] as RouteSegmentRow[];
  const stopLinks = stopRowsResult[0] as StopLinkRow[];
  const incidents = incidentRowsResult[0] as IncidentRow[];
  const routeEdges: RouteEdge[] = [];
  const localityEndpoints: LocalityEndpoint[] = [];
  const localities = new Map<string, { origin?: RouteSegmentRow; destination?: RouteSegmentRow }>();
  let previous: RouteSegmentRow | undefined;

  for (const row of routeSegments) {
    const localityEndpointsForRoute = localities.get(String(row.routeId));
    if (!localityEndpointsForRoute) {
      localities.set(String(row.routeId), { origin: row, destination: row });
    } else {
      localityEndpointsForRoute.destination = row;
    }

    if (previous?.routeId === row.routeId) {
      routeEdges.push({
        routeId: row.routeId,
        fromSegmentId: previous.segmentId,
        toSegmentId: row.segmentId,
        fromSequence: previous.sequenceNo,
        toSequence: row.sequenceNo,
      });
    }
    previous = row;
  }

  for (const endpoints of localities.values()) {
    if (endpoints.origin && endpoints.destination) {
      localityEndpoints.push(
        {
          name: endpoints.origin.origin.trim(),
          segmentId: endpoints.origin.segmentId,
          routeId: endpoints.origin.routeId,
          role: "origin",
        },
        {
          name: endpoints.destination.destination.trim(),
          segmentId: endpoints.destination.segmentId,
          routeId: endpoints.destination.routeId,
          role: "destination",
        },
      );
    }
  }

  const driver = getNeo4jDriver();
  const session = driver.session({ database: getNeo4jDatabase() });

  try {
    await session.run(
      "CREATE CONSTRAINT route_id_unique IF NOT EXISTS FOR (n:Route) REQUIRE n.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT segment_id_unique IF NOT EXISTS FOR (n:RoadSegment) REQUIRE n.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT transport_stop_id_unique IF NOT EXISTS FOR (n:TransportStop) REQUIRE n.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT incident_id_unique IF NOT EXISTS FOR (n:Incident) REQUIRE n.id IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT locality_name_unique IF NOT EXISTS FOR (n:Locality) REQUIRE n.name IS UNIQUE",
    );

    await session.executeWrite(async (tx) => {
      await tx.run(
        `MATCH (node)
         WHERE node:Route OR node:RoadSegment OR node:TransportStop
            OR node:Incident OR node:Locality
         DETACH DELETE node`,
      );

      if (routeSegments.length > 0) {
        await tx.run(
          `UNWIND $rows AS row
           MERGE (r:Route {id: row.routeId})
           SET r.name = row.routeName,
               r.origin = row.origin,
               r.destination = row.destination
           MERGE (s:RoadSegment {id: row.segmentId})
           SET s.name = row.roadName,
               s.lengthM = row.lengthM,
               s.lightingLevel = row.lightingLevel,
               s.roadConditionLevel = row.roadConditionLevel,
               s.accessibilityLevel = row.accessibilityLevel,
               s.incidentCount = row.incidentCount
           MERGE (r)-[rel:HAS_SEGMENT]->(s)
           SET rel.sequenceNo = row.sequenceNo`,
          { rows: routeSegments },
        );
      }

      if (routeEdges.length > 0) {
        await tx.run(
          `UNWIND $rows AS row
           MATCH (a:RoadSegment {id: row.fromSegmentId})
           MATCH (b:RoadSegment {id: row.toSegmentId})
           MERGE (a)-[rel:CONNECTS_TO {routeId: row.routeId}]->(b)
           SET rel.fromSequence = row.fromSequence,
               rel.toSequence = row.toSequence`,
          { rows: routeEdges },
        );
      }

      if (localityEndpoints.length > 0) {
        await tx.run(
          `UNWIND $rows AS row
           MATCH (s:RoadSegment {id: row.segmentId})
           MERGE (l:Locality {name: row.name})
           MERGE (l)-[rel:HAS_ENDPOINT {role: row.role, routeId: row.routeId}]->(s)`,
          { rows: localityEndpoints },
        );
      }

      if (stopLinks.length > 0) {
        await tx.run(
          `UNWIND $rows AS row
           MERGE (s:RoadSegment {id: row.segmentId})
           MERGE (t:TransportStop {id: row.stopId})
           SET t.name = row.stopName,
               t.type = row.transportType,
               t.latitude = row.latitude,
               t.longitude = row.longitude
           MERGE (s)-[rel:NEAR_STOP]->(t)
           SET rel.distanceM = row.distanceM`,
          { rows: stopLinks },
        );
      }

      if (incidents.length > 0) {
        await tx.run(
          `UNWIND $rows AS row
           MERGE (s:RoadSegment {id: row.segmentId})
           CREATE (incident:Incident {
             id: row.incidentId,
             type: row.incidentType,
             severity: row.severity,
             occurredAt: row.occurredAt
           })
           CREATE (s)-[:HAS_INCIDENT]->(incident)`,
          { rows: incidents },
        );
      }
    });
  } finally {
    await session.close();
  }
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    await synchronizeGraph();

    const driver = getNeo4jDriver();
    const database = getNeo4jDatabase();
    const [routeCountResult, segmentCountResult, stopCountResult, localityResult] =
      await Promise.all([
        driver.executeQuery(
          "MATCH (n:Route) RETURN count(n) AS count",
          {},
          { database },
        ),
        driver.executeQuery(
          "MATCH (n:RoadSegment) RETURN count(n) AS count",
          {},
          { database },
        ),
        driver.executeQuery(
          "MATCH (n:TransportStop) RETURN count(n) AS count",
          {},
          { database },
        ),
        driver.executeQuery(
          `MATCH (locality:Locality)
           RETURN locality.name AS name
           ORDER BY name`,
          {},
          { database },
        ),
      ]);
    const localities = localityResult.records.map((record) =>
      record.get("name") as string,
    );
    const stats = {
      routes: numberValue(routeCountResult.records[0].get("count")),
      roadSegments: numberValue(segmentCountResult.records[0].get("count")),
      transportStops: numberValue(stopCountResult.records[0].get("count")),
    };

    return NextResponse.json({ success: true, stats, localities });
  } catch (error) {
    console.error("GET /api/graph failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Neo4j is unavailable. Check the server and connection settings.",
      },
      { status: 503 },
    );
  }
}
