import nextEnv from "@next/env";
import mysql from "mysql2/promise";

nextEnv.loadEnvConfig(process.cwd());

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run auth:promote-admin -- user@example.com");
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const [result] = await connection.execute(
    "UPDATE users SET role = 'ADMIN' WHERE email = ? AND is_active = 1",
    [email],
  );
  if (result.affectedRows === 0) {
    console.error("No active account found for that email. Register the user first.");
    process.exitCode = 1;
  } else {
    console.log("The active account now has ADMIN access. Sign out and sign back in to refresh its session.");
  }
} finally {
  await connection.end();
}
