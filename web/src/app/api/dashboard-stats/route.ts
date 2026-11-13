import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM routes) AS routes,
        (SELECT COUNT(*) FROM road_segments) AS roadSegments,
        (SELECT COUNT(*) FROM incidents) AS incidents,
        (SELECT COUNT(*) FROM transport_stops) AS transportStops
    `);

    return NextResponse.json({
      success: true,
      stats: (rows as any[])[0],
    });
  } catch (error) {
    console.error("Dashboard stats query failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not retrieve dashboard statistics",
      },
      { status: 500 }
    );
  }
}
