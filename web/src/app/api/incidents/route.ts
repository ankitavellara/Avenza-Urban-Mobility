import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

const allowedTypes = ["THEFT", "HARASSMENT", "ACCIDENT", "OTHER"];
const allowedSeverities = ["LOW", "MEDIUM", "HIGH"];

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const [rows] = await pool.query(`
      SELECT
        i.incident_id AS id,
        i.segment_id AS segmentId,
        s.road_name AS road,
        i.incident_type AS type,
        i.severity AS severity,
        i.occurred_at AS occurredAt,
        i.reported_at AS reportedAt,
        i.verified_by AS verifiedBy
      FROM incidents i
      INNER JOIN road_segments s ON s.segment_id = i.segment_id
      ORDER BY i.reported_at DESC
    `);

    return NextResponse.json({ success: true, incidents: rows });
  } catch (error) {
    console.error("GET /api/incidents failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const segmentId = Number(body.segmentId);
    const type = String(body.type ?? "").toUpperCase();
    const severity = String(body.severity ?? "").toUpperCase();
    const occurredAt = String(body.occurredAt ?? "");

    if (!Number.isInteger(segmentId) || segmentId <= 0) {
      return NextResponse.json({ success: false, error: "A valid road segment is required." }, { status: 400 });
    }
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid incident type." }, { status: 400 });
    }
    if (!allowedSeverities.includes(severity)) {
      return NextResponse.json({ success: false, error: "Invalid severity." }, { status: 400 });
    }
    if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
      return NextResponse.json({ success: false, error: "A valid occurrence date and time is required." }, { status: 400 });
    }

    const [users] = await pool.query(
      "SELECT user_id FROM users WHERE is_active = 1 ORDER BY (role = 'ADMIN') DESC, user_id LIMIT 1"
    );
    const reviewer = (users as Array<{ user_id: number }>)[0];

    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: "No users available for incidents.verified_by." },
        { status: 500 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO incidents
        (segment_id, verified_by, incident_type, severity, occurred_at, reported_at, source_observation_id)
       VALUES (?, ?, ?, ?, ?, NOW(), NULL)`,
      [segmentId, reviewer.user_id, type, severity, occurredAt.replace("T", " ").slice(0, 19)]
    );

    const insertResult = result as { insertId: number };
    const [createdRows] = await pool.query(
      `SELECT
        i.incident_id AS id,
        i.segment_id AS segmentId,
        s.road_name AS road,
        i.incident_type AS type,
        i.severity AS severity,
        i.occurred_at AS occurredAt,
        i.reported_at AS reportedAt,
        i.verified_by AS verifiedBy
       FROM incidents i
       INNER JOIN road_segments s ON s.segment_id = i.segment_id
       WHERE i.incident_id = ?`,
      [insertResult.insertId]
    );

    return NextResponse.json(
      { success: true, incident: (createdRows as unknown[])[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/incidents failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
