import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ComparisonDetail.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

/* ── Types ── */
interface VariantOption {
  scootyId: number;
  variantName: string;
  price: number | null;
}

interface ComparisonData {
  scootyId: number;
  modelName: string;
  variantName: string;
  imageUrl: string | null;
  price: number | null;
  // Basic Info
  brandName: string;
  avgRating: number;
  reviewCount: number;
  exShowroomPrice: number | null;
  insuranceAmount: number | null;
  fuelType: string;
  // Performance
  maxPowerKw: number | null;
  rangeKm: number | null;
  chargingTimeHrs: string | null;
  // Brakes & Wheels
  brakeFront: string | null;
  brakeRear: string | null;
  brakingType: string | null;
  wheelSize: string | null;
  wheelType: string | null;
  // Features
  startingType: string | null;
  speedometer: string | null;
  reverseMode: boolean;
  cruiseControl: boolean;
  usbCharging: boolean;
  ridingModes: string | null;
  // Colours
  colours: ColourItem[];
  // Brochure
  brochureUrl: string | null;
  // Warranty
  batteryWarranty: string | null;
  motorWarranty: string | null;
}

interface ColourItem {
  colourName: string;
  hexCode: string | null;
}

/* ── Helpers ── */
const resolveImg = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

// const fmt = (v: number | null, suffix = "") =>
//   v != null ? `${v.toLocaleString("en-IN")}${suffix}` : "—";

const fmtPrice = (v: number | null) =>
  v != null ? `Rs. ${(v / 100000).toFixed(2)} Lakh` : "—";

const StarRating = ({ rating, count }: { rating: number; count: number }) => (
  <div className="cmp-stars">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} width="16" height="16" viewBox="0 0 24 24"
        fill={s <= Math.round(rating) ? "#f59e0b" : "none"}
        stroke="#f59e0b" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
    <span className="cmp-review-count">{count} reviews</span>
  </div>
);

const BoolCell = ({ val }: { val: boolean }) => (
  <span className={`cmp-bool ${val ? "yes" : "no"}`}>{val ? "Yes" : "No"}</span>
);

