import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { currentUser, findByEmail, safePage, signIn, users } from "../data/auth.js";
import Icon from "../components/Icon.jsx";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const next = `/${safePage(params.get("next"))}`;

  useEffect(() => {
    document.title = "Sign in to QueuSC";
    return () => { document.title = "QueuSC Enrollment"; };
  }, []);

  // Already signed in: skip the picker.
  if (currentUser()) return <Navigate to={next} replace />;

  const enter = (user) => {
    if (!signIn(user)) {
      setError("Your browser is blocking site storage, so QueuSC can’t keep you signed in. Allow site data and try again.");
      return;
    }
    navigate(next, { replace: true });
  };

  const submit = (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    const match = findByEmail(value);
    if (!value) setError("Enter your USC email.");
    else if (!/@usc\.edu\.ph$/.test(value)) setError("Use your @usc.edu.ph email.");
    else if (!match) setError(`No QueuSC account found for ${value}.`);
    else enter(match);
  };

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="mark">QueuSC</span>
          <span className="motto">Scientia, Virtus, Devotio</span>
        </div>
        <h1>Choose an account</h1>
        <p className="login-sub" id="login-sub">
          {params.get("reason") === "ended" ? "Your session ended. Sign in again to continue." : "to continue to 1st Semester enrollment"}
        </p>
        <ul className="accounts" id="accounts">
          {users.map((u) => (
            <li key={u.id}>
              <button type="button" className="account" data-user={u.id} onClick={() => enter(u)}>
                <span className="avatar" style={{ background: u.color }}>{u.first.charAt(0)}</span>
                <span className="acct-text">
                  <span className="acct-name"><b>{u.first}</b> {u.middle} <b>{u.last}</b></span>
                  <span className="acct-email">{u.email}</span>
                </span>
                <Icon name="arrow" />
              </button>
            </li>
          ))}
        </ul>
        <form className="login-form" id="login-form" noValidate onSubmit={submit}>
          <label htmlFor="login-email">Use another account</label>
          <div className="login-row">
            <input id="login-email" type="email" placeholder="you@usc.edu.ph" autoComplete="username" spellCheck="false"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" type="submit">Continue</button>
          </div>
          <p className="login-error" id="login-error" role="alert">{error}</p>
        </form>
      </div>
      <p className="login-note">Mock-up for QueuSC, CIS 2102 final project. Sign-in is simulated.</p>
    </main>
  );
}
