import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password || email.length > 150 || password.length > 200) {
      return NextResponse.json({ success: false, error: "Enter a valid email and password." }, { status: 400 });
    }

    const [rows] = await pool.execute(
      "SELECT user_id AS id, password_hash AS passwordHash FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
      [email],
    );
    const user = (rows as Array<{ id: number; passwordHash: string }>)[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ success: false, error: "Email or password is incorrect." }, { status: 401 });
    }

    await createSession(Number(user.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return NextResponse.json({ success: false, error: "Could not sign in right now." }, { status: 500 });
  }
}
