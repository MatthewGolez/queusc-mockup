import { Link } from "react-router-dom";
import { Countdown, fmtDate, fmtDateTime, useClock, useEnrollment } from "../state/Enrollment.jsx";
import { sumUnits } from "../lib/schedule.js";
import Icon from "../components/Icon.jsx";

const YEARS = ["", "1st", "2nd", "3rd", "4th", "5th"];

export default function Dashboard() {
  const { data, state, windowState } = useEnrollment();
  const { opens, closes } = useClock();
  const { enrolled, load, label } = state;
  const units = sumUnits(load);
  const paid = data.payment;
  const advised = data.advising?.courses.length;
  const steps = [
    [paid ? "done" : "current", "Downpayment", paid ? `₱${paid.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}, paid ${fmtDate(Date.parse(paid.paidAt))}` : "Not paid yet"],
    [advised || enrolled ? "done" : paid ? "current" : "pending", "Advise", advised ? `${advised} courses chosen` : "Choose your courses"],
    [enrolled ? "done" : advised ? "current" : "pending", "Enroll", enrolled ? `${label}: ${load.length} courses, ${units} units` : windowState === "open" ? `Open until ${fmtDateTime(closes)}` : windowState === "upcoming" ? `Opens ${fmtDateTime(opens)}` : "Window closed"],
    [enrolled ? "done" : "pending", "Enrollment complete", "Study load issued"]
  ];

  return (
    <section className="page active" id="page-dashboard" aria-labelledby="page-title">
      {enrolled ? (
        <div className="hero hero-done">
          <div className="hero-main">
            <span className="eyebrow"><Icon name="check" />Enrollment complete</span>
            <h2>You&rsquo;re enrolled for 1st Semester</h2>
            <p>{label}: {load.length} courses, {units} units.</p>
            <div className="hero-actions">
              <Link className="btn btn-gold btn-lg" to="/studyload"><span>View study load</span><Icon name="arrow" /></Link>
            </div>
          </div>
        </div>
      ) : windowState === "closed" ? (
        <div className="hero">
          <div className="hero-main">
            <span className="eyebrow">Your enrollment window has closed</span>
            <h2>Enrollment closed {fmtDateTime(closes)}</h2>
            <p>You can still add or change classes during the adjustment period. Visit the Registrar&rsquo;s Office for help.</p>
          </div>
        </div>
      ) : (
        <div className="hero">
          <div className="hero-main">
            {windowState === "open"
              ? <span className="eyebrow"><span className="pulse" />Your enrollment window is open</span>
              : <span className="eyebrow">Your enrollment window opens soon</span>}
            <h2>{windowState === "open" ? <>Enroll before <span className="nowrap">{fmtDateTime(closes)}</span></> : <>Opens <span className="nowrap">{fmtDateTime(opens)}</span></>}</h2>
            <p>
              {paid ? "Choose the courses you’ll take, then join a block or pick your own groups."
                : "Pay your downpayment first, then choose your courses and schedule."}
            </p>
            <div className="hero-actions">
              {paid
                ? <Link className="btn btn-gold btn-lg" to="/advise"><span>Choose my schedule</span><Icon name="arrow" /></Link>
                : <Link className="btn btn-gold btn-lg" to="/downpayment"><span>Pay downpayment</span><Icon name="arrow" /></Link>}
            </div>
          </div>
          <div className="hero-timer">
            <div className="ht-time" role="timer"><Countdown /></div>
            <div className="ht-label">{windowState === "open" ? "left in your window" : "until your window opens"}</div>
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="card">
          <h3 className="card-h">Your progress</h3>
          <ol className="checklist">
            {steps.map(([status, title, note], i) => (
              <li key={title} className={status}>
                <span className="ck">{status === "done" ? <Icon name="check" /> : i + 1}</span>
                <div><b>{title}</b><span>{note}</span></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h3 className="card-h">Enrollment schedule</h3>
          <ul className="sched">
            {data.windows.map((w) => (
              <li key={w.yearLevel} className={w.yearLevel === data.terms[data.currentTermIndex]?.year ? "today" : ""}>
                <b>{YEARS[w.yearLevel]} Year</b>
                <span>{fmtDateTime(Date.parse(w.opensAt))} to {fmtDateTime(Date.parse(w.closesAt))}</span>
              </li>
            ))}
          </ul>
          <p className="card-foot">Set by the Registrar&rsquo;s Office. Use the adjustment period to add, drop, or change sections.</p>
        </div>
      </div>
    </section>
  );
}
