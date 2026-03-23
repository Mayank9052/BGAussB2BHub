import "./VehicleConfig.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";

export default function VehicleConfig() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  // ── Derived ──────────────────────────────────────────────────
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  // Enterprise card config
  const cards = [
    {
      route:   "/vehicle-config/models",
      banner:  "models-banner",
      cta:     "models-cta",
      emoji:   "🚗",
      title:   "Models",
      desc:    "Create and manage vehicle model master records used across the inventory system.",
      features: [
        { label: "Add Model",    cls: "amber" },
        { label: "Edit / Delete", cls: "amber" },
        { label: "Export",       cls: "amber" },
      ],
      ctaText: "Manage Models",
    },
    {
      route:   "/vehicle-config/variants",
      banner:  "variants-banner",
      cta:     "variants-cta",
      emoji:   "⚙️",
      title:   "Variants",
      desc:    "Define and organise variants for each vehicle model — Ex, Max, Pro and more.",
      features: [
        { label: "Add Variant", cls: "green" },
        { label: "Link Model",  cls: "green" },
        { label: "Bulk Import", cls: "green" },
      ],
      ctaText: "Manage Variants",
    },
    {
      route:   "/vehicle-config/colours",
      banner:  "colours-banner",
      cta:     "colours-cta",
      emoji:   "🎨",
      title:   "Colours",
      desc:    "Manage available colour options per variant to keep the catalogue accurate.",
      features: [
        { label: "Add Colour",   cls: "blue" },
        { label: "Link Variant", cls: "blue" },
        { label: "Colour Codes", cls: "blue" },
      ],
      ctaText: "Manage Colours",
    },
  ];

  return (
    <div className="vc-page">

      {/* ===== NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Config</span>
          </div>
        </div>

        <div className="pro-right">

          {/* EXISTING — hidden via CSS */}
          <span className="user-name">
            Welcome, {username} ({role})
          </span>
          <button className="module-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="module-btn" onClick={() => navigate("/modules")}>Modules</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>

          {/* ── USERNAME PILL ── */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* ── NAV ICON BUTTONS ── */}
          <div className="vc-icon-group">

            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Dashboard" aria-label="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>

            <button className="vc-icon-btn btn-vc-modules" data-tip="Modules" aria-label="Modules" onClick={() => navigate("/modules")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>

            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" aria-label="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="vc-container">

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="vc-header-row">
          <div className="vc-header-title">
            <div className="vc-header-text">
              <h1>Vehicle Config</h1>
              <span className="vc-header-sub">Manage models, variants & colour configurations</span>
            </div>
          </div> 
        </div>

        {/* ── ENTERPRISE CARDS ── */}
        <div className="vc-enterprise-grid">
          {cards.map((card) => (
            <div
              key={card.route}
              className="vc-enterprise-card"
              onClick={() => navigate(card.route)}
            >
              {/* Coloured banner with icon */}
              <div className={`vc-card-banner ${card.banner}`}>
                <div className="vc-card-icon-circle">{card.emoji}</div>
                <span className="vc-card-title">{card.title}</span>
              </div>

              {/* Card body */}
              <div className="vc-card-body">
                <p className="vc-card-desc">{card.desc}</p>

                {/* Feature pills */}
                <div className="vc-card-features">
                  {card.features.map((f) => (
                    <span key={f.label} className={`vc-feature-pill ${f.cls}`}>
                      {f.label}
                    </span>
                  ))}
                </div>

                {/* CTA row */}
                <div className={`vc-card-cta ${card.cta}`}>
                  <span>{card.ctaText}</span>
                  <span className="vc-card-cta-arrow">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── HIDDEN: EXISTING cards kept in DOM ── */}
        <div style={{ display: "none" }}>
          <div className="vc-grid">
            <div className="vc-card clickable" onClick={() => navigate("/vehicle-config/models")}>
              <h2>🚗 Models</h2>
              <p>Manage vehicle models</p>
            </div>
            <div className="vc-card clickable" onClick={() => navigate("/vehicle-config/variants")}>
              <h2>⚙️ Variants</h2>
              <p>Manage variants</p>
            </div>
            <div className="vc-card clickable" onClick={() => navigate("/vehicle-config/colours")}>
              <h2>🎨 Colours</h2>
              <p>Manage colours</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}