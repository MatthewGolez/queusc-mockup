/* Student API: catalog and status, advising, the enrollment queue, live seats and enrolling. */
import { Router } from "express";
import { pool, TERM, MAX_UNITS } from "./db.js";
import { requireRole } from "./auth.js";
import { conflicts } from "../src/lib/schedule.js";

export const idOf = (code) => code.toLowerCase().replace(/[^a-z0-9]/g, "");
const YEARS = ["", "1st", "2nd", "3rd", "4th", "5th"];
export const termName = (year, term) => (term === "Summer" ? `${YEARS[year]} Year, Summer` : `${YEARS[year]} Year, ${term} Semester`);
export const PASSING = 3.0;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function getSettings(db = pool) {
  const [rows] = await db.query("SELECT name, value FROM settings");
  const s = Object.fromEntries(rows.map((r) => [r.name, r.value]));
  return {
    queueCapacity: Math.max(1, Number(s.queue_capacity) || 50),
    turnMinutes: Math.max(1, Number(s.turn_minutes) || 15),
    downpaymentAmount: Number(s.downpayment_amount) || 3000
  };
}

const tuple = (s) => [s.group_no, s.days, s.start_time, s.end_time, s.room_code, s.faculty, s.enrolled, s.capacity];

// A course in one group, in the shape the timetable and PDFs use.
export const sectionView = (course, s) => ({
  id: idOf(course.code), code: course.code, title: course.title, units: course.units, color: course.color,
  group: s.group_no, days: s.days.split(" "), start: s.start_time, end: s.end_time, room: s.room_code,
  faculty: s.faculty, enrolled: s.enrolled, cap: s.capacity
});

// Everything about a student's curriculum: each course with its status, and the groups on offer.
export async function loadCatalog(user, db = pool) {
  const [rows] = await db.execute(
    `SELECT c.code, c.title, c.units, c.color, p.year_level, p.term, p.standing
     FROM prospectus p JOIN courses c ON c.code = p.course_code
     WHERE p.program_code = ? ORDER BY p.year_level, FIELD(p.term, '1st', '2nd', 'Summer'), p.sort_order`,
    [user.program_code]);
  const [reqRows] = await db.query("SELECT course_code, requires_code FROM prerequisites");
  const [gradeRows] = await db.execute("SELECT course_code, grade FROM grades WHERE user_id = ?", [user.id]);
  const [sectionRows] = await db.execute("SELECT * FROM sections WHERE term_key = ? ORDER BY course_code, group_no", [TERM.key]);

  const reqs = {};
  for (const r of reqRows) (reqs[r.course_code] ||= []).push(r.requires_code);
  const grades = Object.fromEntries(gradeRows.map((g) => [g.course_code, Number(g.grade)]));
  const passed = new Set(gradeRows.filter((g) => Number(g.grade) <= PASSING).map((g) => g.course_code));
  const sections = {};
  for (const s of sectionRows) (sections[s.course_code] ||= []).push(s);

  const terms = [];
  const catalog = rows.map((r) => {
    let ti = terms.findIndex((t) => t.year === r.year_level && t.term === r.term);
    if (ti < 0) ti = terms.push({ year: r.year_level, term: r.term, name: termName(r.year_level, r.term) }) - 1;
    const req = r.standing ? `${YEARS[r.standing]}` : reqs[r.code] || null;
    let status;
    let reason = "";
    if (passed.has(r.code)) status = "passed";
    else if (r.year_level === user.year_level && r.term === TERM.term) status = "current";
    else if (r.standing && r.standing > user.year_level) {
      status = "locked";
      reason = `Needs ${YEARS[r.standing]} year standing`;
    } else {
      const missing = (reqs[r.code] || []).filter((c) => !passed.has(c));
      status = missing.length ? "locked" : "available";
      if (missing.length) reason = `Needs ${missing.join(" and ")}`;
    }
    if (status === "available" && !sections[r.code]?.length) {
      status = "locked";
      reason = "Not offered this term";
    }
    const course = {
      id: idOf(r.code), code: r.code, title: r.title, units: r.units, color: r.color, req,
      termIndex: ti, termName: terms[ti].name, status, reason, grade: grades[r.code] ?? null
    };
    if (status === "current" || status === "available") course.groups = (sections[r.code] || []).map(tuple);
    return course;
  });
  const currentTermIndex = terms.findIndex((t) => t.year === user.year_level && t.term === TERM.term);
  return { terms, catalog, currentTermIndex, sections: sectionRows };
}

const offerable = (catalog) => catalog.filter((c) => (c.status === "current" || c.status === "available") && c.groups?.length);

