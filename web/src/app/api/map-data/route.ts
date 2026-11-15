import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [roadRows, stopRows, incidentRows] = await Promise.all([
      pool.query(`
        SELECT segment_id AS id, road_name AS name,
               start_lat AS startLat, start_lon AS startLon,
               end_lat AS endLat, end_lon AS endLon, length_m AS lengthM
        FROM road_segments
        ORDER BY segment_id
      `),
      pool.query(`
        SELECT stop_id AS id, stop_name AS name,
               transport_type AS type, latitude, longitude
        FROM transport_stops
        ORDER BY stop_id
      `),
      pool.query(`
        SELECT i.incident_id AS id, i.incident_type AS type,
               i.severity, i.occurred_at AS occurredAt,
               s.segment_id AS segmentId, s.road_name AS road,
               (s.start_lat + s.end_lat) / 2 AS latitude,
               (s.start_lon + s.end_lon) / 2 AS longitude
        FROM incidents i
        INNER JOIN road_segments s ON s.segment_id = i.segment_id
        ORDER BY i.occurred_at DESC
      `),
    ]);

    const [roads] = roadRows;
    const [stops] = stopRows;
    const [incidents] = incidentRows;

    return NextResponse.json({
      success: true,
      roads: (roads as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        id: Number(row.id),
        startLat: Number(row.startLat),
        startLon: Number(row.startLon),
        endLat: Number(row.endLat),
        endLon: Number(row.endLon),
        lengthM: Number(row.lengthM),
      })),
      stops: (stops as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        id: Number(row.id),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })),
      incidents: (incidents as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        id: Number(row.id),
        segmentId: Number(row.segmentId),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })),
    });
  } catch (error) {
    console.error("GET /api/map-data failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Could not load map data from MySQL.",
      },
      { status: 500 },
    );
  }
}
