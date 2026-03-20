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
          <span className="user-name">Welcome, Admin</span>

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
            onClick={() => navigate("/inventory")}
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