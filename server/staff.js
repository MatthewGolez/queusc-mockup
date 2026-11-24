/* Faculty (class lists) and registrar (courses, groups, rooms, windows, payments, queue) APIs. */
import { Router } from "express";
import { pool, TERM } from "./db.js";
import { requireRole } from "./auth.js";
import { overlaps } from "../src/lib/schedule.js";
import { ApiError, getSettings, loadPayment, termName } from "./student.js";

export const faculty = Router();
export const registrar = Router();

/* Faculty: the groups they teach this term, with the students enrolled in each. */
faculty.get("/classes", requireRole("faculty", "registrar"), async (req, res) => {
  const [sections] = await pool.execute(
    `SELECT s.*, c.title, c.units, c.color FROM sections s JOIN courses c ON c.code = s.course_code
     WHERE s.term_key = ? AND s.faculty_id = ? ORDER BY s.course_code, s.group_no`, [TERM.key, req.user.id]);
  const [students] = await pool.execute(
    `SELECT es.section_id, u.id, u.first_name, u.middle_name, u.last_name, u.email, u.year_level, p.name AS program, e.label
     FROM enrollment_sections es JOIN enrollments e ON e.id = es.enrollment_id
     JOIN users u ON u.id = e.user_id LEFT JOIN programs p ON p.code = u.program_code
     JOIN sections s ON s.id = es.section_id
     WHERE s.term_key = ? AND s.faculty_id = ? ORDER BY u.last_name, u.first_name`, [TERM.key, req.user.id]);
  res.json({
    term: TERM.label,
    classes: sections.map((s) => ({
      id: s.id, code: s.course_code, title: s.title, units: s.units, color: s.color, group: s.group_no,
      days: s.days, start: s.start_time, end: s.end_time, room: s.room_code, enrolled: s.enrolled, capacity: s.capacity,
      students: students.filter((x) => x.section_id === s.id).map((x) => ({
        id: x.id, name: `${x.last_name}, ${x.first_name} ${x.middle_name}`.trim(), email: x.email,
        program: x.program, yearLevel: x.year_level, label: x.label
      }))
    }))
  });
});

/* Registrar */
registrar.use(requireRole("registrar"));

