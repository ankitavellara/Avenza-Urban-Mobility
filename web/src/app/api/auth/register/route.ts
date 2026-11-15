import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ success: false, error: "Name must be between 2 and 100 characters." }, { status: 400 });
    }
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 12 || password.length > 200 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ success: false, error: "Password must be at least 12 characters and include uppercase, lowercase, and a number." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'USER', 1)",
      [name, email, passwordHash],
    );
    await createSession(Number((result as { insertId: number }).insertId));
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ success: false, error: "An account with that email already exists." }, { status: 409 });
    }
    console.error("POST /api/auth/register failed:", error);
    return NextResponse.json({ success: false, error: "Could not create the account right now." }, { status: 500 });
  }
}
