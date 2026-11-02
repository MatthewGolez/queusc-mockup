import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PROGRAM, SESSION_KEY, currentUser, initials, shortName, signOut } from "../data/auth.js";
import { Countdown, EnrollmentProvider, useEnrollment } from "../state/Enrollment.jsx";
import Icon from "./Icon.jsx";

const TITLES = {
  dashboard: (u) => [`Welcome back, ${u.first}`, "1st Semester enrollment, A.Y. 2026-2027"],
  advise: () => ["Advise & Enroll", "Choose your courses, then pick your block or groups before your window closes."],
  studyload: () => ["Study Load", "Your official class schedule for 1st Semester."],
  downpayment: () => ["Downpayment", "Your payment for this semester’s enrollment slot."],
  history: () => ["Course History", "Your prospectus, term by term, with what you’ve passed and what you can take."]
};

const NAV = [
  ["dashboard", "home", "Dashboard", "Home"],
  ["advise", "list", "Advise & Enroll", "Enroll"],
  ["studyload", "cal", "Study Load", "Load"],
  ["downpayment", "wallet", "Downpayment", "Payment"],
  ["history", "book", "Course History", "History"]
];

const pageOf = (pathname) => pathname.split("/")[1] || "dashboard";

// Signed-out visitors go to the login page, which sends them back to the page they asked for.
export default function Layout() {
  const location = useLocation();
  const user = currentUser();
  if (!user) {
    const page = pageOf(location.pathname);
    return <Navigate to={`/login${TITLES[page] ? `?next=${page}` : ""}`} replace />;
  }
  // Keyed by user, so a different account always starts with fresh enrollment state.
  return (
    <EnrollmentProvider key={user.id}>
      <Shell user={user} />
    </EnrollmentProvider>
  );
}

function Shell({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, closed } = useEnrollment();
  const page = pageOf(location.pathname);
  const [title, sub] = (TITLES[page] || TITLES.dashboard)(user);
  const live = !state.enrolled && !closed;

  // Braces matter: newer browsers return a Promise from scrollTo, which React would call as a cleanup.
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // Re-check the stored session: it may have expired, or another tab signed out or switched accounts.
  useEffect(() => {
    const check = () => {
      const u = currentUser();
      if (!u) navigate(`/login?reason=ended&next=${pageOf(window.location.hash.slice(1))}`, { replace: true });
      else if (u.id !== user.id) window.location.reload();
    };
    const onStorage = (e) => { if (!e.key || e.key === SESSION_KEY) check(); };
    const onVisible = () => { if (!document.hidden) check(); };
    const onShow = (e) => { if (e.persisted) check(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(check, 30000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [navigate, user.id]);

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

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
            {NAV.map(([key, icon, label]) => (
              <NavLink key={key} to={`/${key}`} data-page={key}>
                <Icon name={icon} />{label}
                {key === "advise" && live && <span className="live-dot" aria-label="Window open" />}
              </NavLink>
            ))}
          </nav>
          <div className="side-bottom">
            {!state.enrolled && (
              <div className="side-foot">
                <span className="sf-label">Your window closes in</span>
                <span className="sf-time" role="timer"><Countdown /></span>
                <span className="sf-sub">Today, 6:00 PM</span>
              </div>
            )}
            <button className="signout" type="button" aria-label="Sign out" onClick={handleSignOut}>
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
                <span>{PROGRAM}</span>
              </div>
            </div>
          </header>
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Primary">
        {NAV.map(([key, icon, , short]) => (
          <NavLink key={key} to={`/${key}`} data-page={key}>
            <Icon name={icon} /><span>{short}</span>
            {key === "advise" && live && <span className="live-dot" />}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
