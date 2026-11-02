import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);
  const timer = useRef();

  const toast = useCallback((msg) => {
    setMessage(msg);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 3200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast${shown ? " show" : ""}`} id="toast" role="status" aria-live="polite">{message}</div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
