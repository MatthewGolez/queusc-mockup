import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Advise from "./pages/Advise.jsx";
import StudyLoad from "./pages/StudyLoad.jsx";
import Downpayment from "./pages/Downpayment.jsx";
import History from "./pages/History.jsx";
import { ToastProvider } from "./state/Toast.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/advise" element={<Advise />} />
          <Route path="/studyload" element={<StudyLoad />} />
          <Route path="/downpayment" element={<Downpayment />} />
          <Route path="/history" element={<History />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}
