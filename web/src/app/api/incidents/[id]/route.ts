import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const allowedTypes = ["THEFT", "HARASSMENT", "ACCIDENT", "OTHER"];
const allowedSeverities = ["LOW", "MEDIUM", "HIGH"];
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid incident ID." }, { status: 400 });
    }

    const body = await request.json();
    const segmentId = Number(body.segmentId);
    const type = String(body.type ?? "").toUpperCase();
    const severity = String(body.severity ?? "").toUpperCase();
    const description = String(body.description ?? "").trim();
    const occurredAt = String(body.occurredAt ?? "");
    const date = new Date(occurredAt);

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
    if (!occurredAt || Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
      return NextResponse.json({ success: false, error: "Enter a valid occurrence date and time that is not in the future." }, { status: 400 });
    }

    const [existingRows] = await pool.execute(
      "SELECT incident_id FROM incidents WHERE incident_id = ?",
      [id]
    );
    if ((existingRows as unknown[]).length === 0) {
      return NextResponse.json({ success: false, error: "Incident not found." }, { status: 404 });
    }

    await pool.execute(
      `UPDATE incidents
       SET segment_id = ?, incident_type = ?, severity = ?, description = ?, occurred_at = ?
       WHERE incident_id = ?`,
      [segmentId, type, severity, description, occurredAt.replace("T", " ").slice(0, 19), id]
    );

    const [rows] = await pool.query(
      `SELECT i.incident_id AS id, i.segment_id AS segmentId, s.road_name AS road,
              i.incident_type AS type, i.severity AS severity, i.description AS description,
              i.occurred_at AS occurredAt, i.reported_at AS reportedAt,
              i.reported_by AS reportedBy, i.verified_by AS verifiedBy
       FROM incidents i INNER JOIN road_segments s ON s.segment_id = i.segment_id
       WHERE i.incident_id = ?`,
      [id]
    );
    return NextResponse.json({ success: true, incident: (rows as unknown[])[0] });
  } catch (error) {
    console.error("PATCH /api/incidents/[id] failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid incident ID." }, { status: 400 });
    }

    const [result] = await pool.execute("DELETE FROM incidents WHERE incident_id = ?", [id]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return NextResponse.json({ success: false, error: "Incident not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/incidents/[id] failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
