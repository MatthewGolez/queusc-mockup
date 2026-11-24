/* Helpers for the signed-in user. Sign-in itself lives on the server (see state/Auth.jsx). */

export const HOME = { student: "/dashboard", faculty: "/classes", registrar: "/registrar" };
export const PAGES = {
  student: ["dashboard", "advise", "studyload", "downpayment", "history"],
  faculty: ["classes"],
  registrar: ["registrar"]
};

// The page to open after sign-in: the one asked for, if this role may see it.
export const safeNext = (user, name) => (PAGES[user.role]?.includes(name) ? `/${name}` : HOME[user.role] || "/login");

const YEARS = ["", "1st", "2nd", "3rd", "4th", "5th"];
export const fullName = (u) => [u.first, u.middle, u.last].filter(Boolean).join(" ");
export const shortName = (u) => `${u.first} ${u.last.charAt(0)}.`;
export const initials = (u) => u.first.charAt(0) + u.last.charAt(0);
export const roleLine = (u) =>
  u.role === "student" ? `${u.program}, ${YEARS[u.yearLevel]} Year` : u.role === "faculty" ? "Faculty" : "Registrar's Office";
