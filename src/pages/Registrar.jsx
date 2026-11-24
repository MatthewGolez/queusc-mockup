import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { fmtTime } from "../lib/schedule.js";
import { fmtDate } from "../state/Enrollment.jsx";
import { useToast } from "../state/Toast.jsx";

const TABS = [
  ["payments", "Downpayments"],
  ["windows", "Windows"],
  ["courses", "Courses"],
  ["groups", "Groups"],
  ["rooms", "Rooms"],
  ["line", "Enrollment line"]
];
const YEARS = ["", "1st", "2nd", "3rd", "4th", "5th"];
const peso = (n) => `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

// ISO time <-> the value of an <input type="datetime-local"> in the browser's time zone.
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v) => new Date(v).toISOString();

export default function Registrar() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("payments");
  const toast = useToast();

  const reload = useCallback(() => api("/registrar/overview").then(setData).catch((err) => setError(err.message)), []);
  useEffect(() => { reload(); }, [reload]);

  // Runs a change, then reloads. Returns true when it worked.
  const run = useCallback(async (path, method, body, done) => {
    try {
      await api(path, { method, body });
      toast(done);
      await reload();
      return true;
    } catch (err) {
      toast(err.message);
      return false;
    }
  }, [reload, toast]);

  if (error) return <div className="page-state" role="alert"><p>{error}</p></div>;
  if (!data) return <div className="page-state" aria-busy="true"><p>Loading…</p></div>;

  const props = { data, run };
  return (
    <section className="page active" id="page-registrar" aria-labelledby="page-title">
      <div className="advise-head"><div className="term-pill">{data.term.label}</div></div>
      <div className="tabs" role="tablist" aria-label="Registrar sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tab${tab === key ? " is-on" : ""}`}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "payments" && <Payments {...props} />}
      {tab === "windows" && <Windows {...props} />}
      {tab === "courses" && <Courses {...props} />}
      {tab === "groups" && <Groups {...props} />}
      {tab === "rooms" && <Rooms {...props} />}
      {tab === "line" && <Line {...props} reload={reload} />}
    </section>
  );
}

