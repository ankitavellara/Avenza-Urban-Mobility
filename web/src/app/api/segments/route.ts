import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.segment_id AS id,
        s.road_name AS road,
        s.length_m AS length,
        s.start_lat AS startLat,
        s.start_lon AS startLon,
        s.end_lat AS endLat,
        s.end_lon AS endLon,
        si.lighting_level AS lighting,
        si.road_condition_level AS roadCondition,
        si.accessibility_level AS accessibility
      FROM road_segments s
      LEFT JOIN segment_infrastructure si
        ON si.segment_id = s.segment_id
    `);

    return NextResponse.json({ success: true, segments: rows });
  } catch (error) {
    console.error("GET /api/segments failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
