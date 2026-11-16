import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const [rows] = await pool.query(
      "SELECT locality_name AS name FROM localities ORDER BY locality_name",
    );
    return NextResponse.json({ success: true, localities: rows });
  } catch (error) {
    console.error("GET /api/localities failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not load localities from MySQL." },
      { status: 500 },
    );
  }
}
