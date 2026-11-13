import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS databaseName");

    return NextResponse.json({
      success: true,
      message: "MySQL connection successful",
      result: rows,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "MySQL connection failed",
      },
      { status: 500 }
    );
  }
}