import { useState } from "react";
import { Link } from "react-router-dom";
import { MAX_UNITS, catalog, offerable, reqText, thisTerm } from "../data/curriculum.js";
import { advisedCourses, blockOpen, blockSections, blocks, picked } from "../lib/enrollment.js";
import { conflicts, isFull, overlaps, section, sumUnits, when } from "../lib/schedule.js";
import { currentUser } from "../data/auth.js";
import { Countdown, useEnrollment } from "../state/Enrollment.jsx";
import { useToast } from "../state/Toast.jsx";
import Icon from "../components/Icon.jsx";
import Seats from "../components/Seats.jsx";
import Timetable from "../components/Timetable.jsx";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Advise() {
  const { state, closed } = useEnrollment();
  const { enrolled, load, label } = state;

  return (
    <section className="page active" id="page-advise" aria-labelledby="page-title">
      <div className="advise-head">
        <div className="term-pill">1st Semester, A.Y. 2026-2027</div>
        {!enrolled && (
          <div className="window-pill"><Icon name="clock" /><span>Window open: <b role="timer"><Countdown /></b> left</span></div>
        )}
      </div>

      {enrolled ? (
        <div className="card sl-empty">
          <span className="done-ic"><Icon name="check" /></span>
          <h3>You&rsquo;re enrolled</h3>
          <p>{label}: {load.length} courses, {sumUnits(load)} units. Your study load has been sent to your school email.</p>
          <Link className="btn btn-primary" to="/studyload"><span>View study load</span><Icon name="arrow" /></Link>
          <p className="done-foot">Need changes? Add, drop, or change groups during the adjustment period, Aug 10-14.</p>
        </div>
      ) : (
        <EnrollFlow closed={closed} />
      )}
    </section>
  );
}

