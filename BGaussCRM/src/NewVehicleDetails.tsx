import "./VehicleEntry.css";
import logo from "./assets/logo.jpg";
import Tooltip from "./Tooltip";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface DropdownOption {
  id: number;
  modelName?: string;
  variantName?: string;
  colourName?: string;
}

export default function NewVehicleDetails() {
  const navigate = useNavigate();
  const [models, setModels] = useState<DropdownOption[]>([]);
  const [variants, setVariants] = useState<DropdownOption[]>([]);
  const [colours, setColours] = useState<DropdownOption[]>([]);

  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectedColour, setSelectedColour] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [rangeKm, setRangeKm] = useState<string>("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length > 1
      ? parts[0][0] + parts[1][0]
      : parts[0][0];
  };
  const initials = getInitials(username).toUpperCase();

  const variantFetchController = useRef<AbortController | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/");
  }, []);

  /* ── Close mobile menu on outside click ── */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
        setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  /* ── Load models ── */
  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>("/api/ScootyInventory/models");
        setModels(res.data);
        if (res.data.length > 0) setSelectedModel(res.data[0].id);
      } catch {
        setError("Failed to load vehicle models.");
      } finally {
        setLoading(false);
      }
    };
    loadModels();
  }, []);

  /* ── Load variants ── */
  useEffect(() => {
    if (selectedModel === null) { setVariants([]); setSelectedVariant(null); return; }
    variantFetchController.current?.abort();
    const controller = new AbortController();
    variantFetchController.current = controller;
    const loadVariants = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>(
          `/api/ScootyInventory/variants/${selectedModel}`,
          { signal: controller.signal }
        );
        setVariants(res.data);
        setSelectedVariant(res.data.length > 0 ? res.data[0].id : null);
      } catch (err: unknown) {
        if (!axios.isCancel(err)) {
          setError("Failed to load vehicle variants.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadVariants();
    return () => controller.abort();
  }, [selectedModel]);

  /* ── Load colours ── */
  useEffect(() => {
    if (selectedModel === null || selectedVariant === null) { setColours([]); setSelectedColour(null); return; }
    const loadColours = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>(
          `/api/ScootyInventory/colours?modelId=${selectedModel}&variantId=${selectedVariant}`
        );
        setColours(res.data);
        setSelectedColour(res.data.length > 0 ? res.data[0].id : null);
      } catch {
        setError("Failed to load colours for the selected variant.");
      } finally {
        setLoading(false);
      }
    };
    loadColours();
  }, [selectedModel, selectedVariant]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!selectedModel || !selectedVariant) {
      setError("Please choose a model and variant before submitting.");
      setMessage("");
      return;
    }
    const formData = new FormData();
    formData.append("modelId", String(selectedModel));
    formData.append("variantId", String(selectedVariant));
    if (selectedColour !== null) formData.append("colourId", String(selectedColour));
    if (price.trim()) formData.append("price", price.trim());
    if (rangeKm.trim()) formData.append("rangeKm", rangeKm.trim());
    formData.append("stockAvailable", String(stockAvailable));
    if (imageFile) formData.append("image", imageFile);

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post("/api/ScootyInventory/add-item", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const createdId = res.data?.data?.scootyId;
      if (!createdId) { setError("Vehicle item was created but no ID was returned."); return; }
      setMessage("Vehicle created successfully. Opening details...");
      window.setTimeout(() => navigate(`/vehicle/${createdId}`), 500);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data)
        : "Failed to save new vehicle details.";
      setError(msg);
    } finally {
      setSubmitting(false);
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
            <span className="pro-page">New Vehicle Details</span>
          </div>
        </div>

        <div className="pro-right">
          <div className="vc-icon-group">

            {/* Modules */}
            <Tooltip text="Modules">
              <button
                className="vc-icon-btn btn-vc-modules"
                aria-label="Modules"
                onClick={() => navigate("/dashboard")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </Tooltip>

            {/* Dashboard */}
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

          {/* User avatar pill */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initials}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="dash-mobile-wrap" ref={mobileMenuRef}>
            <button
              className={`dash-hamburger ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open navigation"
            >
              <span /><span /><span />
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

        {/* Hero banner */}
        <div className="ve-page-header">
          <h2>New Vehicle Details</h2>
          <p>Fill in the required fields to add a new vehicle record to inventory.</p>
        </div>

        {/* Form card */}
        <div className="ve-form-wrapper">

          {/* Card header with + icon */}
          <div className="ve-form-card-header">
            <div className="ve-form-card-icon">+</div>
            <p className="ve-form-card-title">Add New Vehicle</p>
            <p className="ve-form-card-subtitle">
              Select model, variant and colour then fill in pricing details
            </p>
          </div>

          <div className="ve-form-body">

            {loading   && <p className="vd-loading-text">Loading form options…</p>}
            {error     && <div className="ve-alert error">{error}</div>}
            {message   && <div className="ve-alert success">{message}</div>}

            {/* Fields grid */}
            <div className="ve-grid-2">

              <div className="ve-field">
                <label>Model</label>
                <select
                  value={selectedModel ?? ""}
                  onChange={(e) => setSelectedModel(Number(e.target.value) || null)}
                >
                  <option value="">Select model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.modelName ?? `Model ${m.id}`}</option>
                  ))}
                </select>
              </div>

              <div className="ve-field">
                <label>Variant</label>
                <select
                  value={selectedVariant ?? ""}
                  onChange={(e) => setSelectedVariant(Number(e.target.value) || null)}
                >
                  <option value="">Select variant</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.variantName ?? `Variant ${v.id}`}</option>
                  ))}
                </select>
              </div>

              <div className="ve-field">
                <label>Colour</label>
                <select
                  value={selectedColour ?? ""}
                  onChange={(e) => setSelectedColour(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select colour</option>
                  {colours.length > 0
                    ? colours.map((c) => (
                        <option key={c.id} value={c.id}>{c.colourName ?? `Colour ${c.id}`}</option>
                      ))
                    : <option value="">No colour assigned</option>
                  }
                </select>
              </div>

              <div className="ve-field">
                <label>Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                />
              </div>

              <div className="ve-field">
                <label>Range (km)</label>
                <input
                  type="number"
                  value={rangeKm}
                  onChange={(e) => setRangeKm(e.target.value)}
                  placeholder="Enter range"
                />
              </div>

              <div className="ve-field vd-checkbox-field">
                <label>Stock Available</label>
                <input
                  type="checkbox"
                  checked={stockAvailable}
                  onChange={(e) => setStockAvailable(e.target.checked)}
                  className="vd-checkbox"
                />
              </div>

              <div className="ve-field ve-full-width">
                <label>Vehicle Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="vd-file-input"
                />
              </div>

            </div>

            {/* Footer buttons */}
            <div className="ve-form-nav">
              <button
                className="ve-btn-ghost"
                onClick={() => navigate("/vehicle-entry")}
              >
                ← Back to Request
              </button>
              <button
                className="ve-btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Saving…" : "Save and View Details"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}