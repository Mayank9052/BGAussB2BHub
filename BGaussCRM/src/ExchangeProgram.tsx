// ═══════════════════════════════════════════════════════════════
// FILE: src/ExchangeProgram.tsx
// BGauss Certified Exchange & Buyback Program — S01 to S10
// ═══════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ExchangeProgram.css";
import logo from "./assets/logo.jpg";

// ── Types ─────────────────────────────────────────────────────
type Screen = "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08" | "S09" | "S10";

interface CustomerInfo {
  customerName: string;
  mobileNumber: string;
  city: string;
}

interface VehicleDetails {
  vehicleModel: string;
  registrationNo: string;
  yearOfPurchase: string;
  kmDriven: string;
}

interface ScoreEntry {
  category: string;
  parameter: string;
  score: number;
}

interface InspectionParam {
  category: string;
  parameters: string[];
}

const IMAGE_TYPES = ["Front", "Rear", "Left", "Right", "Odometer", "Battery"] as const;
type ImageType = typeof IMAGE_TYPES[number];

const IMAGE_ICONS: Record<ImageType, string> = {
  Front: "🔵", Rear: "🔴", Left: "🟢", Right: "🟡", Odometer: "🟠", Battery: "⚡"
};

const GRADE_CONFIG = {
  Excellent: { color: "#16a34a", bg: "#dcfce7", border: "#6ee7b7" },
  Good:      { color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  Average:   { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
};

// ── Step indicator data ────────────────────────────────────────
const SECTIONS = [
  { id: "S01", label: "Home",       section: 0 },
  { id: "S02", label: "Customer",   section: 1 },
  { id: "S03", label: "Vehicle",    section: 1 },
  { id: "S04", label: "Inspection", section: 2 },
  { id: "S05", label: "Score",      section: 2 },
  { id: "S06", label: "Images",     section: 3 },
  { id: "S07", label: "Error",      section: 3 },
  { id: "S08", label: "Price",      section: 4 },
  { id: "S09", label: "Summary",    section: 4 },
  { id: "S10", label: "Done",       section: 4 },
] as const;

const SECTION_LABELS = ["Login", "Vehicle Entry", "Inspection & Scoring", "Image Upload", "Price & Submission"];

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ExchangeProgram() {
  const navigate   = useNavigate();
  const username   = localStorage.getItem("username") ?? "Dealer";
  // const role       = localStorage.getItem("role") ?? "";
  const initials   = username.slice(0, 2).toUpperCase();

  // ── State ──────────────────────────────────────────────────
  const [screen, setScreen]           = useState<Screen>("S01");
  const [caseId, setCaseId]           = useState<number | null>(null);
  const [caseNumber, setCaseNumber]   = useState("");

  const [customer, setCustomer]       = useState<CustomerInfo>({ customerName: "", mobileNumber: "", city: "" });
  const [vehicle, setVehicle]         = useState<VehicleDetails>({ vehicleModel: "", registrationNo: "", yearOfPurchase: "", kmDriven: "" });

  const [inspParams, setInspParams]   = useState<InspectionParam[]>([]);
  const [scores, setScores]           = useState<Record<string, Record<string, number>>>({});

  const [gradeResult, setGradeResult] = useState<{ totalScore: number; grade: string } | null>(null);

  const [images, setImages]           = useState<Partial<Record<ImageType, { file: File; preview: string; uploaded: boolean }>>>({});
  const [uploading, setUploading]     = useState<Partial<Record<ImageType, boolean>>>({});
  const [missingImages, setMissingImages] = useState<string[]>([]);

  const [priceData, setPriceData]     = useState<{ recommended: number; minPrice: number; maxPrice: number; grade: string; totalScore: number } | null>(null);

  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const [models, setModels]           = useState<string[]>([]);

  const fileRefs = useRef<Partial<Record<ImageType, HTMLInputElement>>>({});

  // ── Load inspection params & models ────────────────────────
  useEffect(() => {
    axios.get<InspectionParam[]>("api/ExchangeCases/inspection-params")
      .then(r => {
        setInspParams(r.data);
        const initial: Record<string, Record<string, number>> = {};
        r.data.forEach(p => {
          initial[p.category] = {};
          p.parameters.forEach(param => { initial[p.category][param] = 5; });
        });
        setScores(initial);
      })
      .catch(() => {
        // Fallback
        const fallback: InspectionParam[] = [
          { category: "Battery",     parameters: ["Health", "Charge Capacity", "Physical Damage"] },
          { category: "Body",        parameters: ["Dents", "Scratches", "Paint Condition"] },
          { category: "Tyres",       parameters: ["Tread Depth", "Condition", "Age"] },
          { category: "Electricals", parameters: ["Lights", "Horn", "Indicators", "Charging Port"] },
          { category: "Misc",        parameters: ["Documentation", "Accessories", "Service History"] },
        ];
        setInspParams(fallback);
        const initial: Record<string, Record<string, number>> = {};
        fallback.forEach(p => {
          initial[p.category] = {};
          p.parameters.forEach(param => { initial[p.category][param] = 5; });
        });
        setScores(initial);
      });

    axios.get<{ id: number; modelName: string }[]>("api/ScootyInventory/models")
      .then(r => setModels(r.data.map(m => m.modelName)))
      .catch(() => setModels(["BG RUV 350", "BG MAX C12", "BG OoWah"]));
  }, []);

  // ── Validation helpers ─────────────────────────────────────
  const validateCustomer = () => {
    const e: Record<string, string> = {};
    if (!customer.customerName.trim()) e.customerName = "Full name is required";
    if (!/^\d{10}$/.test(customer.mobileNumber)) e.mobileNumber = "Enter a valid 10-digit mobile number";
    if (!customer.city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateVehicle = () => {
    const e: Record<string, string> = {};
    if (!vehicle.vehicleModel.trim()) e.vehicleModel = "Select a vehicle model";
    if (!vehicle.registrationNo.trim()) e.registrationNo = "Registration number is required";
    const yr = parseInt(vehicle.yearOfPurchase);
    if (!yr || yr < 2018 || yr > new Date().getFullYear()) e.yearOfPurchase = "Enter a valid year (2018–present)";
    const km = parseInt(vehicle.kmDriven);
    if (!km || km < 0 || km > 200000) e.kmDriven = "Enter KM driven (0–2,00,000)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── S02+S03 → API: start case ─────────────────────────────
  const handleStartCase = async () => {
    if (!validateCustomer() || !validateVehicle()) return;
    setLoading(true); setGlobalError("");
    try {
      const res = await axios.post<{ id: number; caseNumber: string }>("api/ExchangeCases/start", {
        ...customer,
        ...vehicle,
        yearOfPurchase: parseInt(vehicle.yearOfPurchase),
        kmDriven:       parseInt(vehicle.kmDriven),
      });
      setCaseId(res.data.id);
      setCaseNumber(res.data.caseNumber);
      goTo("S04");
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            setGlobalError(
            e.response?.data?.message ?? "Failed to create case. Please try again."
            );
        } else {
            setGlobalError("Something went wrong. Please try again.");
        }
    }
  };

  // ── S04 → save scores ─────────────────────────────────────
  const handleSaveScores = async () => {
    if (!caseId) return;
    setLoading(true); setGlobalError("");
    try {
      const payload: ScoreEntry[] = [];
      inspParams.forEach(p => {
        p.parameters.forEach(param => {
          payload.push({ category: p.category, parameter: param, score: scores[p.category]?.[param] ?? 5 });
        });
      });
      const res = await axios.post<{ totalScore: number; grade: string }>(`api/ExchangeCases/${caseId}/scores`, payload);
      setGradeResult(res.data);
      goTo("S05");
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            setGlobalError(
            e.response?.data?.message ?? "Failed to save scores. Please try again."
            );
        } else {
            setGlobalError("Unexpected error occurred.");
        }
    }
  };

  // ── S06: upload single image ──────────────────────────────
  const handleImageUpload = async (type: ImageType, file: File) => {
    const preview = URL.createObjectURL(file);
    setImages(prev => ({ ...prev, [type]: { file, preview, uploaded: false } }));
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const form = new FormData();
      form.append("imageType", type);
      form.append("image", file);
      await axios.post(`api/ExchangeCases/${caseId}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages(prev => ({ ...prev, [type]: { file, preview, uploaded: true } }));
    } catch {
      setImages(prev => { const n = { ...prev }; delete n[type]; return n; });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // ── S06 → validate all 6 images ──────────────────────────
  const handleImagesDone = () => {
    const missing = IMAGE_TYPES.filter(t => !images[t]?.uploaded);
    if (missing.length > 0) {
      setMissingImages(missing);
      goTo("S07");
    } else {
      handleGeneratePrice();
    }
  };

  // ── Generate price ────────────────────────────────────────
  const handleGeneratePrice = async () => {
    if (!caseId) return;
    setLoading(true); setGlobalError("");
    try {
      const res = await axios.post<{ recommended: number; minPrice: number; maxPrice: number; grade: string; totalScore: number }>(
        `api/ExchangeCases/${caseId}/generate-price`
      );
      setPriceData(res.data);
      goTo("S08");
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            const err = e.response?.data as {
            error?: string;
            missing?: string[];
            };

            if (err?.error === "ImagesMissing") {
            setMissingImages(err.missing ?? []);
            goTo("S07");
            } else {
            setGlobalError("Failed to generate price. Please try again.");
            }
        } else {
            setGlobalError("Unexpected error occurred.");
        }
    }
  };

  // ── Submit for admin ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!caseId) return;
    setLoading(true); setGlobalError("");
    try {
      await axios.post(`api/ExchangeCases/${caseId}/submit`);
      goTo("S10");
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            setGlobalError(
            e.response?.data ?? "Submission failed. Please try again."
            );
        } else {
            setGlobalError("Unexpected error occurred.");
        }
    }
  };

  const goTo = (s: Screen) => {
    setGlobalError("");
    setErrors({});
    setScreen(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Compute section progress ──────────────────────────────
  const sectionIndex = SECTIONS.find(s => s.id === screen)?.section ?? 0;

  const fmt = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

  // ── Score slider component ────────────────────────────────
  const ScoreSlider = ({ category, param }: { category: string; param: string }) => {
    const val = scores[category]?.[param] ?? 5;
    const color = val >= 8 ? "#16a34a" : val >= 5 ? "#d97706" : "#dc2626";
    return (
      <div className="ep-score-row">
        <span className="ep-score-label">{param}</span>
        <div className="ep-score-ctrl">
          <input
            type="range" min={1} max={10} value={val}
            onChange={e => setScores(prev => ({
              ...prev,
              [category]: { ...prev[category], [param]: parseInt(e.target.value) }
            }))}
            className="ep-slider"
            style={{ "--slider-color": color } as React.CSSProperties}
          />
          <span className="ep-score-val" style={{ color, background: color + "18" }}>{val}</span>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="ep-page">

      {/* ── Navbar ──────────────────────────────────────── */}
      <header className="ep-navbar">
        <div className="ep-nav-left">
          <img src={logo} alt="BGauss" className="ep-nav-logo" />
          <div className="ep-nav-brand">
            <span className="ep-brand-name">BGauss Exchange</span>
            <span className="ep-brand-sub">Certified Buyback Program</span>
          </div>
        </div>
        <div className="ep-nav-right">
          {caseNumber && (
            <span className="ep-case-pill">📋 {caseNumber}</span>
          )}
          <div className="ep-nav-user">
            <div className="ep-avatar">{initials}</div>
            <span className="ep-username">{username}</span>
          </div>
          <button className="ep-nav-back" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </div>
      </header>

      {/* ── Progress bar ────────────────────────────────── */}
      {screen !== "S01" && screen !== "S10" && (
        <div className="ep-progress-wrap">
          <div className="ep-progress-sections">
            {SECTION_LABELS.slice(1).map((label, i) => (
              <div key={label} className={`ep-prog-section ${i + 1 === sectionIndex ? "active" : i + 1 < sectionIndex ? "done" : ""}`}>
                <div className="ep-prog-dot">{i + 1 < sectionIndex ? "✓" : i + 2}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="ep-progress-bar">
            <div className="ep-progress-fill" style={{ width: `${Math.min(100, ((sectionIndex - 1) / 3) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* ── Global error ────────────────────────────────── */}
      {globalError && (
        <div className="ep-global-error">
          <span>⚠</span> {globalError}
          <button onClick={() => setGlobalError("")}>✕</button>
        </div>
      )}

      <main className="ep-main">

        {/* ══════════════════════════════
            S01 — HOME / DASHBOARD
        ══════════════════════════════ */}
        {screen === "S01" && (
          <div className="ep-screen ep-s01">
            <div className="ep-s01-hero">
              <div className="ep-s01-badge">🔄 Certified Exchange Program</div>
              <h1>BGauss EV Exchange<br /><span>& Buyback</span></h1>
              <p>Seamlessly evaluate and process used BGauss EVs for certified exchange or buyback. Complete inspection → price generation → admin approval in one flow.</p>
              <button className="ep-btn-primary ep-btn-large" onClick={() => goTo("S02")}>
                + Start New Exchange Case
              </button>
            </div>

            <div className="ep-s01-how">
              <h3>How It Works</h3>
              <div className="ep-s01-steps">
                {[
                  { n: "1", t: "Customer Info", d: "Enter customer details and contact info", icon: "👤" },
                  { n: "2", t: "Vehicle Details", d: "Log vehicle model, registration & KM driven", icon: "🛵" },
                  { n: "3", t: "Inspection", d: "Score battery, body, tyres, electricals & misc", icon: "🔍" },
                  { n: "4", t: "Upload Photos", d: "6 mandatory views: Front, Rear, Left, Right, Odometer, Battery", icon: "📷" },
                  { n: "5", t: "Price Range", d: "System generates recommended price band (read-only)", icon: "💰" },
                  { n: "6", t: "Admin Approval", d: "Admin reviews and approves the final price", icon: "✅" },
                ].map(s => (
                  <div className="ep-s01-step" key={s.n}>
                    <div className="ep-s01-step-icon">{s.icon}</div>
                    <div className="ep-s01-step-num">{s.n}</div>
                    <div className="ep-s01-step-title">{s.t}</div>
                    <div className="ep-s01-step-desc">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ep-s01-notice">
              <span>ℹ</span>
              <p>The system auto-generates a price range based on vehicle condition, age, and KM driven. Dealers <strong>cannot modify</strong> the system price — it goes directly for Admin approval.</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S02 — CUSTOMER INFO FORM
        ══════════════════════════════ */}
        {screen === "S02" && (
          <div className="ep-screen ep-form-screen">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">👤</div>
              <h2>Customer Information</h2>
              <p>Enter the customer's contact details — all fields are mandatory</p>
            </div>

            <div className="ep-form-card">
              <div className="ep-field-grid">
                <div className="ep-field">
                  <label>Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="Customer's full name"
                    value={customer.customerName}
                    onChange={e => setCustomer(p => ({ ...p, customerName: e.target.value }))}
                    className={errors.customerName ? "error" : ""}
                  />
                  {errors.customerName && <span className="ep-err">{errors.customerName}</span>}
                </div>

                <div className="ep-field">
                  <label>Mobile Number <span className="req">*</span></label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={customer.mobileNumber}
                    maxLength={10}
                    onChange={e => setCustomer(p => ({ ...p, mobileNumber: e.target.value.replace(/\D/g, "") }))}
                    className={errors.mobileNumber ? "error" : ""}
                  />
                  {errors.mobileNumber && <span className="ep-err">{errors.mobileNumber}</span>}
                </div>

                <div className="ep-field ep-field-full">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="Customer's city"
                    value={customer.city}
                    onChange={e => setCustomer(p => ({ ...p, city: e.target.value }))}
                    className={errors.city ? "error" : ""}
                  />
                  {errors.city && <span className="ep-err">{errors.city}</span>}
                </div>
              </div>
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S01")}>← Back</button>
              <button className="ep-btn-primary" onClick={() => {
                if (validateCustomer()) goTo("S03");
              }}>Next: Vehicle Details →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S03 — VEHICLE DETAILS FORM
        ══════════════════════════════ */}
        {screen === "S03" && (
          <div className="ep-screen ep-form-screen">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">🛵</div>
              <h2>Vehicle Details</h2>
              <p>Enter the vehicle information for <strong>{customer.customerName}</strong></p>
            </div>

            <div className="ep-form-card">
              <div className="ep-field-grid">
                <div className="ep-field">
                  <label>Vehicle Model <span className="req">*</span></label>
                  <select
                    value={vehicle.vehicleModel}
                    onChange={e => setVehicle(p => ({ ...p, vehicleModel: e.target.value }))}
                    className={errors.vehicleModel ? "error" : ""}
                  >
                    <option value="">Select Model</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.vehicleModel && <span className="ep-err">{errors.vehicleModel}</span>}
                </div>

                <div className="ep-field">
                  <label>Registration Number <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. MH12AB1234"
                    value={vehicle.registrationNo}
                    onChange={e => setVehicle(p => ({ ...p, registrationNo: e.target.value.toUpperCase() }))}
                    className={errors.registrationNo ? "error" : ""}
                  />
                  {errors.registrationNo && <span className="ep-err">{errors.registrationNo}</span>}
                </div>

                <div className="ep-field">
                  <label>Year of Purchase <span className="req">*</span></label>
                  <input
                    type="number"
                    placeholder={`e.g. 2022`}
                    min={2018}
                    max={new Date().getFullYear()}
                    value={vehicle.yearOfPurchase}
                    onChange={e => setVehicle(p => ({ ...p, yearOfPurchase: e.target.value }))}
                    className={errors.yearOfPurchase ? "error" : ""}
                  />
                  {errors.yearOfPurchase && <span className="ep-err">{errors.yearOfPurchase}</span>}
                </div>

                <div className="ep-field">
                  <label>KM Driven <span className="req">*</span></label>
                  <input
                    type="number"
                    placeholder="Total kilometres driven"
                    min={0}
                    max={200000}
                    value={vehicle.kmDriven}
                    onChange={e => setVehicle(p => ({ ...p, kmDriven: e.target.value }))}
                    className={errors.kmDriven ? "error" : ""}
                  />
                  {errors.kmDriven && <span className="ep-err">{errors.kmDriven}</span>}
                </div>
              </div>
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S02")}>← Back</button>
              <button className="ep-btn-primary" onClick={handleStartCase} disabled={loading}>
                {loading ? <><span className="ep-spinner" /> Creating Case…</> : "Start Inspection →"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S04 — INSPECTION PARAMETERS
        ══════════════════════════════ */}
        {screen === "S04" && (
          <div className="ep-screen ep-s04">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">🔍</div>
              <h2>Inspection & Scoring</h2>
              <p>Score each parameter from 1 (Poor) to 10 (Excellent) for <strong>{vehicle.vehicleModel}</strong> — {vehicle.registrationNo}</p>
            </div>

            <div className="ep-inspection-grid">
              {inspParams.map(p => (
                <div className="ep-category-card" key={p.category}>
                  <div className="ep-category-header">
                    <span className="ep-category-dot" />
                    <h3>{p.category}</h3>
                    <span className="ep-category-avg">
                      Avg: {p.parameters.length > 0
                        ? (p.parameters.reduce((s, param) => s + (scores[p.category]?.[param] ?? 5), 0) / p.parameters.length).toFixed(1)
                        : "–"}
                    </span>
                  </div>
                  {p.parameters.map(param => (
                    <ScoreSlider key={param} category={p.category} param={param} />
                  ))}
                </div>
              ))}
            </div>

            <div className="ep-score-legend">
              <span className="leg-bad">1–4 Average</span>
              <span className="leg-ok">5–8 Good</span>
              <span className="leg-good">9–10 Excellent</span>
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S03")}>← Back</button>
              <button className="ep-btn-primary" onClick={handleSaveScores} disabled={loading}>
                {loading ? <><span className="ep-spinner" /> Saving…</> : "Confirm Scores →"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S05 — SCORE SUMMARY
        ══════════════════════════════ */}
        {screen === "S05" && gradeResult && (
          <div className="ep-screen ep-s05">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">📊</div>
              <h2>Score Summary</h2>
              <p>Inspection complete for <strong>{vehicle.vehicleModel}</strong></p>
            </div>

            <div className="ep-grade-card" style={{
              border: `2px solid ${GRADE_CONFIG[gradeResult.grade as keyof typeof GRADE_CONFIG]?.border ?? "#e5e7eb"}`,
              background: GRADE_CONFIG[gradeResult.grade as keyof typeof GRADE_CONFIG]?.bg ?? "#fff",
            }}>
              <div className="ep-grade-score">{gradeResult.totalScore.toFixed(1)}<span>/10</span></div>
              <div className="ep-grade-label" style={{ color: GRADE_CONFIG[gradeResult.grade as keyof typeof GRADE_CONFIG]?.color ?? "#374151" }}>
                {gradeResult.grade}
              </div>
              <div className="ep-grade-desc">
                {gradeResult.grade === "Excellent" && "Vehicle is in excellent condition — top price band expected."}
                {gradeResult.grade === "Good"      && "Vehicle is in good condition — mid price band expected."}
                {gradeResult.grade === "Average"   && "Vehicle shows significant wear — lower price band will apply."}
              </div>
            </div>

            <div className="ep-scores-breakdown">
              {inspParams.map(p => {
                const avg = p.parameters.reduce((s, param) => s + (scores[p.category]?.[param] ?? 5), 0) / (p.parameters.length || 1);
                const color = avg >= 8 ? "#16a34a" : avg >= 5 ? "#d97706" : "#dc2626";
                return (
                  <div className="ep-breakdown-row" key={p.category}>
                    <span className="ep-bd-cat">{p.category}</span>
                    <div className="ep-bd-bar-wrap">
                      <div className="ep-bd-bar" style={{ width: `${avg * 10}%`, background: color }} />
                    </div>
                    <span className="ep-bd-score" style={{ color }}>{avg.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S04")}>← Re-score</button>
              <button className="ep-btn-primary" onClick={() => goTo("S06")}>Next: Upload Photos →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S06 — IMAGE UPLOAD
        ══════════════════════════════ */}
        {screen === "S06" && (
          <div className="ep-screen ep-s06">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">📷</div>
              <h2>Mandatory Photo Upload</h2>
              <p>All 6 photos must be uploaded before proceeding. Clear, well-lit photos only.</p>
            </div>

            <div className="ep-upload-stats">
              <span className="ep-up-done">{IMAGE_TYPES.filter(t => images[t]?.uploaded).length}</span>
              <span>of 6 photos uploaded</span>
              <div className="ep-up-progress">
                <div style={{ width: `${(IMAGE_TYPES.filter(t => images[t]?.uploaded).length / 6) * 100}%` }} />
              </div>
            </div>

            <div className="ep-upload-grid">
              {IMAGE_TYPES.map(type => {
                const img      = images[type];
                const isUp     = uploading[type];
                const uploaded = img?.uploaded;

                return (
                  <div
                    key={type}
                    className={`ep-upload-cell ${uploaded ? "uploaded" : ""} ${isUp ? "uploading" : ""}`}
                    onClick={() => !isUp && fileRefs.current[type]?.click()}
                  >
                    {img?.preview ? (
                      <div className="ep-upload-preview-wrap">
                        <img src={img.preview} alt={type} className="ep-upload-preview" />
                        {uploaded && <div className="ep-upload-check">✓</div>}
                        {isUp && <div className="ep-upload-overlay"><span className="ep-spinner white" /></div>}
                      </div>
                    ) : (
                      <div className="ep-upload-placeholder">
                        <span className="ep-upload-icon">{IMAGE_ICONS[type]}</span>
                        {isUp
                          ? <><span className="ep-spinner" /><span>Uploading…</span></>
                          : <><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg><span>Tap to upload</span></>
                        }
                      </div>
                    )}
                    <div className="ep-upload-label">
                      {type} View {uploaded ? "✓" : ""}
                    </div>
                    <input
                      ref={el => { if (el) fileRefs.current[type] = el; }}
                      type="file" accept="image/*" capture="environment"
                      style={{ display: "none" }}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(type, f);
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S05")}>← Back</button>
              <button className="ep-btn-primary" onClick={handleImagesDone} disabled={loading}>
                {loading ? <><span className="ep-spinner" /> Generating Price…</> : "Generate Price Range →"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S07 — IMAGE VALIDATION ERROR
        ══════════════════════════════ */}
        {screen === "S07" && (
          <div className="ep-screen ep-s07">
            <div className="ep-error-card">
              <div className="ep-error-icon">⚠️</div>
              <h2>Missing Required Photos</h2>
              <p>The following photos are missing. Please upload them before proceeding:</p>
              <div className="ep-missing-list">
                {missingImages.map(m => (
                  <div key={m} className="ep-missing-item">
                    <span>{IMAGE_ICONS[m as ImageType] ?? "📸"}</span>
                    <span>{m} View</span>
                    <span className="ep-missing-badge">Required</span>
                  </div>
                ))}
              </div>
              <p className="ep-error-note">All 6 photos (Front, Rear, Left Side, Right Side, Odometer, Battery) must be clear and well-lit.</p>
              <button className="ep-btn-primary ep-btn-large" onClick={() => goTo("S06")}>
                ← Go Back & Upload Missing Photos
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S08 — PRICE RANGE DISPLAY (READ-ONLY)
        ══════════════════════════════ */}
        {screen === "S08" && priceData && (
          <div className="ep-screen ep-s08">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">💰</div>
              <h2>System-Generated Price Range</h2>
              <p>Based on inspection score and vehicle condition. <strong>This price range is read-only.</strong></p>
            </div>

            <div className="ep-readonly-banner">
              🔒 Dealer CANNOT edit or override the price range. Prices are auto-generated by the system.
            </div>

            <div className="ep-price-card">
              <div className="ep-price-rec">
                <span className="ep-price-label">Recommended Price</span>
                <span className="ep-price-val">{fmt(priceData.recommended)}</span>
              </div>
              <div className="ep-price-band">
                <div className="ep-price-band-item min">
                  <span>Min Price</span>
                  <strong>{fmt(priceData.minPrice)}</strong>
                </div>
                <div className="ep-price-band-bar">
                  <div className="ep-band-fill" />
                  <div className="ep-band-dot" style={{ left: "50%" }} title="Recommended" />
                </div>
                <div className="ep-price-band-item max">
                  <span>Max Price</span>
                  <strong>{fmt(priceData.maxPrice)}</strong>
                </div>
              </div>
              <div className="ep-price-meta">
                <div>
                  <span>Grade</span>
                  <strong style={{ color: GRADE_CONFIG[priceData.grade as keyof typeof GRADE_CONFIG]?.color ?? "#374151" }}>
                    {priceData.grade}
                  </strong>
                </div>
                <div>
                  <span>Total Score</span>
                  <strong>{priceData.totalScore.toFixed(1)} / 10</strong>
                </div>
                <div>
                  <span>KM Driven</span>
                  <strong>{parseInt(vehicle.kmDriven).toLocaleString("en-IN")} km</strong>
                </div>
                <div>
                  <span>Year</span>
                  <strong>{vehicle.yearOfPurchase}</strong>
                </div>
              </div>
            </div>

            <div className="ep-screen-nav">
              <span />
              <button className="ep-btn-primary" onClick={() => goTo("S09")}>Review & Submit →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S09 — SUBMISSION SUMMARY
        ══════════════════════════════ */}
        {screen === "S09" && priceData && (
          <div className="ep-screen ep-s09">
            <div className="ep-screen-header">
              <div className="ep-screen-icon">📋</div>
              <h2>Submission Summary</h2>
              <p>Please review all details before submitting for Admin approval.</p>
            </div>

            <div className="ep-summary-grid">
              <div className="ep-summary-section">
                <h4>👤 Customer Info</h4>
                <div className="ep-summary-rows">
                  <div><span>Name</span><strong>{customer.customerName}</strong></div>
                  <div><span>Mobile</span><strong>{customer.mobileNumber}</strong></div>
                  <div><span>City</span><strong>{customer.city}</strong></div>
                </div>
              </div>

              <div className="ep-summary-section">
                <h4>🛵 Vehicle Details</h4>
                <div className="ep-summary-rows">
                  <div><span>Model</span><strong>{vehicle.vehicleModel}</strong></div>
                  <div><span>Reg. No.</span><strong>{vehicle.registrationNo}</strong></div>
                  <div><span>Year</span><strong>{vehicle.yearOfPurchase}</strong></div>
                  <div><span>KM Driven</span><strong>{parseInt(vehicle.kmDriven).toLocaleString("en-IN")} km</strong></div>
                </div>
              </div>

              <div className="ep-summary-section">
                <h4>🔍 Inspection</h4>
                <div className="ep-summary-rows">
                  <div><span>Score</span><strong>{priceData.totalScore.toFixed(1)} / 10</strong></div>
                  <div><span>Grade</span>
                    <strong style={{ color: GRADE_CONFIG[priceData.grade as keyof typeof GRADE_CONFIG]?.color ?? "#374151" }}>
                      {priceData.grade}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="ep-summary-section">
                <h4>📷 Photos</h4>
                <div className="ep-summary-rows">
                  {IMAGE_TYPES.map(t => (
                    <div key={t}><span>{t} View</span>
                      <strong style={{ color: images[t]?.uploaded ? "#16a34a" : "#dc2626" }}>
                        {images[t]?.uploaded ? "✓ Uploaded" : "✗ Missing"}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ep-summary-section ep-summary-price">
                <h4>💰 System Price Range</h4>
                <div className="ep-summary-rows">
                  <div><span>Min</span><strong>{fmt(priceData.minPrice)}</strong></div>
                  <div><span>Recommended</span><strong className="ep-price-highlight">{fmt(priceData.recommended)}</strong></div>
                  <div><span>Max</span><strong>{fmt(priceData.maxPrice)}</strong></div>
                </div>
              </div>
            </div>

            <div className="ep-submit-confirm">
              <span>ℹ</span>
              <p>By submitting, this case will be sent to BGauss Admin for price approval. You will be notified once reviewed.</p>
            </div>

            <div className="ep-screen-nav">
              <button className="ep-btn-ghost" onClick={() => goTo("S08")}>← Back</button>
              <button className="ep-btn-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="ep-spinner" /> Submitting…</> : "🚀 Submit for Admin Approval"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            S10 — SUBMISSION CONFIRMATION
        ══════════════════════════════ */}
        {screen === "S10" && (
          <div className="ep-screen ep-s10">
            <div className="ep-success-card">
              <div className="ep-success-anim">
                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="40" r="38" stroke="#16a34a" strokeWidth="3" strokeDasharray="240" strokeDashoffset="0" className="ep-circle-anim" />
                  <polyline points="24,42 35,53 58,28" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="ep-check-anim" />
                </svg>
              </div>
              <h2>Case Submitted!</h2>
              <p className="ep-success-case">Case ID: <strong>{caseNumber}</strong></p>
              <p>Status: <span className="ep-status-pending">⏳ Pending Admin Review</span></p>
              <p className="ep-success-msg">Your exchange case has been submitted successfully. BGauss Admin will review the inspection data, photos, and system price range and notify you of the decision.</p>

              <div className="ep-success-info">
                <div><span>Customer</span><strong>{customer.customerName}</strong></div>
                <div><span>Vehicle</span><strong>{vehicle.vehicleModel} · {vehicle.registrationNo}</strong></div>
                {priceData && <div><span>Price Range</span><strong>{fmt(priceData.minPrice)} – {fmt(priceData.maxPrice)}</strong></div>}
              </div>

              <div className="ep-s10-actions">
                <button className="ep-btn-ghost" onClick={() => {
                  // Reset all state for new case
                  setScreen("S01");
                  setCaseId(null); setCaseNumber("");
                  setCustomer({ customerName: "", mobileNumber: "", city: "" });
                  setVehicle({ vehicleModel: "", registrationNo: "", yearOfPurchase: "", kmDriven: "" });
                  setImages({}); setPriceData(null); setGradeResult(null);
                  setGlobalError(""); setErrors({});
                }}>
                  Start Another Case
                </button>
                <button className="ep-btn-primary" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}