async function loadBlocks(user, db = pool) {
  const [rows] = await db.execute(
    `SELECT b.id, b.label, b.capacity, b.enrolled, s.course_code, s.group_no
     FROM blocks b JOIN block_sections bs ON bs.block_id = b.id JOIN sections s ON s.id = bs.section_id
     WHERE b.term_key = ? AND b.program_code = ? AND b.year_level = ? ORDER BY b.label`,
    [TERM.key, user.program_code, user.year_level]);
  const blocks = {};
  for (const r of rows) {
    blocks[r.label] ||= { id: r.id, picks: {}, enrolled: r.enrolled, cap: r.capacity };
    blocks[r.label].picks[idOf(r.course_code)] = r.group_no;
  }
  return blocks;
}

export async function loadWindow(yearLevel, db = pool) {
  const [[w]] = await db.execute("SELECT opens_at, closes_at FROM windows WHERE term_key = ? AND year_level = ?", [TERM.key, yearLevel]);
  return w ? { opensAt: w.opens_at.toISOString(), closesAt: w.closes_at.toISOString() } : null;
}

const windowState = (w) => {
  const now = Date.now();
  if (!w) return "none";
  if (now < Date.parse(w.opensAt)) return "upcoming";
  return now < Date.parse(w.closesAt) ? "open" : "closed";
};

export async function loadPayment(userId, db = pool) {
  const [[p]] = await db.execute(
    "SELECT amount, reference, channel, paid_at FROM payments WHERE user_id = ? AND term_key = ? AND kind = 'downpayment' ORDER BY paid_at LIMIT 1",
    [userId, TERM.key]);
  return p ? { amount: Number(p.amount), reference: p.reference, channel: p.channel, paidAt: p.paid_at.toISOString() } : null;
}

export async function loadAdvising(userId, db = pool) {
  const [[a]] = await db.execute("SELECT submitted_at FROM advising WHERE user_id = ? AND term_key = ?", [userId, TERM.key]);
  if (!a) return null;
  const [courses] = await db.execute("SELECT course_code FROM advising_courses WHERE user_id = ? AND term_key = ?", [userId, TERM.key]);
  return { submittedAt: a.submitted_at.toISOString(), courses: courses.map((c) => c.course_code) };
}

export async function loadEnrollment(userId, db = pool) {
  const [[e]] = await db.execute("SELECT id, label, created_at FROM enrollments WHERE user_id = ? AND term_key = ?", [userId, TERM.key]);
  if (!e) return null;
  const [rows] = await db.execute(
    `SELECT s.*, c.title, c.units, c.color FROM enrollment_sections es
     JOIN sections s ON s.id = es.section_id JOIN courses c ON c.code = s.course_code
     WHERE es.enrollment_id = ? ORDER BY s.course_code`, [e.id]);
  return {
    label: e.label, enrolledAt: e.created_at.toISOString(),
    load: rows.map((s) => sectionView({ code: s.course_code, title: s.title, units: s.units, color: s.color }, s))
  };
}

async function loadWindows(db = pool) {
  const [rows] = await db.execute("SELECT * FROM windows WHERE term_key = ? ORDER BY year_level", [TERM.key]);
  return rows.map((w) => ({ yearLevel: w.year_level, opensAt: w.opens_at.toISOString(), closesAt: w.closes_at.toISOString() }));
}

/* The enrollment queue. A lock keeps two requests from admitting the same free turn. */
const WAIT_TIMEOUT = 45; // seconds without a check-in before a waiting student leaves the line
const TURN_IDLE = 90; // seconds without a check-in before an admitted student loses the turn

export async function queueTick(userId, { join = true } = {}) {
  const db = await pool.getConnection();
  try {
    const [[lock]] = await db.query("SELECT GET_LOCK('queusc_queue', 10) AS ok");
    if (!lock.ok) throw new ApiError(503, "The enrollment line is busy. Try again in a moment.");
    try {
      const { queueCapacity, turnMinutes } = await getSettings(db);
      await db.execute(
        `DELETE FROM queue WHERE term_key = ? AND (
           (admitted_at IS NULL AND last_seen < NOW(3) - INTERVAL ${WAIT_TIMEOUT} SECOND) OR
           (admitted_at IS NOT NULL AND (expires_at < NOW(3) OR last_seen < NOW(3) - INTERVAL ${TURN_IDLE} SECOND)))`, [TERM.key]);
      if (join) {
        await db.execute(
          `INSERT INTO queue (user_id, term_key, joined_at, last_seen) VALUES (?, ?, NOW(3), NOW(3))
           ON DUPLICATE KEY UPDATE last_seen = NOW(3)`, [userId, TERM.key]);
      }
      const [[{ active }]] = await db.execute("SELECT COUNT(*) AS active FROM queue WHERE term_key = ? AND admitted_at IS NOT NULL", [TERM.key]);
      const free = queueCapacity - active;
      if (free > 0) {
        await db.execute(
          `UPDATE queue SET admitted_at = NOW(3), expires_at = NOW(3) + INTERVAL ${turnMinutes} MINUTE
           WHERE term_key = ? AND admitted_at IS NULL ORDER BY joined_at, user_id LIMIT ${free}`, [TERM.key]);
      }
      return await queueStatus(userId, db);
    } finally {
      await db.query("SELECT RELEASE_LOCK('queusc_queue')");
    }
  } finally {
    db.release();
  }
}

