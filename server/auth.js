/* Passwords, sessions and the sign-in guard. */
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.js";

const scryptAsync = promisify(scrypt);
const COOKIE = "queusc_session";
const TTL_MS = 8 * 60 * 60 * 1000;

// Stored as "scrypt$salt$hash", both hex.
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored).split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

function readCookie(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function cookieOptions(req) {
  return { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" };
}

export async function startSession(req, res, userId) {
  const token = randomBytes(32).toString("base64url");
  await pool.execute("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [sha256(token), userId, new Date(Date.now() + TTL_MS)]);
  res.cookie(COOKIE, token, { ...cookieOptions(req), maxAge: TTL_MS });
}

export async function endSession(req, res) {
  const token = readCookie(req);
  if (token) await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  res.clearCookie(COOKIE, cookieOptions(req));
}

export const publicUser = (row) => ({
  id: row.id, email: row.email, first: row.first_name, middle: row.middle_name, last: row.last_name,
  color: row.color, role: row.role, program: row.program_name || null, programCode: row.program_code,
  yearLevel: row.year_level
});

// Puts the signed-in user on req.user, or answers 401.
export async function requireUser(req, res, next) {
  const token = readCookie(req);
  if (token) {
    const [rows] = await pool.execute(
      `SELECT u.*, p.name AS program_name FROM sessions x
       JOIN users u ON u.id = x.user_id LEFT JOIN programs p ON p.code = u.program_code
       WHERE x.token_hash = ? AND x.expires_at > NOW()`, [sha256(token)]);
    if (rows.length) {
      req.user = rows[0];
      return next();
    }
  }
  res.status(401).json({ error: "Your session ended. Sign in again." });
}

// Allows only the given roles. Use after requireUser.
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "You don't have access to this page." });

export const purgeExpiredSessions = () => pool.execute("DELETE FROM sessions WHERE expires_at <= NOW()");

// At most 10 failed sign-ins per email and address every 15 minutes.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;

export function tooManyAttempts(key) {
  const entry = failures.get(key);
  if (!entry || entry.until < Date.now()) return false;
  return entry.count >= 10;
}

export function recordFailure(key) {
  const entry = failures.get(key);
  if (!entry || entry.until < Date.now()) failures.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else entry.count++;
}

export const clearFailures = (key) => failures.delete(key);
