import "./VehicleConfig.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";

export default function VehicleConfig() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="vc-page">

      {/* ===== PROFESSIONAL NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Config</span>
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

          <button
            className="module-btn"
            onClick={() => navigate("/modules")}
          >
            Modules
          </button>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="vc-container">
        <div className="vc-grid">

          <div
            className="vc-card clickable"
            onClick={() => navigate("/vehicle-config/models")}
          >
            <h2>🚗 Models</h2>
            <p>Manage vehicle models</p>
          </div>

          <div
            className="vc-card clickable"
            onClick={() => navigate("/vehicle-config/variants")}
          >
            <h2>⚙️ Variants</h2>
            <p>Manage variants</p>
          </div>

          <div
            className="vc-card clickable"
            onClick={() => navigate("/vehicle-config/colours")}
          >
            <h2>🎨 Colours</h2>
            <p>Manage colours</p>
          </div>

        </div>
      </div>
    </div>
  );
}