function EnrollFlow({ closed }) {
  const { state, dispatch } = useEnrollment();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const advising = state.step === "advise";
  const advised = advisedCourses(state);
  const advisedUnits = sumUnits(advised);
  const list = picked(state);
  const units = sumUnits(list);
  const clashes = conflicts(list);

  // The bar at the bottom: what's chosen so far and the next action.
  let title = "";
  let meta = "";
  let action = "Enroll";
  let disabled = true;
  let warn = false;
  if (advising) {
    const over = advisedUnits - MAX_UNITS;
    title = `${plural(advised.length, "course")}, ${advisedUnits} units advised`;
    meta = !advised.length ? "Select at least one course"
      : over > 0 ? `Over the ${MAX_UNITS}-unit limit by ${plural(over, "unit")}`
      : `Next, choose your block or groups (max ${MAX_UNITS} units)`;
    warn = over > 0;
    action = "Continue to enroll";
    disabled = closed || !advised.length || over > 0;
  } else if (state.mode === "block") {
    title = state.block ? `Block ${state.block}: ${list.length} courses, ${units} units` : "No block selected";
    meta = state.block ? "Fixed schedule, no time conflicts" : "Pick Block A or Block B above";
    action = closed ? "Window closed" : state.block ? `Enroll in Block ${state.block}` : "Enroll";
    disabled = closed || !state.block;
  } else if (state.mode === "custom") {
    const missing = advised.length - list.length;
    title = `Non-block: ${list.length} of ${advised.length} courses scheduled, ${units} units`;
    meta = clashes.length ? `Time conflict: ${clashes[0][0].code} and ${clashes[0][1].code}`
      : missing ? `Choose a group for ${missing} more ${missing === 1 ? "course" : "courses"}`
      : "No time conflicts";
    warn = clashes.length > 0;
    action = closed ? "Window closed" : `Enroll ${plural(advised.length, "course")}`;
    disabled = closed || missing > 0 || clashes.length > 0;
  }

  const next = () => {
    if (!currentUser()) return; // The layout's session check sends the student to sign in.
    if (advising) {
      dispatch({ type: "step", step: "enroll" });
      window.scrollTo(0, 0);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const label = state.mode === "block" ? `Block ${state.block}` : "Non-block";
      dispatch({ type: "enroll", load: list, label });
      toast(`Done. You’re enrolled${state.mode === "block" ? ` in ${label}` : ""}, ${list.length} courses.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 700);
  };

  return (
    <div>
      <ol className="flow-steps" aria-label="Enrollment steps">
        <li className={advising ? "is-current" : "is-done"}>
          <span className="fs-n">{advising ? "1" : <Icon name="check" />}</span>
          <span><b>Advise</b><span>Choose your courses</span></span>
        </li>
        <li className={advising ? "" : "is-current"}>
          <span className="fs-n">2</span>
          <span><b>Enroll</b><span>Pick your block or groups</span></span>
        </li>
      </ol>

      {advising ? <AdvisePane /> : (
        <EnrollPane list={list} clashes={clashes} advised={advised} advisedUnits={advisedUnits} />
      )}

      {(advising || state.mode) && (
        <div className={`enroll-bar${warn ? " has-conflict" : ""}`} id="enroll-bar">
          <div className="eb-info">
            <b className="js-eb-title">{title}</b>
            <span className="js-eb-meta">{meta}</span>
          </div>
          <button className="btn btn-primary btn-lg js-enroll" type="button" disabled={disabled || busy} onClick={next}>
            {busy ? "Enrolling…" : action}
          </button>
        </div>
      )}
    </div>
  );
}

/* Step 1: choose courses */
function AdvisePane() {
  const { state, dispatch } = useEnrollment();
  const extras = offerable.filter((c) => c.status === "available");
  const locked = catalog.filter((c) => c.status === "locked");
  const [extraOpen, setExtraOpen] = useState(() => extras.some((c) => state.advised[c.id]));

  const item = (c) => (
    <li key={c.id}>
      <label className="advise-item">
        <input type="checkbox" data-advise={c.id} checked={!!state.advised[c.id]}
          onChange={(e) => dispatch({ type: "advise", id: c.id, checked: e.target.checked })} />
        <span className="sl-swatch" style={{ background: c.color }} />
        <span className="ai-text">
          <b>{c.code}</b><span>{c.title}</span>
          {c.status === "available" && <span className="ai-from">{c.termName}{c.req ? `. ${reqText(c.req)}` : ""}</span>}
        </span>
        <span className="ai-units">{c.units.toFixed(1)} units</span>
      </label>
    </li>
  );

  return (
    <div className="course-card js-advise-pane">
      <div className="cc-head">
        <h3>Which courses are you taking this semester?</h3>
        <p>Your curriculum for this term is already checked. You can also add courses from other terms if you&rsquo;ve passed their prerequisites.</p>
      </div>
      <h4 className="al-head">This term: 2nd Year, 1st Semester</h4>
      <ul className="advise-list" id="advise-current">{thisTerm.map(item)}</ul>
      <details className="al-locked al-extra js-extra" open={extraOpen} onToggle={(e) => setExtraOpen(e.currentTarget.open)}>
        <summary><Icon name="list" /><span>Add courses from other terms ({extras.length})</span><span className="al-sub">Prerequisites passed</span></summary>
        <ul className="advise-list" id="advise-extra">{extras.map(item)}</ul>
      </details>
      <details className="al-locked">
        <summary><Icon name="lock" /><span>Not available yet ({locked.length})</span></summary>
        <ul className="advise-list" id="advise-locked">
          {locked.map((c) => (
            <li key={c.id} className="advise-item is-locked">
              <Icon name="lock" />
              <span className="ai-text"><b>{c.code}</b><span>{c.title}</span><span className="ai-from">{c.termName}</span></span>
              <span className="ai-reason">{c.reason}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="cc-foot">You&rsquo;ll pick schedules in the next step. Maximum load is {MAX_UNITS} units per semester.</p>
    </div>
  );
}

/* Step 2: Block or Non-block */
function EnrollPane({ list, clashes, advised, advisedUnits }) {
  const { state, dispatch } = useEnrollment();
  const open = blockOpen(state);

  return (
    <div className="js-enroll-step">
      <div className="enroll-step-head">
        <button className="linkish js-back" type="button" onClick={() => { dispatch({ type: "step", step: "advise" }); window.scrollTo(0, 0); }}>
          &larr; Back to advising
        </button>
        <span>Advised: {advised.length} courses, {advisedUnits} units</span>
      </div>

      <fieldset className="mode-pick">
        <legend className="sr">How do you want to enroll?</legend>
        <label className={`mode-opt${open ? "" : " is-disabled"}`}>
          <input type="radio" name="mode" value="block" disabled={!open} checked={state.mode === "block"}
            onChange={() => dispatch({ type: "mode", mode: "block" })} />
          <span className="mo-body">
            <b>Block section</b>
            <span className="js-block-desc">
              {open ? "Join Block A or Block B. Your whole schedule is fixed, and you take every class with the same blockmates."
                : `Blocks run exactly this term’s ${thisTerm.length} courses. Advise those, and only those, to join one.`}
            </span>
          </span>
        </label>
        <label className="mode-opt">
          <input type="radio" name="mode" value="custom" checked={state.mode === "custom"}
            onChange={() => dispatch({ type: "mode", mode: "custom" })} />
          <span className="mo-body">
            <b>Non-block</b>
            <span>Pick a group for each course and arrange a schedule that works for you.</span>
          </span>
        </label>
      </fieldset>

      {state.mode === "block" && <BlockPicker />}
      {state.mode === "custom" && <GroupPicker list={list} clashes={clashes} advised={advised} />}

      {list.length > 0 && (
        <div className="card sl-card js-preview">
          <h3 className="card-h">Schedule preview</h3>
          <Timetable list={list} clashes={clashes} />
        </div>
      )}
    </div>
  );
}

function BlockPicker() {
  const { state, dispatch } = useEnrollment();
  return (
    <div className="course-card js-block-pane">
      <div className="cc-head">
        <h3>Choose your block</h3>
        <p>Each block has a fixed schedule. Seats are reserved for the whole block, so you get every class.</p>
      </div>
      <div className="blocks" id="blocks">
        {Object.entries(blocks).map(([key, b]) => {
          const left = b.cap - b.enrolled;
          const secs = blockSections(key);
          return (
            <label className="block-opt" key={key}>
              <input type="radio" name="block" value={key} checked={state.block === key} disabled={left <= 0}
                onChange={() => dispatch({ type: "block", block: key })} />
              <span className="bo-head">
                <b>Block {key}</b>
                <span className={`bo-seats${left <= 5 ? " low" : ""}`}>{left > 0 ? `${left} seats left` : "Full"}</span>
              </span>
              <span className="meter"><span style={{ width: `${Math.round((b.enrolled / b.cap) * 100)}%` }} /></span>
              <span className="bo-list">
                {secs.map((sec) => (
                  <span className="bo-row" key={sec.id}>
                    <span className="sl-swatch" style={{ background: sec.color }} />
                    <b>{sec.code}</b><span>G{sec.group}</span><span>{when(sec)}</span>
                  </span>
                ))}
              </span>
              <span className="bo-foot">{secs.length} courses, {sumUnits(secs)} units</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function GroupPicker({ list, clashes, advised }) {
  const { state, dispatch } = useEnrollment();
  const clashWith = {};
  clashes.forEach(([a, b]) => { clashWith[a.id] = b.code; clashWith[b.id] = a.code; });

  return (
    <div className="course-card js-custom-pane">
      <div className="cc-head">
        <h3>Choose a group for each course</h3>
        <p>Every course has 5 groups with different schedules. Pick one for each course you advised.</p>
      </div>
      <table className="ctable gtable">
        <thead>
          <tr><th>Course</th><th>Group &amp; schedule</th><th>Room &amp; faculty</th><th>Seats</th><th className="c-units">Units</th></tr>
        </thead>
        <tbody id="group-body">
          {advised.map((c) => {
            const n = state.groups[c.id];
            const sec = n ? section(c, n) : null;
            // Grey out groups that are full or overlap a group already picked for another course.
            const others = list.filter((o) => o.id !== c.id);
            let open = 0;
            const options = c.groups.map(([g]) => {
              const s = section(c, g);
              const full = isFull(s);
              const hit = others.find((o) => overlaps(s, o));
              if (!full && !hit) open++;
              return (
                <option key={g} value={g} disabled={(full || !!hit) && n !== g}>
                  Group {g}: {when(s)}{full ? " (Full)" : hit ? ` (overlaps ${hit.code})` : ""}
                </option>
              );
            });
            const clash = sec && clashWith[c.id];
            const stuck = !sec && !open;
            return (
              <tr key={c.id} className={`grow${clash ? " has-clash" : ""}${sec ? "" : " is-skipped"}`}>
                <td className="g-course"><span className="code">{c.code}</span><span className="ctitle">{c.title}</span></td>
                <td className="g-pick">
                  <select data-course={c.id} aria-label={`Group for ${c.code}`} value={n || ""}
                    onChange={(e) => dispatch({ type: "group", id: c.id, group: e.target.value ? +e.target.value : null })}>
                    <option value="">Choose a group</option>
                    {options}
                  </select>
                  {clash && <span className="clash-msg">Overlaps with {clash}</span>}
                  {stuck && <span className="clash-msg">Every open group overlaps your other picks. Change another course&rsquo;s group.</span>}
                </td>
                <td className="g-fac">{sec ? <>{sec.room}<span className="room">{sec.faculty}</span></> : <span className="room">-</span>}</td>
                <td className="c-seats">{sec && <Seats enrolled={sec.enrolled} cap={sec.cap} />}</td>
                <td className="c-units">{sec ? c.units.toFixed(1) : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="cc-foot">Changed your mind later? You can add, drop, or change groups during the adjustment period, Aug 10-14.</p>
    </div>
  );
}
