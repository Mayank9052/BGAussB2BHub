import "./Modules.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";

export default function Modules() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="modules-page">

      {/* ✅ SAME NAVBAR AS DASHBOARD */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Modules</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">Welcome, Admin</span>

          {/* 🔙 Back to Dashboard */}
          <button
            className="module-btn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="modules-container">
      </div>

    </div>
  );
}