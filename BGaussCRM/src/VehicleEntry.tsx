import "./VehicleEntry.css";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import logo from "./assets/logo.jpg";
import Tooltip from "./Tooltip";
import { useNavigate } from "react-router-dom";

/* ── TYPES ───────────────────────────────────────────── */
type Gender = "Male" | "Female" | "Other" | "";
type RequestType = "Quote" | "Test Ride" | "Brochure" | "Callback" | "";

interface VehicleEntryForm {
  customerName: string;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  gender: Gender;
  preferredModel: string;
  requestType: RequestType;
  preferredContact: string;
  notes: string;
}

const emptyForm: VehicleEntryForm = {
  customerName: "",
  mobileNumber: "",
  email: "",
  city: "",
  state: "",
  gender: "",
  preferredModel: "",
  requestType: "",
  preferredContact: "",
  notes: "",
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  const parts = name.split(" ");
  return parts.length > 1
    ? parts[0][0] + parts[1][0]
    : parts[0][0];
};

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function VehicleEntry() {
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  const initials = getInitials(username);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<VehicleEntryForm>(emptyForm);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* ── AUTH GUARD ── */
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
    }
  }, []);

  /* ── CLOSE MOBILE MENU ON OUTSIDE CLICK ── */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleFieldChange = (field: keyof VehicleEntryForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.mobileNumber.trim() || !form.city.trim()) {
      setErrorMessage("Please fill in the customer name, mobile number, and city.");
      setSuccessMessage("");
      return;
    }

    try {
      await axios.post("/api/CustomerRequests", {
        customerName:     form.customerName,
        mobileNumber:     form.mobileNumber,
        email:            form.email || undefined,
        city:             form.city,
        state:            form.state || undefined,
        gender:           form.gender || undefined,
        preferredModel:   form.preferredModel || undefined,
        requestType:      form.requestType || undefined,
        preferredContact: form.preferredContact || undefined,
        notes:            form.notes || undefined,
      });

      setSuccessMessage("Customer request submitted successfully. Opening vehicle details form...");
      setErrorMessage("");
      setForm(emptyForm);
      navigate("/vehicle/new");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? String(err.response.data)
          : "Failed to submit customer request.";
      setErrorMessage(message);
      setSuccessMessage("");
    }
  };

  return (
    <div className="ve-page">

      {/* ═════════ NAVBAR ═════════ */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss Logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Entry</span>
          </div>
        </div>

        <div className="pro-right">
          {/* ── Icon buttons with data-tip tooltips ── */}
          <div className="vc-icon-group">


            {/* Dashboard / Home */}
            <Tooltip text="Dashboard">
              <button
                className="vc-icon-btn btn-vc-dashboard"
                aria-label="Dashboard"
                onClick={() => navigate("/dashboard")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12L12 3l9 9" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </button>
            </Tooltip>

            {/* Logout */}
            <Tooltip text="Logout">
              <button
                className="vc-icon-btn btn-vc-logout"
                aria-label="Logout"
                onClick={handleLogout}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </Tooltip>
          </div>

          {/* ── User avatar pill ── */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initials}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* ── Mobile hamburger ── */}
          <div className="dash-mobile-wrap" ref={mobileMenuRef}>
            <button
              className={`dash-hamburger ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open navigation"
            >
              <span />
              <span />
              <span />
            </button>
            <div className={`dash-mobile-dd ${mobileMenuOpen ? "open" : ""}`}>
              <button onClick={() => navigate("/dashboard")}>Dashboard</button>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* ═════════ MAIN ═════════ */}
      <main className="ve-main">

        {/* Hero banner — gradient blue like screenshot */}
        <div className="ve-page-header">
          <h2>Customer Request</h2>
          <p>Capture customer contact details and vehicle request details.</p>
        </div>

        {/* Form card */}
        <div className="ve-form-wrapper">

          {/* Card header with + icon — matches screenshot */}
          <div className="ve-form-card-header">
            <div className="ve-form-card-icon">+</div>
            <p className="ve-form-card-title">Add New Customer Request</p>
            <p className="ve-form-card-subtitle">
              Fill in the details to register a new customer request
            </p>
          </div>

          <div className="ve-form-body">
            {successMessage && (
              <div className="ve-alert success">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="ve-alert error">{errorMessage}</div>
            )}

            {/* ── Contact fields — 3-col grid like screenshot ── */}
            <div className="ve-grid-2">
              <div className="ve-field">
                <label>Customer Name *</label>
                <input
                  value={form.customerName}
                  onChange={(e) => handleFieldChange("customerName", e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="ve-field">
                <label>Mobile Number *</label>
                <input
                  value={form.mobileNumber}
                  onChange={(e) => handleFieldChange("mobileNumber", e.target.value)}
                  placeholder="Enter mobile"
                />
              </div>
              <div className="ve-field">
                <label>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div className="ve-field">
                <label>City *</label>
                <input
                  value={form.city}
                  onChange={(e) => handleFieldChange("city", e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div className="ve-field">
                <label>State</label>
                <input
                  value={form.state}
                  onChange={(e) => handleFieldChange("state", e.target.value)}
                  placeholder="Enter state"
                />
              </div>
              <div className="ve-field">
                <label>Preferred Contact</label>
                <input
                  value={form.preferredContact}
                  onChange={(e) => handleFieldChange("preferredContact", e.target.value)}
                  placeholder="Contact No"
                />
              </div>
            </div>

            {/* ── Gender ── */}
            <div className="ve-section-divider">Gender</div>
            <div className="ve-radio-group">
              {(["Male", "Female", "Other"] as Gender[]).map((g) => (
                <div
                  key={g}
                  className={`ve-radio-chip ${form.gender === g ? "selected" : ""}`}
                  onClick={() => handleFieldChange("gender", g)}
                >
                  {g}
                </div>
              ))}
            </div>

            {/* ── Request Details ── */}
            <div className="ve-section-divider">Request Details</div>
            <div className="ve-grid-2">
              <div className="ve-field">
                <label>Preferred Model</label>
                <input
                  value={form.preferredModel}
                  onChange={(e) => handleFieldChange("preferredModel", e.target.value)}
                  placeholder="Enter model name"
                />
              </div>
              <div className="ve-field">
                <label>Request Type</label>
                <input
                  value={form.requestType}
                  onChange={(e) => handleFieldChange("requestType", e.target.value)}
                  placeholder="Quote / Test Ride / Brochure / Callback"
                />
              </div>
              <div className="ve-field ve-full-width">
                <label>Additional Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  placeholder="Add any extra details"
                  rows={4}
                />
              </div>
            </div>

            {/* ── Footer buttons ── */}
            <div className="ve-form-nav">
              <button
                className="ve-btn-ghost"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
              <button className="ve-btn-primary" onClick={handleSubmit}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}