import { useState } from "react";
import { Link } from "react-router-dom";
import { PROGRAM, currentUser, fullName } from "../data/auth.js";
import { sumUnits, when } from "../lib/schedule.js";
import { useEnrollment } from "../state/Enrollment.jsx";
import { useToast } from "../state/Toast.jsx";
import Icon from "../components/Icon.jsx";
import Timetable from "../components/Timetable.jsx";

const FILES = {
  schedule: ["QueuSC-Class-Schedule-1st-Sem-2026-2027.pdf", "Class schedule downloaded."],
  list: ["QueuSC-Study-Load-1st-Sem-2026-2027.pdf", "Study load downloaded."]
};

export default function StudyLoad() {
  const { state } = useEnrollment();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const { enrolled, load, label } = state;
  const units = sumUnits(load);

  // Two separate PDFs: the weekly schedule grid, or the study load course list.
  const download = async (part) => {
    const user = currentUser();
    if (!user) return;
    setBusy(part);
    try {
      const { buildStudyLoadPdf } = await import("../lib/pdf.js");
      const doc = buildStudyLoadPdf(load, {
        part,
        term: "1st Semester, A.Y. 2026-2027",
        student: `${fullName(user)} (${user.id}), ${PROGRAM}`,
        section: label,
        units,
        generated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      });
      doc.save(FILES[part][0]);
      toast(FILES[part][1]);
    } catch {
      toast("Couldn’t create the PDF. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  if (!enrolled) {
    return (
      <section className="page active" id="page-studyload" aria-labelledby="page-title">
        <div className="card sl-empty">
          <Icon name="cal" className="sl-empty-ic" />
          <h3>No study load yet</h3>
          <p>Your study load appears here once you enroll in your advised courses.</p>
          <Link className="btn btn-primary" to="/advise"><span>Go to Advise &amp; Enroll</span><Icon name="arrow" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-studyload" aria-labelledby="page-title">
      <div className="sl-head">
        <div className="sl-meta">
          <span className="badge badge-ok"><Icon name="check" />Enrolled</span>
          <span>1st Semester, A.Y. 2026-2027</span>
          <span>{label}</span>
          <span>{load.length} courses, {units} units</span>
        </div>
        <div className="dl-group">
          <button className="btn btn-primary js-download" data-part="schedule" type="button" disabled={!!busy} onClick={() => download("schedule")}>
            <Icon name="download" /><span>{busy === "schedule" ? "Preparing PDF…" : "Download schedule"}</span>
          </button>
          <button className="btn btn-ghost js-download" data-part="list" type="button" disabled={!!busy} onClick={() => download("list")}>
            <Icon name="download" /><span>{busy === "list" ? "Preparing PDF…" : "Download study load"}</span>
          </button>
        </div>
      </div>

      <div className="card sl-card">
        <h3 className="card-h">Weekly schedule</h3>
        <Timetable list={load} />
      </div>

      <div className="card sl-card">
        <h3 className="card-h">Courses</h3>
        <table className="sl-table">
          <thead><tr><th>Course</th><th>Schedule</th><th>Room</th><th>Faculty</th><th>Units</th></tr></thead>
          <tbody id="sl-courses">
            {load.map((c) => (
              <tr key={c.id}>
                <td><span className="sl-swatch" style={{ background: c.color }} /><span className="hist-code">{c.code}</span> (Group {c.group})<br />{c.title}</td>
                <td>{when(c)}</td>
                <td>{c.room}</td>
                <td>{c.faculty}</td>
                <td>{c.units.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hist-total">Total units: <b>{units.toFixed(1)}</b></div>
      </div>
    </section>
  );
}
