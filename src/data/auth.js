/* Simulated sign-in. There are no passwords: a static site can't keep one secret.
   The session lives in localStorage (sessionStorage when that's blocked) and expires after 8 hours. */

const KEY = "queusc.session";
const TTL = 8 * 60 * 60 * 1000;
export const PAGES = ["dashboard", "advise", "studyload", "downpayment", "history"];

export const users = [
  { id: "25100872", email: "25100872@usc.edu.ph", first: "Caroline", middle: "Sio Ang", last: "Gobonseng", color: "#7B57B8" },
  { id: "25100916", email: "25100916@usc.edu.ph", first: "Sebastian", middle: "Douglas Sauro", last: "Subang", color: "#2F5FB3" },
  { id: "22103502", email: "22103502@usc.edu.ph", first: "Matthew", middle: "Benedict", last: "Golez", color: "#8A5A4A" }
];

export const PROGRAM = "BS Information Systems, 2nd Year";

function storage() {
  for (const kind of ["localStorage", "sessionStorage"]) {
    try {
      const s = window[kind];
      s.setItem(`${KEY}.probe`, "1");
      s.removeItem(`${KEY}.probe`);
      return s;
    } catch {
      // Blocked; try the next kind.
    }
  }
  return null;
}

const byId = (id) => users.find((u) => u.id === id) || null;

// The signed-in user, or null when there is no valid, unexpired session.
export function currentUser() {
  const s = storage();
  if (!s) return null;
  try {
    const session = JSON.parse(s.getItem(KEY));
    const user = session && byId(session.id);
    if (user && session.expires > Date.now()) return user;
  } catch {
    // Unreadable session: fall through and clear it.
  }
  s.removeItem(KEY);
  return null;
}

export function signIn(user) {
  const s = storage();
  if (!s || !byId(user.id)) return false;
  s.setItem(KEY, JSON.stringify({ id: user.id, expires: Date.now() + TTL }));
  return true;
}

export function signOut() {
  const s = storage();
  if (s) s.removeItem(KEY);
}

export const SESSION_KEY = KEY;
export const safePage = (name) => (PAGES.includes(name) ? name : "dashboard");
export const findByEmail = (email) => users.find((u) => u.email === email) || null;
export const fullName = (u) => `${u.first} ${u.middle} ${u.last}`;
export const shortName = (u) => `${u.first} ${u.last.charAt(0)}.`;
export const initials = (u) => u.first.charAt(0) + u.last.charAt(0);
