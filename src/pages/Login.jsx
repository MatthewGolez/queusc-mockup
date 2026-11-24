import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { safeNext } from "../lib/auth.js";
import { useAuth } from "../state/Auth.jsx";
import Icon from "../components/Icon.jsx";

// Sample accounts, shown as shortcuts that fill in the email.
const DEMO = [
  { email: "25100872@usc.edu.ph", name: ["Caroline", "Sio Ang", "Gobonseng"], color: "#7B57B8", tag: "Student" },
  { email: "25100916@usc.edu.ph", name: ["Sebastian", "Douglas Sauro", "Subang"], color: "#2F5FB3", tag: "Student" },
  { email: "22103502@usc.edu.ph", name: ["Matthew", "Benedict", "Golez"], color: "#8A5A4A", tag: "Student" },
  { email: "chrisray.belarmino@usc.edu.ph", name: ["Chris Ray", "", "Belarmino"], color: "#1F6F5C", tag: "Faculty" },
  { email: "registrar@usc.edu.ph", name: ["Registrar", "", "Office"], color: "#9A6B12", tag: "Registrar" }
];

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.title = "Sign in to QueuSC";
    return () => { document.title = "QueuSC Enrollment"; };
  }, []);

  if (user) return <Navigate to={safeNext(user, params.get("next"))} replace />;

  const pick = (account) => {
    setEmail(account.email);
    setError("");
    passwordRef.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return setError("Enter your USC email.");
    if (!/@usc\.edu\.ph$/.test(value)) return setError("Use your @usc.edu.ph email.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    setError("");
    try {
      const signedIn = await signIn(value, password);
      navigate(safeNext(signedIn, params.get("next")), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="mark">QueuSC</span>
          <span className="motto">Scientia, Virtus, Devotio</span>
        </div>
        <h1>Sign in</h1>
        <p className="login-sub" id="login-sub">
          {params.get("reason") === "ended" ? "Your session ended. Sign in again to continue." : "to continue to 1st Semester enrollment"}
        </p>
        <ul className="accounts" id="accounts" aria-label="Sample accounts">
          {DEMO.map((a) => (
            <li key={a.email}>
              <button type="button" className={`account${email === a.email ? " is-picked" : ""}`} data-email={a.email} onClick={() => pick(a)}>
                <span className="avatar" style={{ background: a.color }}>{a.name[0].charAt(0)}</span>
                <span className="acct-text">
                  <span className="acct-name"><b>{a.name[0]}</b>{a.name[1] && ` ${a.name[1]}`} <b>{a.name[2]}</b></span>
                  <span className="acct-email">{a.email}</span>
                </span>
                <span className="acct-tag">{a.tag}</span>
              </button>
            </li>
          ))}
        </ul>
        <form className="login-form" id="login-form" noValidate onSubmit={submit}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" placeholder="you@usc.edu.ph" autoComplete="username" spellCheck="false"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" ref={passwordRef} type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : <><span>Sign in</span><Icon name="arrow" /></>}
          </button>
          <p className="login-error" id="login-error" role="alert">{error}</p>
        </form>
      </div>
      <p className="login-note">QueuSC, CIS 2102 final project.</p>
    </main>
  );
}
