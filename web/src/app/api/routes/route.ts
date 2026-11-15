import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [rows] = await pool.query(`
      SELECT
        r.route_id AS id,
        r.route_name AS name,
        r.origin,
        r.destination,
        COUNT(rs.segment_id) AS segments,
        COALESCE(SUM(s.length_m), 0) / 1000 AS distance
      FROM routes r
      LEFT JOIN route_segments rs ON rs.route_id = r.route_id
      LEFT JOIN road_segments s ON s.segment_id = rs.segment_id
      GROUP BY r.route_id, r.route_name, r.origin, r.destination
      ORDER BY r.route_name
    `);

    return NextResponse.json({ success: true, routes: rows });
  } catch (error) {
    console.error("Routes API failed:", error);
    return NextResponse.json(
      { success: false, message: "Could not retrieve routes" },
      { status: 500 }
    );
  }
}