const DAY_CODES = ["M", "T", "W", "Th", "F", "S"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (v, max) => String(v ?? "").trim().slice(0, max);
const int = (v) => (Number.isInteger(Number(v)) && String(v).trim() !== "" ? Number(v) : NaN);

registrar.get("/overview", async (req, res) => {
  const [[programs], [prospectus], [prereqs], [rooms], [sections], [windows], [students], [payments], [[queue]], settings] =
    await Promise.all([
      pool.query("SELECT * FROM programs ORDER BY code"),
      pool.query(`SELECT p.*, c.title, c.units FROM prospectus p JOIN courses c ON c.code = p.course_code
                  ORDER BY p.program_code, p.year_level, FIELD(p.term, '1st', '2nd', 'Summer'), p.sort_order`),
      pool.query("SELECT * FROM prerequisites"),
      pool.query("SELECT r.*, (SELECT COUNT(*) FROM sections s WHERE s.room_code = r.code) AS used FROM rooms r ORDER BY r.code"),
      pool.execute(`SELECT s.*, (SELECT COUNT(*) FROM enrollment_sections es WHERE es.section_id = s.id) AS real_enrolled
                    FROM sections s WHERE s.term_key = ? ORDER BY s.course_code, s.group_no`, [TERM.key]),
      pool.execute("SELECT * FROM windows WHERE term_key = ? ORDER BY year_level", [TERM.key]),
      pool.query(`SELECT u.id, u.first_name, u.middle_name, u.last_name, u.email, u.year_level, u.program_code,
                  (SELECT label FROM enrollments e WHERE e.user_id = u.id AND e.term_key = ?) AS enrolled_label
                  FROM users u WHERE u.role = 'student' ORDER BY u.last_name`, [TERM.key]),
      pool.execute("SELECT * FROM payments WHERE term_key = ? ORDER BY paid_at DESC", [TERM.key]),
      pool.execute(`SELECT SUM(admitted_at IS NULL) AS waiting, SUM(admitted_at IS NOT NULL) AS active FROM queue WHERE term_key = ?`, [TERM.key]),
      getSettings()
    ]);
  const reqs = {};
  for (const r of prereqs) (reqs[r.course_code] ||= []).push(r.requires_code);
  const faculty = (await pool.query("SELECT id, first_name, last_name FROM users WHERE role = 'faculty' ORDER BY last_name"))[0];
  res.json({
    term: TERM,
    programs: programs.map((p) => ({ code: p.code, name: p.name, degree: p.degree, effectiveYear: p.effective_year })),
    courses: prospectus.map((p) => ({
      code: p.course_code, title: p.title, units: p.units, programCode: p.program_code, yearLevel: p.year_level,
      term: p.term, termName: termName(p.year_level, p.term), standing: p.standing, prereqs: reqs[p.course_code] || []
    })),
    rooms: rooms.map((r) => ({ code: r.code, building: r.building, capacity: r.capacity, used: Number(r.used) })),
    sections: sections.map((s) => ({
      id: s.id, code: s.course_code, group: s.group_no, days: s.days, start: s.start_time, end: s.end_time,
      room: s.room_code, faculty: s.faculty, facultyId: s.faculty_id, capacity: s.capacity, enrolled: s.enrolled,
      realEnrolled: Number(s.real_enrolled)
    })),
    windows: windows.map((w) => ({ yearLevel: w.year_level, opensAt: w.opens_at.toISOString(), closesAt: w.closes_at.toISOString() })),
    students: students.map((s) => {
      const paid = payments.find((p) => p.user_id === s.id && p.kind === "downpayment");
      return {
        id: s.id, name: `${s.last_name}, ${s.first_name} ${s.middle_name}`.trim(), email: s.email, yearLevel: s.year_level,
        programCode: s.program_code, enrolled: s.enrolled_label,
        payment: paid ? { amount: Number(paid.amount), reference: paid.reference, channel: paid.channel, paidAt: paid.paid_at.toISOString() } : null
      };
    }),
    faculty: faculty.map((f) => ({ id: f.id, name: `${f.last_name}, ${f.first_name}` })),
    queue: { waiting: Number(queue.waiting) || 0, active: Number(queue.active) || 0 },
    settings
  });
});

/* Courses and where they sit in a program's prospectus */
async function saveCourse(db, code, body, isNew) {
  const title = text(body.title, 120);
  const units = int(body.units);
  const year = int(body.yearLevel);
  const term = ["1st", "2nd", "Summer"].includes(body.term) ? body.term : null;
  const standing = body.standing === "" || body.standing == null ? null : int(body.standing);
  const program = text(body.programCode, 12);
  if (!title) throw new ApiError(400, "Enter the course title.");
  if (!(units >= 1 && units <= 9)) throw new ApiError(400, "Units must be from 1 to 9.");
  if (!(year >= 1 && year <= 5) || !term) throw new ApiError(400, "Choose the year level and term.");
  if (standing !== null && !(standing >= 2 && standing <= 5)) throw new ApiError(400, "Year standing must be from 2 to 5.");
  const prereqs = [...new Set((Array.isArray(body.prereqs) ? body.prereqs : []).map((c) => text(c, 20).toUpperCase()).filter(Boolean))];
  if (prereqs.includes(code)) throw new ApiError(400, "A course can't be its own prerequisite.");
  if (prereqs.length) {
    const [found] = await db.query("SELECT code FROM courses WHERE code IN (?)", [prereqs]);
    const missing = prereqs.filter((c) => !found.some((f) => f.code === c));
    if (missing.length) throw new ApiError(400, `No course with code ${missing.join(", ")}.`);
  }
  if (isNew) {
    const [[prog]] = await db.execute("SELECT code FROM programs WHERE code = ?", [program]);
    if (!prog) throw new ApiError(400, "Choose a program.");
    await db.execute("INSERT INTO courses (code, title, units) VALUES (?, ?, ?)", [code, title, units]);
    const [[{ next }]] = await db.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM prospectus WHERE program_code = ?", [program]);
    await db.execute("INSERT INTO prospectus VALUES (?, ?, ?, ?, ?, ?)", [program, code, year, term, next, standing]);
  } else {
    await db.execute("UPDATE courses SET title = ?, units = ? WHERE code = ?", [title, units, code]);
    await db.execute("UPDATE prospectus SET year_level = ?, term = ?, standing = ? WHERE course_code = ? AND program_code = ?",
      [year, term, standing, code, program]);
  }
  await db.execute("DELETE FROM prerequisites WHERE course_code = ?", [code]);
  for (const r of prereqs) await db.execute("INSERT INTO prerequisites VALUES (?, ?)", [code, r]);
}

const inTransaction = async (fn) => {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const out = await fn(db);
    await db.commit();
    return out;
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
};

registrar.post("/courses", async (req, res) => {
  const code = text(req.body?.code, 20).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 .-]*$/.test(code)) throw new ApiError(400, "Enter a course code such as CIS 2101.");
  const [[exists]] = await pool.execute("SELECT 1 FROM courses WHERE code = ?", [code]);
  if (exists) throw new ApiError(409, `${code} already exists.`);
  await inTransaction((db) => saveCourse(db, code, req.body, true));
  res.status(201).json({ ok: true });
});

