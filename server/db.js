/* MariaDB connection pool. Settings come from .env (see .env.example). */
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

for (const key of ["DB_USER", "DB_PASSWORD", "DB_NAME"]) {
  if (!process.env[key]) throw new Error(`${key} is missing. Copy .env.example to .env and fill it in.`);
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  multipleStatements: false
});

// The term students are enrolling for now.
export const TERM = { key: "2026-2027-1", term: "1st", label: "1st Semester, A.Y. 2026-2027" };
export const MAX_UNITS = 30;