async function queueStatus(userId, db) {
  const [[me]] = await db.execute("SELECT * FROM queue WHERE user_id = ? AND term_key = ?", [userId, TERM.key]);
  if (!me) return { status: "out" };
  if (me.admitted_at) return { status: "admitted", expiresAt: me.expires_at.toISOString() };
  const [[{ ahead }]] = await db.execute(
    `SELECT COUNT(*) AS ahead FROM queue WHERE term_key = ? AND admitted_at IS NULL
     AND (joined_at < ? OR (joined_at = ? AND user_id < ?))`, [TERM.key, me.joined_at, me.joined_at, userId]);
  const [[{ waiting }]] = await db.execute("SELECT COUNT(*) AS waiting FROM queue WHERE term_key = ? AND admitted_at IS NULL", [TERM.key]);
  return { status: "waiting", position: ahead + 1, waiting };
}

export const router = Router();
router.use(requireRole("student"));

// Everything the student pages need, in one request.
router.get("/student", async (req, res) => {
  const u = req.user;
  const [{ terms, catalog, currentTermIndex }, blocks, window, windows, payment, advising, enrollment, settings, [[program]]] =
    await Promise.all([
      loadCatalog(u), loadBlocks(u), loadWindow(u.year_level), loadWindows(), loadPayment(u.id), loadAdvising(u.id),
      loadEnrollment(u.id), getSettings(), pool.execute("SELECT * FROM programs WHERE code = ?", [u.program_code])
    ]);
  for (const b of Object.values(blocks)) delete b.id;
  res.json({
    term: { key: TERM.key, label: TERM.label }, maxUnits: MAX_UNITS,
    program: program && { code: program.code, name: program.name, degree: program.degree, effectiveYear: program.effective_year },
    terms, catalog, currentTermIndex, blocks, window, windows, payment, advising, enrollment,
    downpaymentAmount: settings.downpaymentAmount, serverTime: new Date().toISOString()
  });
});

// Live seat counts for this term's groups and blocks.
router.get("/seats", async (req, res) => {
  const [sections] = await pool.execute("SELECT course_code, group_no, enrolled FROM sections WHERE term_key = ?", [TERM.key]);
  const blocks = await loadBlocks(req.user);
  const out = {};
  for (const s of sections) (out[idOf(s.course_code)] ||= {})[s.group_no] = s.enrolled;
  res.json({ sections: out, blocks: Object.fromEntries(Object.entries(blocks).map(([k, b]) => [k, b.enrolled])) });
});

// Save the courses the student will take this term. They can change them until they enroll.
router.post("/advising", async (req, res) => {
  const u = req.user;
  const ids = Array.isArray(req.body?.courses) ? [...new Set(req.body.courses.map(String))] : [];
  if (await loadEnrollment(u.id)) throw new ApiError(409, "You're already enrolled this term.");
  const window = await loadWindow(u.year_level);
  if (windowState(window) === "closed") throw new ApiError(403, "Your enrollment window has closed.");
  const { catalog } = await loadCatalog(u);
  const allowed = new Map(offerable(catalog).map((c) => [c.id, c]));
  const picked = ids.map((id) => allowed.get(id));
  if (!ids.length) throw new ApiError(400, "Select at least one course.");
  if (picked.some((c) => !c)) throw new ApiError(400, "One of those courses isn't open to you. Refresh the page and try again.");
  const units = picked.reduce((s, c) => s + c.units, 0);
  if (units > MAX_UNITS) throw new ApiError(400, `That's ${units} units. The limit is ${MAX_UNITS}.`);

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    await db.execute(
      "INSERT INTO advising (user_id, term_key, submitted_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE submitted_at = NOW()",
      [u.id, TERM.key]);
    await db.execute("DELETE FROM advising_courses WHERE user_id = ? AND term_key = ?", [u.id, TERM.key]);
    for (const c of picked) await db.execute("INSERT INTO advising_courses VALUES (?, ?, ?)", [u.id, TERM.key, c.code]);
    await db.commit();
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
  res.json({ advising: await loadAdvising(u.id) });
});

// Join the enrollment line, or check in while waiting. Students must reach the front before they can enroll.
router.post("/queue", async (req, res) => {
  const u = req.user;
  const state = await enrollGate(u);
  if (state) throw new ApiError(403, state);
  res.json(await queueTick(u.id));
});

