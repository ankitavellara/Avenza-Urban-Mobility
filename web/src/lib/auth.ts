import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import pool from "@/lib/db";

export type UserRole = "USER" | "ADMIN";
export type AuthUser = { id: number; name: string; email: string; role: UserRole };

const cookieName = "avenza_session";
const sessionDuration = 60 * 60 * 8;

function signingKey() {
  const value = process.env.SESSION_SECRET;
  if (!value || Buffer.byteLength(value) < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 bytes.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${sessionDuration}s`)
    .sign(signingKey());

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: sessionDuration,
  });
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;

    const [rows] = await pool.execute(
      "SELECT user_id AS id, name, email, role FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1",
      [id],
    );
    const row = (rows as Array<{ id: number; name: string; email: string; role: UserRole }>)[0];
    if (!row || (row.role !== "USER" && row.role !== "ADMIN")) return null;
    return { id: Number(row.id), name: row.name, email: row.email, role: row.role };
  } catch {
    return null;
  }
}

type AuthCheck = { user: AuthUser; response: null } | { user: null; response: NextResponse };

export async function requireUser(): Promise<AuthCheck> {
  const user = await getAuthenticatedUser();
  return user
    ? { user, response: null }
    : { user: null, response: NextResponse.json({ success: false, error: "Sign in is required." }, { status: 401 }) };
}

export async function requireAdmin(): Promise<AuthCheck> {
  const check = await requireUser();
  if (!check.user) return check;
  return check.user.role === "ADMIN"
    ? check
    : { user: null, response: NextResponse.json({ success: false, error: "Administrator access is required." }, { status: 403 }) };
}
