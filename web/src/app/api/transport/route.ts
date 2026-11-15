import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [rows] = await pool.query(`
      SELECT
        ts.stop_id AS stopId,
        ts.stop_name AS stopName,
        ts.transport_type AS transportType,
        ts.latitude AS latitude,
        ts.longitude AS longitude,
        st.segment_id AS segmentId,
        rs.road_name AS roadName,
        st.distance_m AS distanceM
      FROM transport_stops ts
      LEFT JOIN segment_transport st ON st.stop_id = ts.stop_id
      LEFT JOIN road_segments rs ON rs.segment_id = st.segment_id
      ORDER BY ts.stop_name, st.distance_m
    `);

    const grouped = new Map();

    for (const row of rows as Array<any>) {
      if (!grouped.has(row.stopId)) {
        grouped.set(row.stopId, {
          stopId: row.stopId,
          stopName: row.stopName,
          transportType: row.transportType,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          linkedSegments: [],
        });
      }

      if (row.segmentId !== null) {
        grouped.get(row.stopId).linkedSegments.push({
          segmentId: row.segmentId,
          roadName: row.roadName ?? `Segment ${row.segmentId}`,
          distanceM: Number(row.distanceM),
        });
      }
    }

    return NextResponse.json({
      success: true,
      stops: Array.from(grouped.values()),
    });
  } catch (error) {
    console.error("GET /api/transport failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