const ColourDots = ({ colours, modelName }: { colours: ColourItem[]; modelName: string }) => (
  <div className="cmp-colours">
    <div className="cmp-colour-dots">
      {colours.map((c, i) => (
        <span
          key={i}
          className="cmp-colour-dot"
          title={c.colourName}
          style={{ background: c.hexCode ?? "#ccc" }}
        />
      ))}
    </div>
    <span className="cmp-colour-link">{modelName} Colors</span>
  </div>
);

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ── Section rows config ── */
const SECTIONS = [
  {
    label: "Basic Info",
    rows: [
      { key: "rating",       label: "Rating",            type: "rating" },
      { key: "brandName",    label: "Brand Name",        type: "text" },
      { key: "exShowroom",   label: "Ex-Showroom Price", type: "price" },
      { key: "maxPowerKw",   label: "Max Power",         type: "power" },
      { key: "fuelType",     label: "Fuel Type",         type: "text" },
      { key: "colours",      label: "Colors",            type: "colours" },
    ],
  },
  {
    label: "Performance",
    rows: [
      { key: "rangeKm",         label: "Range",           type: "range" },
      { key: "chargingTimeHrs", label: "Charging Time",   type: "text" },
      { key: "ridingModes",     label: "Riding Modes",    type: "text" },
      { key: "reverseMode",     label: "Reverse Mode",    type: "bool" },
      { key: "cruiseControl",   label: "Cruise Control",  type: "bool" },
    ],
  },
  {
    label: "Brakes & Wheels",
    rows: [
      { key: "brakeFront",  label: "Brakes Front",                    type: "text" },
      { key: "brakeRear",   label: "Brakes Rear",                     type: "text" },
      { key: "brakingType", label: "Braking Type",                    type: "text" },
      { key: "wheelSize",   label: "Wheel Size",                      type: "text" },
      { key: "wheelType",   label: "Wheels Type (Steel / Alloy)",     type: "text" },
    ],
  },
  {
    label: "Features",
    rows: [
      { key: "startingType", label: "Starting",     type: "text" },
      { key: "speedometer",  label: "Speedometer",  type: "text" },
      { key: "usbCharging",  label: "USB Charging", type: "bool" },
    ],
  },
  {
    label: "Warranty",
    rows: [
      { key: "batteryWarranty", label: "Battery", type: "text" },
      { key: "motorWarranty",   label: "Motor",   type: "text" },
    ],
  },
  {
    label: "Insurance & Brochure",
    rows: [
      { key: "insuranceAmount", label: "Insurance",  type: "insurance" },
      { key: "brochure",        label: "Brochure",   type: "brochure" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════ */
export default function ComparisonDetail() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>();
  const navigate = useNavigate();

  const [left, setLeft]   = useState<ComparisonData | null>(null);
  const [right, setRight] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  /* variant dropdowns */
  const [leftVariants,  setLeftVariants]  = useState<VariantOption[]>([]);
  const [rightVariants, setRightVariants] = useState<VariantOption[]>([]);
  const [leftScootyId,  setLeftScootyId]  = useState<number>(Number(id1));
  const [rightScootyId, setRightScootyId] = useState<number>(Number(id2));

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username || "U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }
    fetchBoth(Number(id1), Number(id2));
  }, [id1, id2]);

  const fetchBoth = async (s1: number, s2: number) => {
    setLoading(true); setError("");
    try {
      const [r1, r2] = await Promise.all([
        axios.get<ComparisonData>(`/api/Comparison/${s1}`),
        axios.get<ComparisonData>(`/api/Comparison/${s2}`),
      ]);
      setLeft(r1.data); setRight(r2.data);
      fetchVariants(s1, "left");
      fetchVariants(s2, "right");
    } catch {
      setError("Failed to load comparison data.");
    } finally {
      setLoading(false);
    }
  };

  /* Fetch all scooties for this model so user can switch variant */
  const fetchVariants = async (currentId: number, side: "left" | "right") => {
    try {
      /* Use the models-list endpoint filtered by modelName, or a dedicated endpoint */
      const res = await axios.get<VariantOption[]>(`/api/Comparison/variants-by-scooty/${currentId}`);
      if (side === "left")  setLeftVariants(res.data);
      else                  setRightVariants(res.data);
    } catch { /* silent */ }
  };

  const handleLeftVariantChange = async (scootyId: number) => {
    setLeftScootyId(scootyId);
    try {
      const res = await axios.get<ComparisonData>(`/api/Comparison/${scootyId}`);
      setLeft(res.data);
    } catch { /* silent */ }
  };

  const handleRightVariantChange = async (scootyId: number) => {
    setRightScootyId(scootyId);
    try {
      const res = await axios.get<ComparisonData>(`/api/Comparison/${scootyId}`);
      setRight(res.data);
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  /* ── Cell renderer ── */
  const renderCell = (data: ComparisonData, row: { key: string; type: string; label: string }) => {
    switch (row.type) {
      case "rating":
        return <StarRating rating={data.avgRating} count={data.reviewCount} />;
      case "price":
        return (
          <div>
            <div>{fmtPrice(data.exShowroomPrice)}</div>
            <span className="cmp-check-link" onClick={() => navigate(`/vehicle/${data.scootyId}`)}>
              Check On Road Price
            </span>
          </div>
        );
      case "power":
        return data.maxPowerKw != null ? `${data.maxPowerKw} kW` : "—";
      case "range":
        return data.rangeKm != null ? `${data.rangeKm} km/charge` : "—";
      case "bool":
        return <BoolCell val={(data as never)[row.key] as boolean} />;
      case "colours":
        return <ColourDots colours={data.colours} modelName={data.modelName} />;
      case "insurance":
        return (
          <div>
            <div>{data.insuranceAmount != null ? `Rs. ${data.insuranceAmount.toLocaleString("en-IN")}` : "—"}</div>
            {data.insuranceAmount != null && (
              <span className="cmp-check-link">{data.modelName} Insurance</span>
            )}
          </div>
        );
      case "brochure":
        return data.brochureUrl ? (
          <a
            href={`${API_ORIGIN}${data.brochureUrl}`}
            target="_blank"
            rel="noreferrer"
            className="cmp-brochure-btn"
            onClick={(e) => e.stopPropagation()}
          >
            Download Brochure
          </a>
        ) : <span className="cmp-na">N/A</span>;
      default: {
        const val = (data as never)[row.key];
        return val != null && val !== "" ? String(val) : "—";
      }
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="cmpd-page">
        <header className="dash-navbar">
          <div className="dash-nav-left">
            <img src={logo} className="dash-nav-logo" alt="BGauss" />
            <div className="dash-nav-brand">
              <span className="dash-brand-name">BGauss Portal</span>
              <span className="dash-brand-page">Compare</span>
            </div>
          </div>
        </header>
        <main className="cmpd-main">
          <div className="cmpd-skeleton-hero">
            <div className="cmpd-skel-box" />
            <div className="cmpd-skel-mid" />
            <div className="cmpd-skel-box" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !left || !right) {
    return (
      <div className="cmpd-page">
        <main style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
          {error || "Data not found."}
          <br />
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: "8px 20px", cursor: "pointer" }}>
            Go Back
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="cmpd-page">

      {/* ── NAVBAR ── */}
      <header className="dash-navbar">
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">{left.modelName} vs {right.modelName}</span>
          </div>
        </div>
        <div className="dash-nav-right">
          <div className="dash-user-pill">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-user-info">
              <span className="dash-user-name">{username}</span>
              <span className="dash-user-role">{role}</span>
            </div>
          </div>

          {/* Back button — moved to right */}
          <button className="dash-icon-btn cmpd-back-btn"
                  onClick={() => navigate(-1)}
                  data-tip="Go Back"
                  aria-label="Go Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="dash-actions">
            <button className="dash-icon-btn dash-btn-logout" 
                    onClick={handleLogout} 
                    aria-label="Logout" 
                    data-tip="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="cmpd-main">

        {/* ── HERO: two bikes + dropdowns ── */}
        <div className="cmpd-hero-card">

          {/* Left empty slot placeholder label */}
          <div className="cmpd-add-col">
            <span className="cmpd-add-label">Add Bike to Compare</span>
            <label className="cmpd-hide-label">
              <input type="checkbox" /> Hide Common Features
            </label>
          </div>

          {/* Left bike */}
          <div className="cmpd-bike-col">
            <div className="cmpd-edit-row">
              <button className="cmpd-edit-icon" title="Change bike" onClick={() => navigate("/comparison")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            </div>
            <img
              src={resolveImg(left.imageUrl)}
              className="cmpd-hero-img"
              alt={left.modelName}
              onError={(e) => { e.currentTarget.src = noImage; }}
            />
            <h3 className="cmpd-bike-title">BGauss {left.modelName}</h3>
            <select
              className="cmpd-variant-select"
              value={leftScootyId}
              onChange={(e) => handleLeftVariantChange(Number(e.target.value))}
            >
              {leftVariants.length === 0 && (
                <option value={leftScootyId}>
                  {left.variantName}{left.price ? ` — ${fmtPrice(left.price)}` : ""}
                </option>
              )}
              {leftVariants.map((v) => (
                <option key={v.scootyId} value={v.scootyId}>
                  {v.variantName}{v.price ? ` — ${fmtPrice(v.price)}` : ""}
                </option>
              ))}
            </select>
            <div className="cmpd-hero-price">{fmtPrice(left.price)}</div>
            <button className="cmpd-offer-btn" onClick={() => navigate(`/vehicle/${left.scootyId}`)}>
              View Offers
            </button>
          </div>

          {/* Right bike */}
          <div className="cmpd-bike-col">
            <div className="cmpd-edit-row">
              <button className="cmpd-edit-icon" title="Change bike" onClick={() => navigate("/comparison")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
            </div>
            <img
              src={resolveImg(right.imageUrl)}
              className="cmpd-hero-img"
              alt={right.modelName}
              onError={(e) => { e.currentTarget.src = noImage; }}
            />
            <h3 className="cmpd-bike-title">{right.modelName}</h3>
            <select
              className="cmpd-variant-select"
              value={rightScootyId}
              onChange={(e) => handleRightVariantChange(Number(e.target.value))}
            >
              {rightVariants.length === 0 && (
                <option value={rightScootyId}>
                  {right.variantName}{right.price ? ` — ${fmtPrice(right.price)}` : ""}
                </option>
              )}
              {rightVariants.map((v) => (
                <option key={v.scootyId} value={v.scootyId}>
                  {v.variantName}{v.price ? ` — ${fmtPrice(v.price)}` : ""}
                </option>
              ))}
            </select>
            <div className="cmpd-hero-price">{fmtPrice(right.price)}</div>
            <button className="cmpd-offer-btn" onClick={() => navigate(`/vehicle/${right.scootyId}`)}>
              View Offers
            </button>
          </div>
        </div>

        {/* ── KEY HIGHLIGHTS TABLE ── */}
        <div className="cmpd-highlights-card">
          <h2 className="cmpd-highlights-title">
            {left.modelName} vs {right.modelName} Key Highlights
          </h2>

          {SECTIONS.map((section) => (
            <div key={section.label} className="cmpd-section">

              {/* Section header row */}
              <div className="cmpd-table-row cmpd-section-header">
                <div className="cmpd-col-label">{section.label}</div>
                <div className="cmpd-col-val cmpd-col-head">
                  BGauss {left.modelName} {left.variantName}
                </div>
                <div className="cmpd-col-val cmpd-col-head">
                  {right.modelName} {right.variantName}
                </div>
              </div>

              {/* Data rows */}
              {section.rows.map((row) => (
                <div className="cmpd-table-row" key={row.key}>
                  <div className="cmpd-col-label cmpd-row-label">{row.label}</div>
                  <div className="cmpd-col-val">{renderCell(left, row)}</div>
                  <div className="cmpd-col-val">{renderCell(right, row)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}