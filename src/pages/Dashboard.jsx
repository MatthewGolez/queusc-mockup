import { Link } from "react-router-dom";
import { Countdown, useEnrollment } from "../state/Enrollment.jsx";
import { sumUnits } from "../lib/schedule.js";
import Icon from "../components/Icon.jsx";

export default function Dashboard() {
  const { state } = useEnrollment();
  const { enrolled, load, label } = state;
  const units = sumUnits(load);
  const steps = [
    ["done", "Downpayment paid", "₱3,000.00, paid Jul 20"],
    ["done", "Slot confirmed", "Today, 9:42 AM"],
    [enrolled ? "done" : "current", "Advise & enroll", enrolled ? `${label}: ${load.length} courses, ${units} units` : "Open until 6:00 PM"],
    [enrolled ? "done" : "pending", "Enrollment complete", "Study load issued"]
  ];

  return (
    <section className="page active" id="page-dashboard" aria-labelledby="page-title">
      {enrolled ? (
        <div className="hero hero-done">
          <div className="hero-main">
            <span className="eyebrow"><Icon name="check" />Enrollment complete</span>
            <h2>You&rsquo;re enrolled for 1st Semester</h2>
            <p>{label}: {load.length} courses, {units} units. Your study load has been sent to your school email.</p>
            <div className="hero-actions">
              <Link className="btn btn-gold btn-lg" to="/studyload"><span>View study load</span><Icon name="arrow" /></Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero">
          <div className="hero-main">
            <span className="eyebrow"><span className="pulse" />Your enrollment window is open</span>
            <h2>Enroll before <span className="nowrap">6:00 PM today</span></h2>
            <p>Choose the courses you&rsquo;ll take, then join Block A or B or pick your own groups.</p>
            <div className="hero-actions">
              <Link className="btn btn-gold btn-lg" to="/advise"><span>Choose my schedule</span><Icon name="arrow" /></Link>
            </div>
          </div>
          <div className="hero-timer">
            <div className="ht-time" role="timer"><Countdown /></div>
            <div className="ht-label">left in your window</div>
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
            <li><b>1st Year</b><span>Aug 4</span></li>
            <li className="today"><b>2nd Year</b><span>Today, Aug 5</span></li>
            <li><b>3rd Year</b><span>Aug 6</span></li>
            <li><b>4th Year</b><span>Aug 7</span></li>
            <li className="adj"><b>Adjustment period</b><span>Aug 10-14</span></li>
          </ul>
          <p className="card-foot">Each window runs 8:00 AM to 6:00 PM. Use the adjustment period to add, drop, or change sections.</p>
        </div>
      </div>
    </section>
  );
}
