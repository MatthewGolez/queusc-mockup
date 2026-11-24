import { useEnrollment } from "../state/Enrollment.jsx";
import { reqText } from "../lib/schedule.js";

const STATUS = {
  passed: ["st-passed", "Passed"],
  current: ["st-current", "This term"],
  available: ["st-available", "Can take"],
  locked: ["st-locked", "Locked"],
  enrolled: ["st-enrolled", "Enrolled"]
};

export default function History() {
  const { data, state } = useEnrollment();
  const { catalog, terms, currentTermIndex, program } = data;
  const enrolledGroup = state.enrolled ? Object.fromEntries(state.load.map((c) => [c.id, c.group])) : {};

  return (
    <section className="page active" id="page-history" aria-labelledby="page-title">
      <div className="hist-top">
        <div>
          <h2 className="hist-degree">{program?.degree}</h2>
          <p className="hist-eff">Effective Year: {program?.effectiveYear}</p>
        </div>
        <ul className="hist-legend">
          {["passed", "current", "available", "locked"].map((k) => (
            <li key={k}><span className={`st ${STATUS[k][0]}`}>{STATUS[k][1]}</span></li>
          ))}
        </ul>
      </div>

      <div id="prospectus">
        {terms.map((t, ti) => {
          const rows = catalog.filter((c) => c.termIndex === ti);
          const units = rows.reduce((s, c) => s + c.units, 0);
          const done = rows.filter((c) => c.status === "passed").length;
          const isNow = ti === currentTermIndex;
          return (
            <div key={t.name} className={`card hist-term${isNow ? " is-current" : ""}`}>
              <h3>
                {t.name}
                {isNow && <> <span className="tag tag-gold">This term</span></>}
                <span className="hist-count">{done === rows.length ? "All passed" : done ? `${done} of ${rows.length} passed` : ""}</span>
              </h3>
              <table className="pros-table">
                <thead><tr><th>Course</th><th>Description</th><th>Units</th><th>Requisite</th><th>Grade</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((c) => {
                    const key = enrolledGroup[c.id] ? "enrolled" : c.status;
                    const note = key === "enrolled" ? `Group ${enrolledGroup[c.id]}` : c.status === "locked" ? c.reason : "";
                    return (
                      <tr key={c.id} className={`is-${key}`}>
                        <td className="hist-code">{c.code}</td>
                        <td>{c.title}</td>
                        <td>{c.units.toFixed(1)}</td>
                        <td className="pt-req">{reqText(c.req) || <span className="pt-none">-</span>}</td>
                        <td className="pt-grade">{c.grade != null ? c.grade.toFixed(1) : <span className="pt-none">-</span>}</td>
                        <td className="pt-status">
                          <span className={`st ${STATUS[key][0]}`}>{STATUS[key][1]}</span>
                          {note && <span className="pt-note">{note}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="hist-total">Total units: <b>{units.toFixed(1)}</b></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