registrar.put("/courses/:code", async (req, res) => {
  const [[exists]] = await pool.execute("SELECT 1 FROM courses WHERE code = ?", [req.params.code]);
  if (!exists) throw new ApiError(404, "That course no longer exists.");
  await inTransaction((db) => saveCourse(db, req.params.code, req.body, false));
  res.json({ ok: true });
});

registrar.delete("/courses/:code", async (req, res) => {
  const [[used]] = await pool.execute(
    `SELECT 1 FROM enrollment_sections es JOIN sections s ON s.id = es.section_id WHERE s.course_code = ? LIMIT 1`, [req.params.code]);
  if (used) throw new ApiError(409, "Students are enrolled in this course. Remove their enrollments first.");
  const [[graded]] = await pool.execute("SELECT 1 FROM grades WHERE course_code = ? LIMIT 1", [req.params.code]);
  if (graded) throw new ApiError(409, "Students have grades in this course, so it can't be deleted.");
  const [[blocked]] = await pool.execute(
    "SELECT 1 FROM block_sections bs JOIN sections s ON s.id = bs.section_id WHERE s.course_code = ? LIMIT 1", [req.params.code]);
  if (blocked) throw new ApiError(409, "This course is part of a block. Remove it from the block first.");
  await pool.execute("DELETE FROM courses WHERE code = ?", [req.params.code]);
  res.json({ ok: true });
});

/* Groups (sections) */
async function checkSection(body, cur = null) {
  const days = String(body.days ?? "").trim().split(/\s+/).filter(Boolean);
  if (!days.length || days.some((d) => !DAY_CODES.includes(d)) || new Set(days).size !== days.length) {
    throw new ApiError(400, "Days must be like M W, T Th, F or S.");
  }
  const start = text(body.start, 5);
  const end = text(body.end, 5);
  if (!TIME.test(start) || !TIME.test(end) || start >= end) throw new ApiError(400, "Enter a start time before the end time.");
  const capacity = int(body.capacity);
  if (!(capacity >= 1 && capacity <= 500)) throw new ApiError(400, "Capacity must be from 1 to 500.");
  const [[room]] = await pool.execute("SELECT * FROM rooms WHERE code = ?", [text(body.room, 40)]);
  if (!room) throw new ApiError(400, "Choose a room.");
  if (capacity > room.capacity) throw new ApiError(400, `${room.code} only seats ${room.capacity}.`);
  // The same room can't host two groups at once. Checked when the room or time changes.
  const same = cur && cur.room_code === room.code && cur.days === days.join(" ") && cur.start_time === start && cur.end_time === end;
  if (!same) {
    const mine = { days, start, end };
    const [others] = await pool.execute("SELECT * FROM sections WHERE term_key = ? AND room_code = ? AND id <> ?", [TERM.key, room.code, cur?.id ?? 0]);
    const clash = others.find((o) => overlaps(mine, { days: o.days.split(" "), start: o.start_time, end: o.end_time }));
    if (clash) throw new ApiError(409, `${room.code} is already used by ${clash.course_code} Group ${clash.group_no} at that time.`);
  }
  const facultyId = body.facultyId ? text(body.facultyId, 16) : null;
  let facultyName = text(body.faculty, 120) || "TBA";
  if (facultyId) {
    const [[f]] = await pool.execute("SELECT first_name, last_name FROM users WHERE id = ? AND role = 'faculty'", [facultyId]);
    if (!f) throw new ApiError(400, "Choose a faculty member from the list.");
    facultyName = `${f.last_name}, ${f.first_name}`;
  }
  return { days: days.join(" "), start, end, capacity, room: room.code, facultyId, facultyName };
}

