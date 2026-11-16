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
        i.description AS description,
        i.occurred_at AS occurredAt,
        i.reported_at AS reportedAt,
        i.reported_by AS reportedBy,
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
    const description = String(body.description ?? "").trim();
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
    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json({ success: false, error: "Description must be between 10 and 2,000 characters." }, { status: 400 });
    }
    if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
      return NextResponse.json({ success: false, error: "A valid occurrence date and time is required." }, { status: 400 });
    }

    const [result] = await pool.execute(
      `INSERT INTO incidents
        (segment_id, reported_by, verified_by, incident_type, severity, description, occurred_at, reported_at, source_observation_id)
       VALUES (?, ?, NULL, ?, ?, ?, ?, NOW(), NULL)`,
      [segmentId, auth.user.id, type, severity, description, occurredAt.replace("T", " ").slice(0, 19)]
    );

    const insertResult = result as { insertId: number };
    const [createdRows] = await pool.query(
      `SELECT
        i.incident_id AS id,
        i.segment_id AS segmentId,
        s.road_name AS road,
        i.incident_type AS type,
        i.severity AS severity,
        i.description AS description,
        i.occurred_at AS occurredAt,
        i.reported_at AS reportedAt,
        i.reported_by AS reportedBy,
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
