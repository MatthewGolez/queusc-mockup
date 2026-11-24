import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { fmtTime } from "../lib/schedule.js";
import Seats from "../components/Seats.jsx";

const YEARS = ["", "1st", "2nd", "3rd", "4th", "5th"];

// Faculty: the groups they teach this term, each with its class list.
export default function Classes() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/faculty/classes").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page-state" role="alert"><p>{error}</p></div>;
  if (!data) return <div className="page-state" aria-busy="true"><p>Loading your classes…</p></div>;

  return (
    <section className="page active" id="page-classes" aria-labelledby="page-title">
      <div className="advise-head"><div className="term-pill">{data.term}</div></div>
      {!data.classes.length && (
        <div className="card sl-empty"><h3>No classes this term</h3><p>The Registrar&rsquo;s Office assigns groups to faculty.</p></div>
      )}
      {data.classes.map((c) => (
        <div className="card sl-card class-card" key={c.id}>
          <div className="class-head">
            <div>
              <h3 className="card-h"><span className="sl-swatch" style={{ background: c.color }} />{c.code} Group {c.group}</h3>
              <p className="class-sub">{c.title}. {c.days} {fmtTime(c.start)} - {fmtTime(c.end)}, {c.room}</p>
            </div>
            <div className="class-seats"><Seats enrolled={c.enrolled} cap={c.capacity} /></div>
          </div>
          {c.students.length ? (
            <table className="sl-table admin-table">
              <thead><tr><th>Student</th><th>ID</th><th>Program</th><th>Enrolled as</th></tr></thead>
              <tbody>
                {c.students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}<br /><span className="room">{s.email}</span></td>
                    <td className="mono">{s.id}</td>
                    <td>{s.program}{s.yearLevel ? `, ${YEARS[s.yearLevel]} Year` : ""}</td>
                    <td>{s.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="class-empty">No QueuSC students have enrolled in this group yet.</p>}
        </div>
      ))}
    </section>
  );
}
