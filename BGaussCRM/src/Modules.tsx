import "./Modules.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";

export default function Modules() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  // ── Derived values ────────────────────────────────────────────
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="modules-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Modules</span>
          </div>
        </div>

        <div className="pro-right">

          {/* EXISTING — hidden via CSS (.modules-page .module-btn / .logout-btn / .user-name { display:none }) */}
          <span className="user-name">
            Welcome, {username} ({role})
          </span>

          <button
            className="module-btn"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>

          {/* ── USERNAME PILL ── */}
          <div className="mod-user-info">
            <div className="mod-user-avatar">{initial}</div>
            <div className="mod-user-text">
              <span className="mod-user-name">{username}</span>
              <span className="mod-user-role">{role}</span>
            </div>
          </div>

          {/* ── NAV ICON BUTTONS ── */}
          <div className="mod-icon-group">

            {/* Dashboard */}
            <button
              className="mod-icon-btn btn-mod-dashboard"
              data-tip="Dashboard"
              aria-label="Dashboard"
              onClick={() => navigate("/dashboard")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>

            {/* Logout */}
            <button
              className="mod-icon-btn btn-mod-logout"
              data-tip="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>{/* /mod-icon-group */}

        </div>
      </header>

      {/* CONTENT */}
      <div className="modules-container">
        <h1>Modules</h1>

        <div className="modules-grid">

          {/* B2B CUSTOMER */}
          <div
            className="module-card"
            onClick={() => navigate("/b2b-customers")}
          >
            <div className="icon-circle b2b-icon">👥</div>
            <h3>B2B Customer</h3>
            <p>Manage dealer & customer records</p>
          </div>

          {/* INVENTORY */}
          <div
            className="module-card"
            onClick={() => navigate("/scootyInventory")}
          >
            <div className="icon-circle inventory-icon">📦</div>
            <h3>Scooty Inventory</h3>
            <p>Manage stock & availability</p>
          </div>

          {/* VEHICLE CONFIG */}
          <div
            className="module-card"
            onClick={() => navigate("/vehicle-config")}
          >
            <div className="icon-circle vehicle-icon">🚗</div>
            <h3>Vehicle Config</h3>
            <p>Manage Model, Variant & Colour</p>
          </div>

          {/* REPORTS */}
          <div className="module-card disabled">
            <div className="icon-circle report-icon">📊</div>
            <h3>Reports</h3>
            <p>Coming soon</p>
          </div>

        </div>
      </div>

    </div>
  );
}