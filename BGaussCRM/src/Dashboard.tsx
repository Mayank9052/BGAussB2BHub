import "./dashboard.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface Vehicle {
  scootyId: number;
  modelName: string;
  variantName: string;
  colourName: string;
  price: number;
  rangeKm: number;
  stockAvailable: boolean;
  imageUrl: string | null;
}

type VehicleApi = Vehicle & { imagePath?: string | null };

interface ModelOption   { id: number; modelName: string; }
interface VariantOption { id: number; variantName: string; }
interface ColourOption  { id: number; colourName: string; }

const CACHE_KEY     = "vehicles";
const IMG_CACHE_KEY = "vehicle_img_urls";

const resolveImageSrc = (path: string | null): string => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

const getInitials = (name: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const preloadImages = (urls: string[]) => {
  urls.forEach((url) => {
    if (!url || url === noImage) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
};

const saveImageUrlsToCache = (vehicles: Vehicle[]) => {
  try {
    const map: Record<number, string> = {};
    vehicles.forEach((v) => { if (v.imageUrl) map[v.scootyId] = resolveImageSrc(v.imageUrl); });
    localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(map));
  } catch { /* quota exceeded */ }
};

const loadCachedImageUrls = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem(IMG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [imgCache, setImgCache] = useState<Record<number, string>>(loadCachedImageUrls);

  // ── Search ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.modelName?.toLowerCase().includes(q)   ||
      v.variantName?.toLowerCase().includes(q) ||
      v.colourName?.toLowerCase().includes(q)  ||
      String(v.price   ?? "").includes(q)       ||
      String(v.rangeKm ?? "").includes(q)
    );
  });

  // ── Sheet ─────────────────────────────────────────────────
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState("");

  // ── Dropdowns ─────────────────────────────────────────────
  const [models,   setModels]   = useState<ModelOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [colours,  setColours]  = useState<ColourOption[]>([]);

  // ── Form fields ───────────────────────────────────────────
  const [modelId,        setModelId]        = useState<number | "">("");
  const [variantId,      setVariantId]      = useState<number | "">("");
  const [colourId,       setColourId]       = useState<number | "">("");
  const [price,          setPrice]          = useState("");
  const [batterySpecs,   setBatterySpecs]   = useState("");
  const [rangeKm,        setRangeKm]        = useState("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imagePreview,   setImagePreview]   = useState<string | null>(null);

  // ── Mobile menu ───────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navigate      = useNavigate();

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: Vehicle[] = JSON.parse(cached);
        setVehicles(parsed);
        setLoading(false);
        const cachedUrls = loadCachedImageUrls();
        if (Object.keys(cachedUrls).length > 0) preloadImages(Object.values(cachedUrls));
        else preloadImages(parsed.map((v) => resolveImageSrc(v.imageUrl)));
      } catch { /* corrupt cache */ }
    }

    void fetchVehicles();
    void fetchModels();
  }, [navigate]);

  // ── Outside click: mobile menu ────────────────────────────
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
        setMobileMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [mobileMenuOpen]);

  // ── Cascade dropdowns ─────────────────────────────────────
  useEffect(() => {
    if (modelId !== "") void fetchVariants(Number(modelId));
    else { setVariants([]); setVariantId(""); }
  }, [modelId]);

  useEffect(() => {
    if (modelId !== "" && variantId !== "") void fetchColours(Number(modelId), Number(variantId));
    else { setColours([]); setColourId(""); }
  }, [variantId]);

  // ── Fetchers ──────────────────────────────────────────────
  const fetchVehicles = async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        const res = await axios.get<VehicleApi[]>("/api/ScootyInventory/models-list");
        const normalized: Vehicle[] = res.data.map((item) => ({
          ...item, imageUrl: item.imageUrl ?? item.imagePath ?? null,
        }));
        setVehicles(normalized);
        setLoading(false);
        setError("");
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* quota */ }
        saveImageUrlsToCache(normalized);
        preloadImages(normalized.map((v) => resolveImageSrc(v.imageUrl)));
        const newMap: Record<number, string> = {};
        normalized.forEach((v) => { newMap[v.scootyId] = resolveImageSrc(v.imageUrl); });
        setImgCache(newMap);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
        retries--;
      }
    }
    setError("Failed to load vehicles");
    setLoading(false);
  };

  const fetchModels = async () => {
    try {
      const res = await axios.get<ModelOption[]>("/api/ScootyInventory/models");
      setModels(res.data);
    } catch { /* silent */ }
  };

  const fetchVariants = async (mId: number) => {
    try {
      const res = await axios.get<VariantOption[]>(`/api/ScootyInventory/variants/${mId}`);
      setVariants(res.data);
    } catch { setVariants([]); }
  };

  const fetchColours = async (mId: number, vId: number) => {
    try {
      const res = await axios.get<ColourOption[]>(`/api/ScootyInventory/colours?modelId=${mId}&variantId=${vId}`);
      setColours(res.data);
    } catch { setColours([]); }
  };

  const getImageSrc = useCallback(
    (v: Vehicle): string => imgCache[v.scootyId] ?? resolveImageSrc(v.imageUrl),
    [imgCache]
  );

  // ── Image picker ──────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else { setImagePreview(null); }
  };

  // ── Sheet helpers ─────────────────────────────────────────
  const openSheet  = () => { resetForm(); void fetchModels(); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setSubmitMsg(""); };

  const resetForm = () => {
    setModelId(""); setVariantId(""); setColourId("");
    setPrice(""); setBatterySpecs(""); setRangeKm("");
    setStockAvailable(true);
    setImageFile(null); setImagePreview(null); setSubmitMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (modelId === "" || variantId === "") { setSubmitMsg("Model and Variant are required."); return; }
    setSubmitting(true); setSubmitMsg("");
    try {
      const form = new FormData();
      form.append("modelId",   String(modelId));
      form.append("variantId", String(variantId));
      if (colourId !== "") form.append("colourId",     String(colourId));
      if (price)           form.append("price",        price);
      if (batterySpecs)    form.append("batterySpecs", batterySpecs);
      if (rangeKm)         form.append("rangeKm",      rangeKm);
      form.append("stockAvailable", String(stockAvailable));
      if (imageFile) form.append("image", imageFile);
      await axios.post("/api/ScootyInventory/add-item", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitMsg("✅ Item added successfully!");
      void fetchVehicles();
      setTimeout(() => closeSheet(), 1200);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data) : "Failed to add item.";
      setSubmitMsg(`❌ ${message}`);
    } finally { setSubmitting(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(CACHE_KEY);
    navigate("/", { replace: true });
  };

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* ═══ NAVBAR ══════════════════════════════════════════ */}
      <header className="dash-navbar">

        {/* LEFT */}
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">Dashboard</span>
          </div>
        </div>

        {/* CENTER — search */}
        <div className="dash-nav-center">
          <div className="dash-search-bar">
            <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="dash-search-input"
              type="text"
              placeholder="Search model, variant, colour…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="dash-search-clear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
          {searchQuery && (
            <span className="dash-search-count">
              {filteredVehicles.length === 0 ? "No results" : `${filteredVehicles.length} result${filteredVehicles.length > 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        {/* RIGHT */}
        <div className="dash-nav-right">

          {/* User pill */}
          <div className="dash-user-pill">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-user-info">
              <span className="dash-user-name">{username}</span>
              <span className="dash-user-role">{role}</span>
            </div>
          </div>
          <div className="dash-actions">
          {role === "admin" && (
            <button
              className="dash-icon-btn dash-btn-modules"
              onClick={() => navigate("/modules")}
              aria-label="Modules"
              data-tip="Modules"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
          )}

          <button
            className="dash-icon-btn dash-btn-comparison"
            onClick={() => navigate("/comparison")}
            aria-label="Comparisons"
            data-tip="Comparisons"
          >
          {/* vs icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/>
              <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="9 8 4 12 9 16"/>
              <polyline points="15 8 20 12 15 16"/>
          </svg>
          </button>


          <button
            className="dash-icon-btn dash-btn-logout"
            onClick={handleLogout}
            aria-label="Logout"
            data-tip="Logout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
    </div>
      </header>

      {/* ═══ CONTENT ══════════════════════════════════════════ */}
      <main className="dash-main">

        {/* Page title row */}
        <div className="dash-title-row">
          <div className="dash-title-left">
            <h1>Scooty Inventory</h1>
            <span className="dash-subtitle">
              {loading ? "Loading…" : `${filteredVehicles.length} vehicle${filteredVehicles.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <button className="dash-add-btn" onClick={openSheet} title="Add Item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Mobile search */}
        <div className="dash-mobile-search">
          <div className="dash-search-bar">
            <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="dash-search-input" type="text"
              placeholder="Search model, variant, colour…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button className="dash-search-clear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
        </div>

        {error && <div className="dash-error">⚠️ {error}</div>}

        {/* Vehicle grid */}
        <div className="dash-grid">

          {/* Skeletons */}
          {loading && vehicles.length === 0 && Array.from({ length: 8 }).map((_, i) => (
            <div className="dash-card dash-card--skeleton" key={i}>
              <div className="dash-skel-img" />
              <div className="dash-skel-body">
                <div className="dash-skel-line" />
                <div className="dash-skel-line short" />
                <div className="dash-skel-line shorter" />
              </div>
            </div>
          ))}

          {/* No results */}
          {!loading && searchQuery && filteredVehicles.length === 0 && (
            <div className="dash-no-results">
              <span>🔍</span>
              <p>No vehicles match "<strong>{searchQuery}</strong>"</p>
              <button onClick={() => setSearchQuery("")}>Clear search</button>
            </div>
          )}

          {/* Cards */}
          {filteredVehicles.map((v, index) => (
            <div
              className="dash-card"
              key={v.scootyId}
              onClick={() => navigate(`/vehicle/${v.scootyId}`)}
            >
              <div className="dash-card-img-wrap">
                <img
                  src={getImageSrc(v)}
                  className="dash-card-img"
                  loading={index < 6 ? "eager" : "lazy"}
                  decoding="async"
                  onError={(e) => { e.currentTarget.src = noImage; }}
                  alt={v.modelName}
                />
                {/* <span className={`dash-stock-badge ${v.stockAvailable ? "in" : "out"}`}>
                  {v.stockAvailable ? "In Stock" : "Out"}
                </span> */}
              </div>

              <div className="dash-card-body">
                <h3 className="dash-card-model">{v.modelName}</h3>
                <p className="dash-card-variant">{v.variantName}</p>
                <div className="dash-card-chips">
                  {v.rangeKm && <span className="dash-chip">🛣 {v.rangeKm} km</span>}
                  {v.price && <span className="dash-chip price">₹ {Number(v.price).toLocaleString("en-IN")}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ═══ BOTTOM SHEET ════════════════════════════════════ */}
      {sheetOpen && <div className="dash-overlay" onClick={closeSheet} />}

      <div className={`dash-sheet${sheetOpen ? " open" : ""}`}>
        <div className="dash-sheet-handle" />

        <div className="dash-sheet-header">
          <span className="dash-sheet-title">Add Inventory Item</span>
          <button className="dash-sheet-close" onClick={closeSheet}>✕</button>
        </div>

        <div className="dash-sheet-body">

          <div className="dash-form-group">
            <label>Model <span className="req">*</span></label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Select Model</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.modelName}</option>)}
            </select>
          </div>

          <div className="dash-form-group">
            <label>Variant <span className="req">*</span></label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value === "" ? "" : Number(e.target.value))} disabled={variants.length === 0}>
              <option value="">Select Variant</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.variantName}</option>)}
            </select>
          </div>

          <div className="dash-form-group">
            <label>Colour</label>
            <select value={colourId} onChange={(e) => setColourId(e.target.value === "" ? "" : Number(e.target.value))} disabled={colours.length === 0}>
              <option value="">Select Colour</option>
              {colours.map((c) => <option key={c.id} value={c.id}>{c.colourName}</option>)}
            </select>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-group">
              <label>Price (₹)</label>
              <input type="number" placeholder="e.g. 120000" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="dash-form-group">
              <label>Range (km)</label>
              <input type="number" placeholder="e.g. 120" value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} />
            </div>
          </div>

          <div className="dash-form-group">
            <label>Battery Specs</label>
            <input type="text" placeholder="e.g. 3.0 kWh Li-ion" value={batterySpecs} onChange={(e) => setBatterySpecs(e.target.value)} />
          </div>

          <div className="dash-form-group dash-form-toggle">
            <label>Stock Available</label>
            <label className="dash-toggle">
              <input type="checkbox" checked={stockAvailable} onChange={(e) => setStockAvailable(e.target.checked)} />
              <span className="dash-toggle-slider" />
            </label>
          </div>

          <div className="dash-form-group">
            <label>Image</label>
            <div className="dash-upload-box" onClick={() => fileInputRef.current?.click()}>
              {imagePreview
                ? <img src={imagePreview} className="dash-upload-preview" alt="preview" />
                : <div className="dash-upload-placeholder">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Tap to upload image</span>
                  </div>
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
          </div>

          {submitMsg && (
            <div className={`dash-submit-msg ${submitMsg.startsWith("✅") ? "success" : "fail"}`}>
              {submitMsg}
            </div>
          )}

          <div className="dash-sheet-actions">
            <button className="dash-btn-cancel" onClick={closeSheet}>Cancel</button>
            <button className="dash-btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}