function Field({ label, children, wide }) {
  return <label className={`field${wide ? " field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

/* Downpayments: who has paid, and recording new payments. */
function Payments({ data, run }) {
  const unpaid = data.students.filter((s) => !s.payment);
  const [form, setForm] = useState({ userId: "", amount: data.settings.downpaymentAmount, reference: "", channel: "Over the counter, Business Office" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (await run("/registrar/payments", "POST", { ...form, amount: Number(form.amount) }, "Payment recorded.")) {
      setForm({ ...form, userId: "", reference: "" });
    }
  };

  return (
    <>
      <form className="card admin-form" onSubmit={submit}>
        <h3 className="card-h">Record a downpayment</h3>
        <div className="fields">
          <Field label="Student">
            <select value={form.userId} onChange={set("userId")} required>
              <option value="">{unpaid.length ? "Choose a student" : "Everyone has paid"}</option>
              {unpaid.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </Field>
          <Field label="Amount (₱)"><input type="number" min="1" step="0.01" value={form.amount} onChange={set("amount")} required /></Field>
          <Field label="Reference number"><input value={form.reference} onChange={set("reference")} placeholder="DP-2026-000000" required /></Field>
          <Field label="Paid through">
            <select value={form.channel} onChange={set("channel")}>
              <option>Over the counter, Business Office</option>
              <option>Bank deposit, BDO</option>
              <option>Bank deposit, BPI</option>
              <option>Online, GCash</option>
              <option>Online, Dragonpay</option>
            </select>
          </Field>
        </div>
        <button className="btn btn-primary" type="submit" disabled={!unpaid.length}>Record payment</button>
      </form>

      <div className="card sl-card">
        <h3 className="card-h">Students</h3>
        <table className="sl-table admin-table">
          <thead><tr><th>Student</th><th>Year</th><th>Downpayment</th><th>Enrollment</th></tr></thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}<br /><span className="room">{s.id}, {s.email}</span></td>
                <td>{s.programCode} {YEARS[s.yearLevel]}</td>
                <td>{s.payment
                  ? <><span className="st st-passed">Paid</span> {peso(s.payment.amount)}<br /><span className="room">{s.payment.reference}, {fmtDate(Date.parse(s.payment.paidAt))}</span></>
                  : <span className="st st-locked">Not paid</span>}</td>
                <td>{s.enrolled ? <span className="st st-enrolled">{s.enrolled}</span> : <span className="room">Not enrolled</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* Enrollment windows per year level. */
function Windows({ data, run }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries([1, 2, 3, 4].map((y) => {
      const w = data.windows.find((x) => x.yearLevel === y);
      return [y, { opensAt: w ? toLocalInput(w.opensAt) : "", closesAt: w ? toLocalInput(w.closesAt) : "" }];
    })));
  const set = (y, k) => (e) => setValues({ ...values, [y]: { ...values[y], [k]: e.target.value } });
  const save = (y) => {
    const v = values[y];
    if (!v.opensAt || !v.closesAt) return;
    run(`/registrar/windows/${y}`, "PUT", { opensAt: fromLocalInput(v.opensAt), closesAt: fromLocalInput(v.closesAt) },
      `${YEARS[y]} Year window saved.`);
  };

  return (
    <div className="card sl-card">
      <h3 className="card-h">Enrollment windows</h3>
      <p className="card-sub">Students can only enroll while their year level&rsquo;s window is open. Times are in your time zone.</p>
      <table className="sl-table admin-table">
        <thead><tr><th>Year level</th><th>Opens</th><th>Closes</th><th /></tr></thead>
        <tbody>
          {[1, 2, 3, 4].map((y) => (
            <tr key={y}>
              <td><b>{YEARS[y]} Year</b></td>
              <td><input type="datetime-local" aria-label={`${YEARS[y]} Year opens`} value={values[y].opensAt} onChange={set(y, "opensAt")} /></td>
              <td><input type="datetime-local" aria-label={`${YEARS[y]} Year closes`} value={values[y].closesAt} onChange={set(y, "closesAt")} /></td>
              <td><button className="btn btn-ghost btn-sm" type="button" onClick={() => save(y)}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Courses and the prospectus. */
const blankCourse = (program) => ({ code: "", title: "", units: 3, programCode: program, yearLevel: 1, term: "1st", standing: "", prereqs: "" });

function Courses({ data, run }) {
  const [program, setProgram] = useState(data.programs[0]?.code || "");
  const [editing, setEditing] = useState(null); // course code, or "" for a new course
  const [form, setForm] = useState(blankCourse(program));
  const [filter, setFilter] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const rows = data.courses.filter((c) => c.programCode === program &&
    (!filter || `${c.code} ${c.title}`.toLowerCase().includes(filter.toLowerCase())));

  const edit = (c) => {
    setEditing(c.code);
    setForm({ ...c, standing: c.standing ?? "", prereqs: c.prereqs.join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, prereqs: form.prereqs.split(",").map((s) => s.trim()).filter(Boolean) };
    const ok = editing
      ? await run(`/registrar/courses/${encodeURIComponent(editing)}`, "PUT", body, `${editing} saved.`)
      : await run("/registrar/courses", "POST", body, `${form.code.toUpperCase()} added.`);
    if (ok) {
      setEditing(null);
      setForm(blankCourse(program));
    }
  };
  const remove = (c) => {
    if (window.confirm(`Delete ${c.code} ${c.title}? Its groups are deleted too.`)) run(`/registrar/courses/${encodeURIComponent(c.code)}`, "DELETE", undefined, `${c.code} deleted.`);
  };

  return (
    <>
      <form className="card admin-form" onSubmit={submit}>
        <h3 className="card-h">{editing ? `Edit ${editing}` : "Add a course"}</h3>
        <div className="fields">
          <Field label="Code"><input value={form.code} onChange={set("code")} disabled={!!editing} placeholder="CIS 2101" required /></Field>
          <Field label="Title" wide><input value={form.title} onChange={set("title")} required /></Field>
          <Field label="Units"><input type="number" min="1" max="9" value={form.units} onChange={set("units")} required /></Field>
          <Field label="Program">
            <select value={form.programCode} onChange={set("programCode")} disabled={!!editing}>
              {data.programs.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
            </select>
          </Field>
          <Field label="Year"><select value={form.yearLevel} onChange={set("yearLevel")}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{YEARS[y]}</option>)}</select></Field>
          <Field label="Term"><select value={form.term} onChange={set("term")}>{["1st", "2nd", "Summer"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Prerequisites (codes, comma separated)" wide><input value={form.prereqs} onChange={set("prereqs")} placeholder="CIS 1201, CIS 1202" /></Field>
          <Field label="Year standing">
            <select value={form.standing} onChange={set("standing")}>
              <option value="">None</option>
              {[2, 3, 4, 5].map((y) => <option key={y} value={y}>{YEARS[y]} year</option>)}
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{editing ? "Save course" : "Add course"}</button>
          {editing !== null && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(blankCourse(program)); }}>Cancel</button>}
        </div>
      </form>

      <div className="card sl-card">
        <div className="table-tools">
          <h3 className="card-h">Prospectus</h3>
          <select aria-label="Program" value={program} onChange={(e) => { setProgram(e.target.value); setForm(blankCourse(e.target.value)); }}>
            {data.programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <input type="search" placeholder="Search courses" aria-label="Search courses" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <table className="sl-table admin-table">
          <thead><tr><th>Course</th><th>Term</th><th>Units</th><th>Requisite</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code}>
                <td><span className="hist-code">{c.code}</span><br />{c.title}</td>
                <td>{c.termName}</td>
                <td>{c.units}</td>
                <td className="pt-req">{[c.prereqs.join(", "), c.standing ? `${YEARS[c.standing]} year standing` : ""].filter(Boolean).join("; ") || "-"}</td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => edit(c)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(c)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* Groups (sections) for this term. */
function Groups({ data, run }) {
  const courseCodes = useMemo(() => [...new Set(data.courses.map((c) => c.code))].sort(), [data.courses]);
  const [code, setCode] = useState(() => (data.sections[0]?.code) || courseCodes[0] || "");
  const blank = { days: "M W", start: "07:30", end: "10:00", room: data.rooms[0]?.code || "", facultyId: "", faculty: "TBA", capacity: 30 };
  const [editing, setEditing] = useState(null); // section id, or null for a new group
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const rows = data.sections.filter((s) => s.code === code);
  const course = data.courses.find((c) => c.code === code);

  const edit = (s) => {
    setEditing(s.id);
    setForm({ days: s.days, start: s.start, end: s.end, room: s.room, facultyId: s.facultyId || "", faculty: s.faculty, capacity: s.capacity });
  };
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, code, capacity: Number(form.capacity), facultyId: form.facultyId || null };
    const ok = editing
      ? await run(`/registrar/sections/${editing}`, "PUT", body, "Group saved.")
      : await run("/registrar/sections", "POST", body, `Group added to ${code}.`);
    if (ok) {
      setEditing(null);
      setForm(blank);
    }
  };
  const remove = (s) => {
    if (window.confirm(`Delete ${s.code} Group ${s.group}?`)) run(`/registrar/sections/${s.id}`, "DELETE", undefined, "Group deleted.");
  };

  return (
    <>
      <div className="card sl-card">
        <div className="table-tools">
          <h3 className="card-h">Groups</h3>
          <select aria-label="Course" value={code} onChange={(e) => { setCode(e.target.value); setEditing(null); setForm(blank); }}>
            {courseCodes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {course && <span className="room">{course.title}</span>}
        </div>
        <table className="sl-table admin-table">
          <thead><tr><th>Group</th><th>Schedule</th><th>Room</th><th>Faculty</th><th>Seats taken</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={editing === s.id ? "is-editing" : ""}>
                <td><b>{s.group}</b></td>
                <td>{s.days} {fmtTime(s.start)} - {fmtTime(s.end)}</td>
                <td>{s.room}</td>
                <td>{s.faculty}</td>
                <td>{s.enrolled} of {s.capacity}{s.realEnrolled ? <><br /><span className="room">{s.realEnrolled} through QueuSC</span></> : null}</td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => edit(s)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="6" className="room">No groups for {code} this term.</td></tr>}
          </tbody>
        </table>
      </div>

      <form className="card admin-form" onSubmit={submit}>
        <h3 className="card-h">{editing ? `Edit ${code} Group ${rows.find((r) => r.id === editing)?.group}` : `Add a group to ${code}`}</h3>
        <div className="fields">
          <Field label="Days"><input value={form.days} onChange={set("days")} placeholder="M W" required /></Field>
          <Field label="Starts"><input type="time" value={form.start} onChange={set("start")} required /></Field>
          <Field label="Ends"><input type="time" value={form.end} onChange={set("end")} required /></Field>
          <Field label="Room">
            <select value={form.room} onChange={set("room")}>
              {data.rooms.map((r) => <option key={r.code} value={r.code}>{r.code} (seats {r.capacity})</option>)}
            </select>
          </Field>
          <Field label="Faculty">
            <select value={form.facultyId} onChange={set("facultyId")}>
              <option value="">{form.facultyId ? "Other" : form.faculty || "TBA"}</option>
              {data.faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          {!form.facultyId && <Field label="Faculty name (no account)"><input value={form.faculty} onChange={set("faculty")} /></Field>}
          <Field label="Capacity"><input type="number" min="1" max="500" value={form.capacity} onChange={set("capacity")} required /></Field>
        </div>
        <p className="card-sub">Days use M, T, W, Th, F and S, separated by spaces. A room can&rsquo;t hold two groups at once.</p>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{editing ? "Save group" : "Add group"}</button>
          {editing && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </form>
    </>
  );
}

/* Rooms */
function Rooms({ data, run }) {
  const blank = { code: "", building: "Talamban Campus, Learning Resource Center", capacity: 40 };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, capacity: Number(form.capacity) };
    const ok = editing
      ? await run(`/registrar/rooms/${encodeURIComponent(editing)}`, "PUT", body, `${editing} saved.`)
      : await run("/registrar/rooms", "POST", body, `${form.code} added.`);
    if (ok) {
      setEditing(null);
      setForm(blank);
    }
  };
  const remove = (r) => {
    if (window.confirm(`Delete room ${r.code}?`)) run(`/registrar/rooms/${encodeURIComponent(r.code)}`, "DELETE", undefined, `${r.code} deleted.`);
  };

  return (
    <>
      <form className="card admin-form" onSubmit={submit}>
        <h3 className="card-h">{editing ? `Edit ${editing}` : "Add a room"}</h3>
        <div className="fields">
          <Field label="Room code"><input value={form.code} onChange={set("code")} disabled={!!editing} placeholder="LB446 TC" required /></Field>
          <Field label="Building" wide><input value={form.building} onChange={set("building")} /></Field>
          <Field label="Seats"><input type="number" min="1" max="500" value={form.capacity} onChange={set("capacity")} required /></Field>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{editing ? "Save room" : "Add room"}</button>
          {editing && <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
        </div>
      </form>
      <div className="card sl-card">
        <h3 className="card-h">Rooms</h3>
        <table className="sl-table admin-table">
          <thead><tr><th>Room</th><th>Building</th><th>Seats</th><th>Groups</th><th /></tr></thead>
          <tbody>
            {data.rooms.map((r) => (
              <tr key={r.code}>
                <td><b>{r.code}</b></td>
                <td>{r.building}</td>
                <td>{r.capacity}</td>
                <td>{r.used}</td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEditing(r.code); setForm(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* The enrollment line and registrar settings. */
function Line({ data, run, reload }) {
  const [form, setForm] = useState(data.settings);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [reload]);

  const submit = (e) => {
    e.preventDefault();
    run("/registrar/settings", "PUT", {
      queueCapacity: Number(form.queueCapacity), turnMinutes: Number(form.turnMinutes), downpaymentAmount: Number(form.downpaymentAmount)
    }, "Settings saved.");
  };

  return (
    <>
      <div className="stat-row">
        <div className="card stat"><span className="stat-n">{data.queue.active}</span><span>enrolling now</span></div>
        <div className="card stat"><span className="stat-n">{data.queue.waiting}</span><span>waiting in line</span></div>
        <div className="card stat"><span className="stat-n">{data.settings.queueCapacity}</span><span>allowed at once</span></div>
      </div>
      <form className="card admin-form" onSubmit={submit}>
        <h3 className="card-h">Settings</h3>
        <div className="fields">
          <Field label="Students enrolling at once"><input type="number" min="1" max="1000" value={form.queueCapacity} onChange={set("queueCapacity")} /></Field>
          <Field label="Minutes per turn"><input type="number" min="1" max="120" value={form.turnMinutes} onChange={set("turnMinutes")} /></Field>
          <Field label="Downpayment (₱)"><input type="number" min="1" step="0.01" value={form.downpaymentAmount} onChange={set("downpaymentAmount")} /></Field>
        </div>
        <p className="card-sub">
          When more students try to enroll than allowed at once, the rest wait in line and get a turn in the order they
          arrived. Each turn lasts the minutes set here. Counts refresh every 5 seconds.
        </p>
        <button className="btn btn-primary" type="submit">Save settings</button>
      </form>
    </>
  );
}