registrar.post("/sections", async (req, res) => {
  const code = text(req.body?.code, 20);
  const [[course]] = await pool.execute("SELECT code FROM courses WHERE code = ?", [code]);
  if (!course) throw new ApiError(400, "Choose a course.");
  const s = await checkSection(req.body);
  await inTransaction(async (db) => {
    const [[{ next }]] = await db.execute(
      "SELECT COALESCE(MAX(group_no), 0) + 1 AS next FROM sections WHERE term_key = ? AND course_code = ? FOR UPDATE", [TERM.key, code]);
    await db.execute(
      `INSERT INTO sections (term_key, course_code, group_no, days, start_time, end_time, room_code, faculty, faculty_id, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [TERM.key, code, next, s.days, s.start, s.end, s.room, s.facultyName, s.facultyId, s.capacity]);
  });
  res.status(201).json({ ok: true });
});

registrar.put("/sections/:id", async (req, res) => {
  const [[cur]] = await pool.execute("SELECT * FROM sections WHERE id = ?", [req.params.id]);
  if (!cur) throw new ApiError(404, "That group no longer exists.");
  const s = await checkSection(req.body, cur);
  if (s.capacity < cur.enrolled) throw new ApiError(400, `${cur.enrolled} seats are already taken. Capacity can't go below that.`);
  const [[taken]] = await pool.execute("SELECT 1 FROM enrollment_sections WHERE section_id = ? LIMIT 1", [cur.id]);
  const moved = s.days !== cur.days || s.start !== cur.start_time || s.end !== cur.end_time;
  if (taken && moved) throw new ApiError(409, "Students are enrolled in this group, so its schedule can't change. Add a new group instead.");
  await pool.execute(
    "UPDATE sections SET days = ?, start_time = ?, end_time = ?, room_code = ?, faculty = ?, faculty_id = ?, capacity = ? WHERE id = ?",
    [s.days, s.start, s.end, s.room, s.facultyName, s.facultyId, s.capacity, cur.id]);
  res.json({ ok: true });
});

registrar.delete("/sections/:id", async (req, res) => {
  const [[taken]] = await pool.execute("SELECT 1 FROM enrollment_sections WHERE section_id = ? LIMIT 1", [req.params.id]);
  if (taken) throw new ApiError(409, "Students are enrolled in this group, so it can't be deleted.");
  const [[blocked]] = await pool.execute("SELECT 1 FROM block_sections WHERE section_id = ? LIMIT 1", [req.params.id]);
  if (blocked) throw new ApiError(409, "This group is part of a block, so it can't be deleted.");
  await pool.execute("DELETE FROM sections WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

/* Rooms */
function checkRoom(body) {
  const building = text(body.building, 80);
  const capacity = int(body.capacity);
  if (!(capacity >= 1 && capacity <= 500)) throw new ApiError(400, "Capacity must be from 1 to 500.");
  return { building, capacity };
}

registrar.post("/rooms", async (req, res) => {
  const code = text(req.body?.code, 40);
  if (!code) throw new ApiError(400, "Enter the room code, such as LB446 TC.");
  const r = checkRoom(req.body);
  const [[exists]] = await pool.execute("SELECT 1 FROM rooms WHERE code = ?", [code]);
  if (exists) throw new ApiError(409, `${code} already exists.`);
  await pool.execute("INSERT INTO rooms VALUES (?, ?, ?)", [code, r.building, r.capacity]);
  res.status(201).json({ ok: true });
});

registrar.put("/rooms/:code", async (req, res) => {
  const r = checkRoom(req.body);
  const [[big]] = await pool.execute("SELECT MAX(capacity) AS cap FROM sections WHERE room_code = ?", [req.params.code]);
  if (big.cap && r.capacity < big.cap) throw new ApiError(400, `A group in this room seats ${big.cap}. Lower that group first.`);
  const [u] = await pool.execute("UPDATE rooms SET building = ?, capacity = ? WHERE code = ?", [r.building, r.capacity, req.params.code]);
  if (!u.affectedRows) throw new ApiError(404, "That room no longer exists.");
  res.json({ ok: true });
});

registrar.delete("/rooms/:code", async (req, res) => {
  const [[used]] = await pool.execute("SELECT 1 FROM sections WHERE room_code = ? LIMIT 1", [req.params.code]);
  if (used) throw new ApiError(409, "Groups meet in this room. Move them first.");
  await pool.execute("DELETE FROM rooms WHERE code = ?", [req.params.code]);
  res.json({ ok: true });
});

/* Enrollment windows */
registrar.put("/windows/:year", async (req, res) => {
  const year = int(req.params.year);
  const opens = new Date(req.body?.opensAt);
  const closes = new Date(req.body?.closesAt);
  if (!(year >= 1 && year <= 5)) throw new ApiError(400, "Unknown year level.");
  if (isNaN(opens) || isNaN(closes) || opens >= closes) throw new ApiError(400, "The window must open before it closes.");
  await pool.execute(
    "INSERT INTO windows VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE opens_at = VALUES(opens_at), closes_at = VALUES(closes_at)",
    [TERM.key, year, opens, closes]);
  res.json({ ok: true });
});

/* Downpayments */
registrar.post("/payments", async (req, res) => {
  const userId = text(req.body?.userId, 16);
  const amount = Number(req.body?.amount);
  const reference = text(req.body?.reference, 40).toUpperCase();
  const channel = text(req.body?.channel, 80);
  const [[student]] = await pool.execute("SELECT id FROM users WHERE id = ? AND role = 'student'", [userId]);
  if (!student) throw new ApiError(400, "Choose a student.");
  if (!(amount > 0 && amount < 1e7)) throw new ApiError(400, "Enter the amount paid.");
  if (!reference) throw new ApiError(400, "Enter the receipt or reference number.");
  if (!channel) throw new ApiError(400, "Enter how it was paid.");
  if (await loadPayment(userId)) throw new ApiError(409, "This student's downpayment is already recorded.");
  try {
    await pool.execute("INSERT INTO payments (user_id, term_key, kind, amount, reference, channel) VALUES (?, ?, 'downpayment', ?, ?, ?)",
      [userId, TERM.key, amount, reference, channel]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw new ApiError(409, `Reference ${reference} is already used.`);
    throw err;
  }
  res.status(201).json({ ok: true });
});

/* Settings: queue size, turn length, downpayment amount */
registrar.put("/settings", async (req, res) => {
  const cap = int(req.body?.queueCapacity);
  const turn = int(req.body?.turnMinutes);
  const amount = Number(req.body?.downpaymentAmount);
  if (!(cap >= 1 && cap <= 1000)) throw new ApiError(400, "Students enrolling at once must be from 1 to 1000.");
  if (!(turn >= 1 && turn <= 120)) throw new ApiError(400, "Turn length must be from 1 to 120 minutes.");
  if (!(amount > 0 && amount < 1e7)) throw new ApiError(400, "Enter the downpayment amount.");
  for (const [k, v] of [["queue_capacity", cap], ["turn_minutes", turn], ["downpayment_amount", amount]]) {
    await pool.execute("INSERT INTO settings VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [k, String(v)]);
  }
  res.json({ ok: true });
});