// Why the student can't enroll yet, or null when they can.
async function enrollGate(u) {
  const [window, payment, advising, enrollment] = await Promise.all([
    loadWindow(u.year_level), loadPayment(u.id), loadAdvising(u.id), loadEnrollment(u.id)]);
  if (enrollment) return "You're already enrolled this term.";
  const ws = windowState(window);
  if (ws === "upcoming") return "Your enrollment window hasn't opened yet.";
  if (ws !== "open") return "Your enrollment window has closed.";
  if (!payment) return "Pay your downpayment before enrolling.";
  if (!advising?.courses.length) return "Choose your courses first.";
  return null;
}

// Enroll in a block, or non-block with a group for each advised course.
router.post("/enroll", async (req, res) => {
  const u = req.user;
  const gate = await enrollGate(u);
  if (gate) throw new ApiError(403, gate);
  const [[turn]] = await pool.execute(
    "SELECT 1 FROM queue WHERE user_id = ? AND term_key = ? AND admitted_at IS NOT NULL AND expires_at > NOW(3)", [u.id, TERM.key]);
  if (!turn) throw new ApiError(409, "Your turn in the enrollment line ended. Rejoin the line to continue.");

  const advising = await loadAdvising(u.id);
  const advised = new Set(advising.courses);
  const { catalog, sections } = await loadCatalog(u);
  const courseByCode = Object.fromEntries(catalog.map((c) => [c.code, c]));
  const { mode } = req.body || {};
  let chosen;
  let label;
  let block = null;

  if (mode === "block") {
    const blocks = await loadBlocks(u);
    block = blocks[req.body.block];
    if (!block) throw new ApiError(400, "Choose Block A or Block B.");
    const current = catalog.filter((c) => c.status === "current").map((c) => c.code);
    if (current.length !== advised.size || !current.every((c) => advised.has(c))) {
      throw new ApiError(400, "Blocks run exactly this term's curriculum. Advise those courses, and only those, to join one.");
    }
    chosen = sections.filter((s) => block.picks[idOf(s.course_code)] === s.group_no);
    label = `Block ${req.body.block}`;
  } else if (mode === "custom") {
    const groups = req.body.groups || {};
    const byId = Object.fromEntries([...advised].map((code) => [idOf(code), code]));
    if (Object.keys(groups).length !== advised.size || !Object.keys(groups).every((id) => byId[id])) {
      throw new ApiError(400, "Choose one group for each course you advised.");
    }
    chosen = Object.entries(groups).map(([id, g]) => {
      const s = sections.find((x) => x.course_code === byId[id] && x.group_no === Number(g));
      if (!s) throw new ApiError(400, `${byId[id]} has no Group ${g}.`);
      return s;
    });
    const views = chosen.map((s) => sectionView(courseByCode[s.course_code], s));
    const clash = conflicts(views)[0];
    if (clash) throw new ApiError(400, `${clash[0].code} and ${clash[1].code} overlap. Pick different groups.`);
    label = "Non-block";
  } else {
    throw new ApiError(400, "Choose Block or Non-block.");
  }
  const units = chosen.reduce((s, x) => s + courseByCode[x.course_code].units, 0);
  if (units > MAX_UNITS) throw new ApiError(400, `That's ${units} units. The limit is ${MAX_UNITS}.`);

  // Take the seats in one transaction. A seat is only taken while one is free, so two students can't get the last one.
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    if (block) {
      const [r] = await db.execute("UPDATE blocks SET enrolled = enrolled + 1 WHERE id = ? AND enrolled < capacity", [block.id]);
      if (!r.affectedRows) throw new ApiError(409, `${label} just filled up. Choose the other block or go non-block.`);
    } else {
      for (const s of [...chosen].sort((a, b) => a.id - b.id)) {
        const [r] = await db.execute("UPDATE sections SET enrolled = enrolled + 1 WHERE id = ? AND enrolled < capacity", [s.id]);
        if (!r.affectedRows) throw new ApiError(409, `${s.course_code} Group ${s.group_no} just filled up. Pick another group.`);
      }
    }
    const [e] = await db.execute("INSERT INTO enrollments (user_id, term_key, label, block_id) VALUES (?, ?, ?, ?)",
      [u.id, TERM.key, label, block?.id ?? null]);
    for (const s of chosen) await db.execute("INSERT INTO enrollment_sections VALUES (?, ?)", [e.insertId, s.id]);
    await db.execute("DELETE FROM queue WHERE user_id = ? AND term_key = ?", [u.id, TERM.key]);
    await db.commit();
  } catch (err) {
    await db.rollback();
    if (err.code === "ER_DUP_ENTRY") throw new ApiError(409, "You're already enrolled this term.");
    throw err;
  } finally {
    db.release();
  }
  res.json({ enrollment: await loadEnrollment(u.id) });
});
