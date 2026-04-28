import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ComparisonDetail.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

/* ── Types ── */
interface VariantOption { scootyId: number; variantName: string; price: number | null; }

interface ComparisonData {
  scootyId: number; modelName: string; variantName: string;
  imageUrl: string | null; price: number | null;
  brandName: string; avgRating: number; reviewCount: number;
  exShowroomPrice: number | null; insuranceAmount: number | null;
  fuelType: string; maxPowerKw: number | null; rangeKm: number | null;
  chargingTimeHrs: string | null; brakeFront: string | null;
  brakeRear: string | null; brakingType: string | null;
  wheelSize: string | null; wheelType: string | null;
  startingType: string | null; speedometer: string | null;
  reverseMode: boolean; cruiseControl: boolean;
  usbCharging: boolean; ridingModes: string | null;
  colours: ColourItem[]; brochureUrl: string | null;
  batteryWarranty: string | null; motorWarranty: string | null;
}

interface ColourItem { colourName: string; hexCode: string | null; }

/* ── Helpers ── */
const resolveImg = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const fmtPrice = (v: number | null) =>
  v != null ? `Rs. ${(v / 100000).toFixed(2)} Lakh` : "—";

const getInitials = (n: string) => {
  const p = n.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const StarRating = ({ rating, count }: { rating: number; count: number }) => (
  <div className="cmp-stars">
    {[1,2,3,4,5].map(s => (
      <svg key={s} width="14" height="14" viewBox="0 0 24 24"
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
        <span key={i} className="cmp-colour-dot" title={c.colourName}
          style={{ background: c.hexCode ?? "#ccc" }} />
      ))}
    </div>
    <span className="cmp-colour-link">{modelName} Colours</span>
  </div>
);

/* ── Sections ── */
const SECTIONS = [
  {
    label: "Basic Info",
    rows: [
      { key: "rating",     label: "Rating",            type: "rating" },
      { key: "brandName",  label: "Brand",             type: "text" },
      { key: "exShowroom", label: "Ex-Showroom Price", type: "price" },
      { key: "maxPowerKw", label: "Max Power",         type: "power" },
      { key: "fuelType",   label: "Fuel Type",         type: "text" },
      { key: "colours",    label: "Colors",            type: "colours" },
    ],
  },
  {
    label: "Performance",
    rows: [
      { key: "rangeKm",         label: "Range",          type: "range" },
      { key: "chargingTimeHrs", label: "Charging Time",  type: "text" },
      { key: "ridingModes",     label: "Riding Modes",   type: "text" },
      { key: "reverseMode",     label: "Reverse Mode",   type: "bool" },
      { key: "cruiseControl",   label: "Cruise Control", type: "bool" },
    ],
  },
  {
    label: "Brakes & Wheels",
    rows: [
      { key: "brakeFront",  label: "Brakes Front",               type: "text" },
      { key: "brakeRear",   label: "Brakes Rear",                type: "text" },
      { key: "brakingType", label: "Braking Type",               type: "text" },
      { key: "wheelSize",   label: "Wheel Size",                 type: "text" },
      { key: "wheelType",   label: "Wheel Type (Steel / Alloy)", type: "text" },
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
      { key: "insuranceAmount", label: "Insurance", type: "insurance" },
      { key: "brochure",        label: "Brochure",  type: "brochure" },
    ],
  },
];

/* ═══════════════════════════════════════════════════ */
export default function ComparisonDetail() {
  const { id1, id2, id3 } = useParams<{ id1: string; id2: string; id3?: string }>();
  const navigate = useNavigate();

  const [left,  setLeft]  = useState<ComparisonData | null>(null);
  const [right, setRight] = useState<ComparisonData | null>(null);
  const [third, setThird] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [leftVariants,  setLeftVariants]  = useState<VariantOption[]>([]);
  const [rightVariants, setRightVariants] = useState<VariantOption[]>([]);
  const [thirdVariants, setThirdVariants] = useState<VariantOption[]>([]);

  const [leftId,  setLeftId]  = useState(Number(id1));
  const [rightId, setRightId] = useState(Number(id2));
  const [thirdId, setThirdId] = useState(id3 ? Number(id3) : 0);

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username || "U");

  // FIX 1: isThree is derived from id3 URL param, not from the `third` state.
  // This is the source of truth — if the URL has 3 ids, it's always a 3-bike view.
  const isThree = Boolean(id3 && Number(id3) > 0);

  // FIX 2: bikeCount is now computed from isThree AND whether third data has
  // loaded. This means the grid shows the correct number of columns once data
  // arrives, without needing a separate re-render trigger.
  const bikeCount = isThree && third ? 3 : 2;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }

    const n1 = Number(id1);
    const n2 = Number(id2);
    // FIX 3: parse id3 safely — only pass a number if it's a valid positive int
    const n3 = id3 && Number(id3) > 0 ? Number(id3) : null;

    if (!n1 || !n2) {
      setError("Invalid comparison IDs in URL.");
      setLoading(false);
      return;
    }

    fetchAll(n1, n2, n3);
  }, [id1, id2, id3]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async (s1: number, s2: number, s3: number | null) => {
    setLoading(true);
    setError("");
    // Reset third so stale data never shows
    setThird(null);

    try {
      // FIX 4: Build all requests up-front then await together.
      // Previously `results[2]` could be accessed on a 2-element array
      // (TypeScript spreads don't guarantee length at runtime). Now we
      // handle the third result explicitly with a named variable.
      const [res1, res2, res3] = await Promise.all([
        axios.get<ComparisonData>(`/api/Comparison/${s1}`),
        axios.get<ComparisonData>(`/api/Comparison/${s2}`),
        s3 ? axios.get<ComparisonData>(`/api/Comparison/${s3}`) : Promise.resolve(null),
      ]);

      setLeft(res1.data);
      setRight(res2.data);

      // FIX 5: Only set third if it actually resolved to a real response
      if (res3) {
        setThird(res3.data);
      }

      // Fetch variant dropdowns in parallel — no need to await
      fetchVariants(s1, "left");
      fetchVariants(s2, "right");
      if (s3) fetchVariants(s3, "third");

    } catch (e) {
      console.error("Comparison fetch error:", e);
      setError("Failed to load comparison data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVariants = async (id: number, side: "left" | "right" | "third") => {
    try {
      const res = await axios.get<VariantOption[]>(`/api/Comparison/variants-by-scooty/${id}`);
      if (side === "left")  setLeftVariants(res.data);
      if (side === "right") setRightVariants(res.data);
      if (side === "third") setThirdVariants(res.data);
    } catch { /* variant dropdown failure is non-fatal */ }
  };

  const switchVariant = async (id: number, side: "left" | "right" | "third") => {
    try {
      const res = await axios.get<ComparisonData>(`/api/Comparison/${id}`);
      if (side === "left")  { setLeftId(id);  setLeft(res.data); }
      if (side === "right") { setRightId(id); setRight(res.data); }
      if (side === "third") { setThirdId(id); setThird(res.data); }
    } catch { /* silent — variant switch failure */ }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  /* Cell renderer */
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
      case "power":    return data.maxPowerKw != null ? `${data.maxPowerKw} kW` : "—";
      case "range":    return data.rangeKm    != null ? `${data.rangeKm} km/charge` : "—";
      case "bool":     return <BoolCell val={(data as never)[row.key] as boolean} />;
      case "colours":  return <ColourDots colours={data.colours} modelName={data.modelName} />;
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
          <a href={`${API_ORIGIN}${data.brochureUrl}`} target="_blank" rel="noreferrer"
            className="cmp-brochure-btn" onClick={e => e.stopPropagation()}>
            Download Brochure
          </a>
        ) : <span className="cmp-na">N/A</span>;
      default: {
        const val = (data as never)[row.key];
        return val != null && val !== "" ? String(val) : "—";
      }
    }
  };

  const colHead = (data: ComparisonData) =>
    `${data.modelName.length > 18 ? data.modelName.slice(0, 16) + "…" : data.modelName} ${data.variantName.length > 10 ? data.variantName.slice(0, 8) + "…" : data.variantName}`;

  /* Bike column */
  const BikeCol = ({
    data, variants, selectedId, side,
  }: {
    data: ComparisonData;
    variants: VariantOption[];
    selectedId: number;
    side: "left" | "right" | "third";
  }) => (
    <div className="cmpd-bike-col">
      <div className="cmpd-edit-row">
        <button className="cmpd-edit-icon" title="Change bike" onClick={() => navigate("/comparison")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
      </div>
      <img src={resolveImg(data.imageUrl)} className="cmpd-hero-img" alt={data.modelName}
        onError={e => { e.currentTarget.src = noImage; }} />
      <h3 className="cmpd-bike-title">
        {side === "left" ? "BGauss " : ""}{data.modelName}
      </h3>
      <select className="cmpd-variant-select" value={selectedId}
        onChange={e => switchVariant(Number(e.target.value), side)}>
        {variants.length === 0 ? (
          <option value={selectedId}>
            {data.variantName}{data.price ? ` — ${fmtPrice(data.price)}` : ""}
          </option>
        ) : variants.map(v => (
          <option key={v.scootyId} value={v.scootyId}>
            {v.variantName}{v.price ? ` — ${fmtPrice(v.price)}` : ""}
          </option>
        ))}
      </select>
      <div className="cmpd-hero-price">{fmtPrice(data.price)}</div>
      <button className="cmpd-offer-btn" onClick={() => navigate(`/vehicle/${data.scootyId}`)}>
        View Offers
      </button>
    </div>
  );

  /* ── Loading ── */
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
            {isThree && (
              <>
                <div className="cmpd-skel-mid" />
                <div className="cmpd-skel-box" />
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !left || !right) {
    return (
      <div className="cmpd-page">
        <main style={{ padding: 48, textAlign: "center", color: "#ef4444" }}>
          {error || "Data not found."}
          <br />
          <button onClick={() => navigate(-1)}
            style={{
              marginTop: 18, padding: "10px 24px", cursor: "pointer",
              background: "#111827", color: "#fff", border: "none",
              borderRadius: 10, fontFamily: "inherit", fontSize: 14,
            }}>
            ← Go Back
          </button>
        </main>
      </div>
    );
  }

  // FIX 6: If isThree but third hasn't loaded yet, show a loading indicator
  // instead of silently rendering a broken 2-column layout
  if (isThree && !third) {
    return (
      <div className="cmpd-page">
        <main className="cmpd-main">
          <div className="cmpd-skeleton-hero">
            <div className="cmpd-skel-box" />
            <div className="cmpd-skel-mid" />
            <div className="cmpd-skel-box" />
            <div className="cmpd-skel-mid" />
            <div className="cmpd-skel-box" />
          </div>
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
            <span className="dash-brand-page">
              {left.modelName} vs {right.modelName}{third ? ` vs ${third.modelName}` : ""}
            </span>
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
          <button className="dash-icon-btn cmpd-back-btn" onClick={() => navigate(-1)} title="Go Back" aria-label="Go Back" data-tip="Go Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="dash-actions">
            <button className="dash-icon-btn dash-btn-logout" onClick={handleLogout} title="Logout" aria-label="Logout" data-tip="Logout">
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

        {/* ── HERO ── */}
        <div
          className={`cmpd-hero-card${bikeCount === 3 ? " cmpd-hero-3" : ""}`}
          style={{ "--bike-count": bikeCount } as React.CSSProperties}
        >
          {/* Left utility col */}
          <div className="cmpd-add-col">
            <span className="cmpd-add-label" onClick={() => navigate("/comparison")}>
              + Add / Change Bike
            </span>
            <label className="cmpd-hide-label">
              <input type="checkbox" /> Hide Common
            </label>
          </div>

          <BikeCol data={left}  variants={leftVariants}  selectedId={leftId}  side="left" />
          <BikeCol data={right} variants={rightVariants} selectedId={rightId} side="right" />

          {/* FIX 7: guard with both bikeCount===3 AND third being non-null */}
          {bikeCount === 3 && third && (
            <BikeCol data={third} variants={thirdVariants} selectedId={thirdId} side="third" />
          )}
        </div>

        {/* ── HIGHLIGHTS TABLE ── */}
        <div className="cmpd-highlights-card">
          <h2 className="cmpd-highlights-title">
            {left.modelName} vs {right.modelName}
            {third ? ` vs ${third.modelName}` : ""} — Key Highlights
          </h2>

          {SECTIONS.map(section => (
            <div key={section.label} className="cmpd-section">

              <div
                className={`cmpd-table-row cmpd-section-header${bikeCount === 3 ? " cmpd-row-3" : ""}`}
                style={{ "--bike-count": bikeCount } as React.CSSProperties}
              >
                <div className="cmpd-col-label">{section.label}</div>
                <div className="cmpd-col-val cmpd-col-head">{colHead(left)}</div>
                <div className="cmpd-col-val cmpd-col-head">{colHead(right)}</div>
                {bikeCount === 3 && third && (
                  <div className="cmpd-col-val cmpd-col-head">{colHead(third)}</div>
                )}
              </div>

              {section.rows.map(row => (
                <div
                  key={row.key}
                  className={`cmpd-table-row${bikeCount === 3 ? " cmpd-row-3" : ""}`}
                  style={{ "--bike-count": bikeCount } as React.CSSProperties}
                >
                  <div className="cmpd-col-label cmpd-row-label">{row.label}</div>
                  <div className="cmpd-col-val">{renderCell(left, row)}</div>
                  <div className="cmpd-col-val">{renderCell(right, row)}</div>
                  {bikeCount === 3 && third && (
                    <div className="cmpd-col-val">{renderCell(third, row)}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}