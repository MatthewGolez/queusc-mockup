import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { initialState, reducer } from "../lib/enrollment.js";

const EnrollmentContext = createContext(null);
const ClockContext = createContext(null);

// Mock enrollment window: 2:14:09 left when the student signs in.
const WINDOW_SECONDS = 2 * 3600 + 14 * 60 + 9;

export function EnrollmentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [windowEnd] = useState(() => Date.now() + WINDOW_SECONDS * 1000);
  const [left, setLeft] = useState(WINDOW_SECONDS);

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.round((windowEnd - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [windowEnd]);

  const enrollment = useMemo(() => ({ state, dispatch, closed: left === 0 }), [state, left === 0]);

  return (
    <EnrollmentContext.Provider value={enrollment}>
      <ClockContext.Provider value={left}>{children}</ClockContext.Provider>
    </EnrollmentContext.Provider>
  );
}

export const useEnrollment = () => useContext(EnrollmentContext);

// Seconds left in the window, formatted "2:14:09". Only countdown displays re-render every second.
export function Countdown() {
  const s = useContext(ClockContext);
  const text = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return text;
}
