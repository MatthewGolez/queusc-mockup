/* Creates the tables and loads the sample data. Run with `npm run db:setup`.
   Add --reset to drop every QueuSC table first (this deletes all enrollments). */
import { readFile } from "node:fs/promises";
import { pool, TERM } from "./db.js";
import { hashPassword } from "./auth.js";
import * as seed from "./seed-data.js";

const TABLES = ["queue", "settings", "enrollment_sections", "enrollments", "advising_courses", "advising", "payments",
  "windows", "block_sections", "blocks", "sections", "rooms", "grades", "prerequisites", "prospectus", "courses",
  "sessions", "users", "programs"];

const idOf = (code) => code.toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set SEED_PASSWORD in .env (8 characters or more) first.");

  const db = await pool.getConnection();
  try {
    if (process.argv.includes("--reset")) {
      await db.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const t of TABLES) await db.query(`DROP TABLE IF EXISTS ${t}`);
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log("Dropped existing tables.");
    }

    const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
    for (const stmt of schema.split(/;\s*$/m).map((s) => s.replace(/^\s*--.*$/gm, "").trim()).filter(Boolean)) {
      await db.query(stmt);
    }

    const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM users");
    if (n > 0) {
      console.log("Tables are ready. Sample data is already loaded (use --reset to start over).");
      return;
    }

    await db.beginTransaction();
    const p = seed.program;
    await db.execute("INSERT INTO programs VALUES (?, ?, ?, ?)", [p.code, p.name, p.degree, p.effectiveYear]);

    // Courses, prospectus and prerequisites.
    let order = 0;
    let extra = 0;
    for (const t of seed.terms) {
      for (const [code, title, units, req] of t.courses) {
        const color = seed.COLORS[code] || seed.PALETTE[extra++ % seed.PALETTE.length];
        await db.execute("INSERT INTO courses VALUES (?, ?, ?, ?)", [code, title, units, color]);
        await db.execute("INSERT INTO prospectus VALUES (?, ?, ?, ?, ?, ?)",
          [p.code, code, t.year, t.term, order++, typeof req === "string" ? parseInt(req, 10) : null]);
      }
    }
    for (const t of seed.terms) {
      for (const [code, , , req] of t.courses) {
        for (const r of Array.isArray(req) ? req : []) await db.execute("INSERT INTO prerequisites VALUES (?, ?)", [code, r]);
      }
    }

    // Users. Every sample account gets SEED_PASSWORD.
    const hash = await hashPassword(password);
    const add = (u, role, extraCols = {}) => db.execute(
      `INSERT INTO users (id, email, first_name, middle_name, last_name, color, role, password_hash, program_code, year_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.email, u.first, u.middle, u.last, u.color, role, hash, extraCols.program ?? null, extraCols.year ?? null]);
    for (const u of seed.faculty) await add(u, "faculty");
    for (const u of seed.registrar) await add(u, "registrar");
    for (const u of seed.students) await add(u, "student", { program: p.code, year: seed.YEAR_LEVEL });

    // Grades for every course in the terms the students have passed.
    const passed = seed.terms.slice(0, seed.PASSED_TERMS);
    const GRADES = [1.2, 1.5, 1.7, 1.9, 2.1, 1.4, 2.4, 1.6];
    const TERM_KEYS = ["2025-2026-1", "2025-2026-2", "2025-2026-S"];
    for (const [si, u] of seed.students.entries()) {
      for (const [ti, t] of passed.entries()) {
        const termKey = TERM_KEYS[ti];
        for (const [ci, [code]] of t.courses.entries()) {
          await db.execute("INSERT INTO grades VALUES (?, ?, ?, ?)", [u.id, code, termKey, GRADES[(si * 3 + ci + ti) % GRADES.length]]);
        }
      }
    }

    // Groups for every course in the prospectus, with their rooms.
    const sectionId = {};
    const rooms = new Map();
    for (const t of seed.terms) {
      for (const [code, , units] of t.courses) {
        const groups = seed.handGroups[idOf(code)] || seed.generateGroups(code, units);
        for (const [g, days, start, end, room, fac, enrolled, cap] of groups) {
          if (!rooms.has(room)) {
            rooms.set(room, Math.max(cap, 40));
            await db.execute("INSERT INTO rooms VALUES (?, ?, ?)",
              [room, room.startsWith("Gym") ? "Gymnasium" : "Talamban Campus, Learning Resource Center", Math.max(cap, 40)]);
          }
          const teacher = seed.faculty.find((f) => fac.includes(f.sectionName));
          const [r] = await db.execute(
            `INSERT INTO sections (term_key, course_code, group_no, days, start_time, end_time, room_code, faculty, faculty_id, capacity, enrolled)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [TERM.key, code, g, days, start, end, room, fac, teacher?.id ?? null, cap, enrolled]);
          sectionId[`${code}#${g}`] = r.insertId;
        }
      }
    }

    // Blocks A and B for 2nd Year.
    for (const [label, b] of Object.entries(seed.blocks)) {
      const [r] = await db.execute(
        "INSERT INTO blocks (term_key, program_code, year_level, label, capacity, enrolled) VALUES (?, ?, ?, ?, ?, ?)",
        [TERM.key, p.code, seed.YEAR_LEVEL, label, b.cap, b.enrolled]);
      for (const [code, g] of Object.entries(b.picks)) {
        await db.execute("INSERT INTO block_sections VALUES (?, ?)", [r.insertId, sectionId[`${code}#${g}`]]);
      }
    }

    // Windows: every year level opened at 8:00 AM (today, or yesterday if it's earlier than that) and
    // closes in 30 days at 6:00 PM, so the demo stays open. The registrar can change them.
    const opens = new Date();
    opens.setHours(8, 0, 0, 0);
    if (opens > Date.now()) opens.setDate(opens.getDate() - 1);
    const closes = new Date(opens.getTime() + 30 * 86400000);
    closes.setHours(18, 0, 0, 0);
    for (const year of [1, 2, 3, 4]) await db.execute("INSERT INTO windows VALUES (?, ?, ?, ?)", [TERM.key, year, opens, closes]);

    // Downpayments: Matthew has paid. Caroline and Sebastian haven't, so the registrar can record theirs.
    await db.execute("INSERT INTO payments (user_id, term_key, kind, amount, reference, channel, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["22103502", TERM.key, "downpayment", seed.DOWNPAYMENT, "DP-2026-118273", "Over the counter, Business Office", new Date()]);

    const settings = { queue_capacity: "50", turn_minutes: "15", downpayment_amount: String(seed.DOWNPAYMENT) };
    for (const [k, v] of Object.entries(settings)) await db.execute("INSERT INTO settings VALUES (?, ?)", [k, v]);

    await db.commit();
    console.log(`Sample data loaded. Every sample account's password is the SEED_PASSWORD from .env.`);
  } catch (err) {
    await db.rollback().catch(() => {});
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Setup failed: ${err.message}`);
  process.exit(1);
});
