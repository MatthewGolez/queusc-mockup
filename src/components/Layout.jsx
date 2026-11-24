import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { HOME, PAGES, initials, roleLine, shortName } from "../lib/auth.js";
import { useAuth } from "../state/Auth.jsx";
import { Countdown, EnrollmentProvider, useEnrollment } from "../state/Enrollment.jsx";
import Icon from "./Icon.jsx";

const TITLES = {
  dashboard: (u) => [`Welcome back, ${u.first}`, "1st Semester enrollment, A.Y. 2026-2027"],
  advise: () => ["Advise & Enroll", "Choose your courses, then pick your block or groups before your window closes."],
  studyload: () => ["Study Load", "Your official class schedule for 1st Semester."],
  downpayment: () => ["Downpayment", "Your payment for this semester’s enrollment slot."],
  history: () => ["Course History", "Your prospectus, term by term, with your grades and what you can take."],
  classes: () => ["My Classes", "Your groups this semester and the students enrolled in each."],
  registrar: () => ["Registrar", "Courses, groups, rooms, enrollment windows, downpayments and the enrollment line."]
};

const NAV = {
  student: [
    ["dashboard", "home", "Dashboard", "Home"],
    ["advise", "list", "Advise & Enroll", "Enroll"],
    ["studyload", "cal", "Study Load", "Load"],
    ["downpayment", "wallet", "Downpayment", "Payment"],
    ["history", "book", "Course History", "History"]
  ],
  faculty: [["classes", "list", "My Classes", "Classes"]],
  registrar: [["registrar", "book", "Registrar", "Registrar"]]
};

const pageOf = (pathname) => pathname.split("/")[1] || "dashboard";

// Signed-out visitors go to the login page, which sends them back to the page they asked for.
export default function Layout() {
  const location = useLocation();
  const { user, ended } = useAuth();
  const page = pageOf(location.pathname);
  if (user === undefined) return <div className="page-state" aria-busy="true"><p>Loading…</p></div>;
  if (!user) {
    const params = new URLSearchParams();
    if (ended) params.set("reason", "ended");
    if (TITLES[page]) params.set("next", page);
    const qs = params.toString();
    return <Navigate to={`/login${qs ? `?${qs}` : ""}`} replace />;
  }
  if (!PAGES[user.role]?.includes(page)) return <Navigate to={HOME[user.role]} replace />;
  // Keyed by user, so a different account always starts with fresh state.
  return user.role === "student"
    ? <EnrollmentProvider key={user.id}><Shell user={user} page={page} /></EnrollmentProvider>
    : <Shell key={user.id} user={user} page={page} />;
}

function StudentSide() {
  const { state, windowState } = useEnrollment();
  if (state.enrolled || windowState === "closed") return null;
  return (
    <div className="side-foot">
      <span className="sf-label">{windowState === "upcoming" ? "Your window opens in" : "Your window closes in"}</span>
      <span className="sf-time" role="timer"><Countdown /></span>
    </div>
  );
}

function LiveDot({ mobile }) {
  const { state, windowState } = useEnrollment();
  if (state.enrolled || windowState !== "open") return null;
  return <span className="live-dot" aria-label={mobile ? undefined : "Window open"} />;
}

function Shell({ user, page }) {
  const { signOut, recheck } = useAuth();
  const [title, sub] = (TITLES[page] || TITLES.dashboard)(user);
  const nav = NAV[user.role];
  const student = user.role === "student";

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Re-check the session when the tab comes back, and every minute: it may have expired or been replaced.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) recheck(); };
    const onShow = (e) => { if (e.persisted) recheck(); };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(recheck, 60000);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [recheck]);

  const skipToMain = (e) => {
    e.preventDefault();
    document.getElementById("main")?.focus();
  };

  return (
    <>
      <a className="skip" href="#main" onClick={skipToMain}>Skip to content</a>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <span className="mark">QueuSC</span>
            <span className="motto">Scientia, Virtus, Devotio</span>
          </div>
          <nav className="sidenav" aria-label="Primary">
            {nav.map(([key, icon, label]) => (
              <NavLink key={key} to={`/${key}`} data-page={key}>
                <Icon name={icon} />{label}
                {key === "advise" && <LiveDot />}
              </NavLink>
            ))}
          </nav>
          <div className="side-bottom">
            {student && <StudentSide />}
            <button className="signout" type="button" aria-label="Sign out" onClick={signOut}>
              <Icon name="logout" /><span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="main" id="main" tabIndex={-1}>
          <header className="topbar">
            <div>
              <h1 id="page-title">{title}</h1>
              <p id="page-sub">{sub}</p>
            </div>
            <div className="student-chip">
              <div className="avatar" aria-hidden="true" style={{ background: user.color, color: "#fff" }}>{initials(user)}</div>
              <div className="who">
                <b>{shortName(user)}</b>
                <span>{roleLine(user)}</span>
              </div>
            </div>
          </header>
          <Outlet />
        </main>
      </div>

      {nav.length > 1 && (
        <nav className="mobile-nav" aria-label="Primary">
          {nav.map(([key, icon, , short]) => (
            <NavLink key={key} to={`/${key}`} data-page={key}>
              <Icon name={icon} /><span>{short}</span>
              {key === "advise" && <LiveDot mobile />}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
