import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/api.js";

const AuthContext = createContext(null);

// user: undefined while checking, null when signed out. ended: the server ended the session.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [ended, setEnded] = useState(false);
  const current = useRef(undefined);
  current.current = user;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (current.current) setEnded(true);
      setUser(null);
    });
    api("/me").then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const signIn = useCallback(async (email, password) => {
    const d = await api("/login", { method: "POST", body: { email, password } });
    setEnded(false);
    setUser(d.user);
    return d.user;
  }, []);

  const signOut = useCallback(async () => {
    await api("/logout", { method: "POST", body: {} }).catch(() => {});
    setEnded(false);
    setUser(null);
  }, []);

  // Re-checks the session, e.g. when the tab comes back into view.
  const recheck = useCallback(async () => {
    try {
      const d = await api("/me");
      // Someone else signed in from another tab: start over as them.
      if (current.current && current.current.id !== d.user.id) window.location.reload();
      else if (!current.current) setUser(d.user);
    } catch {
      // A 401 is handled above. Network errors keep the current state.
    }
  }, []);

  const value = useMemo(() => ({ user, ended, signIn, signOut, recheck }), [user, ended, signIn, signOut, recheck]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
