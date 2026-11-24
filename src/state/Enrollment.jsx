import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { api } from "../lib/api.js";
import { initialState, makeReducer, prepare } from "../lib/enrollment.js";

const EnrollmentContext = createContext(null);
const ClockContext = createContext(null);

// Loads the student's data from the server, then provides it with the enrollment state.
export function EnrollmentProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(prepare(await api("/student")));
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="page-state" role="alert">
        <p>{error}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Try again</button>
      </div>
    );
  }
  if (!data) return <div className="page-state" aria-busy="true"><p>Loading your enrollment…</p></div>;
  return <Loaded data={data} setData={setData}>{children}</Loaded>;
}

function Loaded({ data, setData, children }) {
  const reducer = useMemo(() => makeReducer(data), [data]);
  const [state, dispatch] = useReducer(reducer, data, initialState);
  const now = useNow(data.clockOffset);
  const opens = data.window ? Date.parse(data.window.opensAt) : Infinity;
  const closes = data.window ? Date.parse(data.window.closesAt) : 0;
  const windowState = now < opens ? "upcoming" : now < closes ? "open" : "closed";

  // Updates seat counts in place, from /api/seats.
  const refreshSeats = useCallback(async () => {
    const seats = await api("/seats").catch(() => null);
    if (!seats) return;
    setData((d) => ({
      ...d,
      catalog: d.catalog.map(withSeats),
      thisTerm: d.thisTerm.map(withSeats),
      offerable: d.offerable.map(withSeats),
      blocks: Object.fromEntries(Object.entries(d.blocks).map(([k, b]) => [k, { ...b, enrolled: seats.blocks[k] ?? b.enrolled }]))
    }));
    function withSeats(c) {
      const counts = seats.sections[c.id];
      return c.groups && counts ? { ...c, groups: c.groups.map((g) => [...g.slice(0, 6), counts[g[0]] ?? g[6], g[7]]) } : c;
    }
  }, [setData]);

  const saveAdvising = useCallback(async (ids) => {
    const { advising } = await api("/advising", { method: "POST", body: { courses: ids } });
    setData((d) => ({ ...d, advising }));
  }, [setData]);

  const enroll = useCallback(async (body) => {
    const { enrollment } = await api("/enroll", { method: "POST", body });
    setData((d) => ({ ...d, enrollment }));
    dispatch({ type: "enroll", load: enrollment.load, label: enrollment.label });
    return enrollment;
  }, [setData]);

  const value = useMemo(
    () => ({ data, state, dispatch, windowState, closed: windowState !== "open", refreshSeats, saveAdvising, enroll }),
    [data, state, windowState, refreshSeats, saveAdvising, enroll]
  );
  const clock = useMemo(() => ({ now, opens, closes, windowState }), [now, opens, closes, windowState]);

  return (
    <EnrollmentContext.Provider value={value}>
      <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
    </EnrollmentContext.Provider>
  );
}

// The current time on the server's clock, ticking every second.
function useNow(offset) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [offset]);
  return now;
}

export const useEnrollment = () => useContext(EnrollmentContext);
export const useClock = () => useContext(ClockContext);

// "2:14:09" under a day, "3d 4h" over. Counts down to the window opening, or closing once it's open.
export function formatLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function Countdown() {
  const { now, opens, closes, windowState } = useClock();
  return formatLeft((windowState === "upcoming" ? opens : closes) - now);
}

const DATE_FMT = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
export const fmtDateTime = (ms) => new Date(ms).toLocaleString("en-US", DATE_FMT);
export const fmtDate = (ms) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
