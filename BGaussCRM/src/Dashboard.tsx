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

type VehicleApi = Vehicle & {
  imagePath?: string | null;
};

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

// ── Preload a list of image URLs into browser cache ─────────
const preloadImages = (urls: string[]) => {
  urls.forEach((url) => {
    if (!url || url === noImage) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
};

// ── Persist image URLs to localStorage for next session ─────
const saveImageUrlsToCache = (vehicles: Vehicle[]) => {
  try {
    const map: Record<number, string> = {};
    vehicles.forEach((v) => {
      if (v.imageUrl) map[v.scootyId] = resolveImageSrc(v.imageUrl);
    });
    localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(map));
  } catch { /* quota exceeded — skip */ }
};

// ── Read cached image URL map ─────────────────────────────────
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

  // Image URL cache (resolved absolute URLs keyed by scootyId)
  const [imgCache, setImgCache] = useState<Record<number, string>>(loadCachedImageUrls);

  // ── Search ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.modelName?.toLowerCase().includes(q)  ||
      v.variantName?.toLowerCase().includes(q) ||
      v.colourName?.toLowerCase().includes(q)  ||
      String(v.price   ?? "").includes(q)      ||
      String(v.rangeKm ?? "").includes(q)
    );
  });

  // ── Sheet ─────────────────────────────────────────────────
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState("");

  // ── Dropdown options ──────────────────────────────────────
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

  // ── Menu state ────────────────────────────────────────────
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef  = useRef<HTMLDivElement>(null);
  const navigate       = useNavigate();

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }

    // 1. INSTANT: paint from localStorage cache immediately
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: Vehicle[] = JSON.parse(cached);
        setVehicles(parsed);
        setLoading(false);

        // 2. INSTANT: preload images from persisted URL map so
        //    browser fetches from its HTTP cache right away
        const cachedUrls = loadCachedImageUrls();
        if (Object.keys(cachedUrls).length > 0) {
          preloadImages(Object.values(cachedUrls));
        } else {
          // Fallback: preload from parsed vehicle data
          preloadImages(parsed.map((v) => resolveImageSrc(v.imageUrl)));
        }
      } catch { /* corrupt cache — ignore */ }
    }

    fetchVehicles();
    fetchModels();
  }, [navigate]);

  // ── Outside-click: desktop menu ──────────────────────────
  useEffect(() => {
    if (!desktopMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node))
        setDesktopMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [desktopMenuOpen]);

  // ── Outside-click: mobile menu ───────────────────────────
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
    if (modelId !== "") fetchVariants(Number(modelId));
    else { setVariants([]); setVariantId(""); }
  }, [modelId]);

  useEffect(() => {
    if (modelId !== "" && variantId !== "")
      fetchColours(Number(modelId), Number(variantId));
    else { setColours([]); setColourId(""); }
  }, [variantId]);

  // ── Fetchers ──────────────────────────────────────────────
  const fetchVehicles = async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        const res = await axios.get<VehicleApi[]>("/api/ScootyInventory/models-list");
        const normalized: Vehicle[] = res.data.map((item) => ({
          ...item,
          imageUrl: item.imageUrl ?? item.imagePath ?? null,
        }));

        setVehicles(normalized);
        setLoading(false);
        setError("");

        // Persist to localStorage
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* quota */ }

        // Persist resolved image URLs + preload them
        saveImageUrlsToCache(normalized);
        const resolvedUrls = normalized.map((v) => resolveImageSrc(v.imageUrl));
        preloadImages(resolvedUrls);

        // Update in-memory img cache for instant re-renders
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

  // ── Resolve image: use in-memory cache first ─────────────
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
    } else {
      setImagePreview(null);
    }
  };

  // ── Sheet helpers ─────────────────────────────────────────
  const openSheet  = () => { resetForm(); fetchModels(); setSheetOpen(true); };
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
    if (modelId === "" || variantId === "") {
      setSubmitMsg("Model and Variant are required.");
      return;
    }
    setSubmitting(true);
    setSubmitMsg("");
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
      fetchVehicles();
      setTimeout(() => closeSheet(), 1200);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data
          ? String(err.response.data)
          : "Failed to add item.";
      setSubmitMsg(`❌ ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(CACHE_KEY);
    // Keep IMG_CACHE_KEY so images load fast on next login
    navigate("/", { replace: true });
  };

  // ── Derived ───────────────────────────────────────────────
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username);

  // ── Shared dropdown items renderer ───────────────────────
  const renderDropdownItems = (onClose: () => void) => (
    <>
      {role === "admin" && (
        <button
          className="desktop-dd-item"
          onClick={() => { onClose(); navigate("/modules"); }}
        >
          <div className="desktop-dd-icon blue">⊞</div>
          <div className="desktop-dd-text">
            <span className="desktop-dd-title">Modules</span>
            <span className="desktop-dd-sub">Manage modules</span>
          </div>
        </button>
      )}
      <div className="desktop-dd-divider" />
      <button
        className="desktop-dd-item danger"
        onClick={() => { onClose(); handleLogout(); }}
      >
        <div className="desktop-dd-icon red">⏻</div>
        <div className="desktop-dd-text">
          <span className="desktop-dd-title">Logout</span>
          <span className="desktop-dd-sub">Sign out of account</span>
        </div>
      </button>
    </>
  );

  // ─────────────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* ═══ NAVBAR ═══════════════════════════════════════════ */}
      <header className="pro-navbar">

        {/* LEFT */}
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Dashboard</span>
          </div>
        </div>

        {/* CENTER — search bar */}
        <div className="pro-center">
          <div className="nav-search-wrapper">
            <div className="nav-search-bar">
              <span className="nav-search-icon">
                <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="nav-search-input"
                type="text"
                placeholder="Search model, variant, colour..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="nav-search-clear" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>
            {searchQuery && (
              <span className="nav-search-count">
                {filteredVehicles.length === 0
                  ? "No results"
                  : `${filteredVehicles.length} result${filteredVehicles.length > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="pro-right">

          {/* Desktop dropdown */}
          <div className="desktop-user-wrapper" ref={desktopMenuRef}>
            <button
              className={`desktop-user-trigger${desktopMenuOpen ? " open" : ""}`}
              onClick={() => setDesktopMenuOpen((p) => !p)}
              aria-label="User menu"
              aria-expanded={desktopMenuOpen}
            >
              <div className="desktop-avatar">{initials}</div>
              <div className="desktop-user-info">
                <span className="desktop-user-name">{username}</span>
                <span className="desktop-user-role">{role}</span>
              </div>
              <span className="desktop-chevron">▾</span>
            </button>

            <div className={`desktop-dropdown${desktopMenuOpen ? " is-open" : ""}`}>
              <div className="desktop-dd-header">
                <div className="desktop-dd-avatar">{initials}</div>
                <div>
                  <span className="desktop-dd-name">{username}</span>
                  <span className="desktop-dd-role-badge">{role}</span>
                </div>
              </div>
              <div className="desktop-dd-divider" />
              <div className="desktop-dd-label">Actions</div>
              {renderDropdownItems(() => setDesktopMenuOpen(false))}
            </div>
          </div>

          {/* Mobile ⋮ menu */}
          <div className="mobile-nav-wrapper" ref={mobileMenuRef}>
            <button
              className={`mobile-menu-btn${mobileMenuOpen ? " open" : ""}`}
              onClick={() => setMobileMenuOpen((p) => !p)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              ⋮
            </button>

            <div className={`mobile-icon-dropdown${mobileMenuOpen ? " is-open" : ""}`}>
              <div className="mobile-dd-user">
                <div className="mobile-dd-avatar">{initials}</div>
                <div>
                  <div className="mobile-dd-username">{username}</div>
                  <div className="mobile-dd-role">{role}</div>
                </div>
              </div>
              <div className="mobile-dropdown-divider" />
              <div className="mobile-dropdown-label">Actions</div>
              {role === "admin" && (
                <button
                  className="mobile-dropdown-item"
                  onClick={() => { setMobileMenuOpen(false); navigate("/modules"); }}
                >
                  <div className="mobile-dd-icon blue">⊞</div>
                  <div className="mobile-dd-text">
                    <span className="mobile-dd-title">Modules</span>
                    <span className="mobile-dd-sub">Manage modules</span>
                  </div>
                </button>
              )}
              <div className="mobile-dropdown-divider" />
              <button
                className="mobile-dropdown-item danger"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              >
                <div className="mobile-dd-icon red">⏻</div>
                <div className="mobile-dd-text">
                  <span className="mobile-dd-title">Logout</span>
                  <span className="mobile-dd-sub">Sign out of account</span>
                </div>
              </button>
            </div>
          </div>

          {/* Username display */}
          <div className="nav-user-info">
            <div className="nav-user-avatar">{initials}</div>
            <div className="nav-user-text">
              <span className="nav-user-name">{username}</span>
              <span className="nav-user-role">{role}</span>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="nav-icon-group">
            {role === "admin" && (
              <button
                className="nav-icon-btn btn-modules"
                data-tip="Modules"
                aria-label="Modules"
                onClick={() => navigate("/modules")}
              >
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </span>
              </button>
            )}
            <button
              className="nav-icon-btn btn-logout"
              data-tip="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <span className="btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* ═══ CONTENT ══════════════════════════════════════════ */}
      <div className="main-content">

        <div className="dashboard-title-row">
          <h1>Scooty Inventory</h1>
          <button className="add-fab" onClick={openSheet} title="Add Item">+</button>
        </div>

        {/* Mobile-only search */}
        <div className="search-wrapper mobile-search-only">
          <div className="search-bar">
            <span className="search-icon">
              <svg width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by model, variant, colour, price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
          {searchQuery && (
            <p className="search-count">
              {filteredVehicles.length === 0
                ? "No results found"
                : `${filteredVehicles.length} result${filteredVehicles.length > 1 ? "s" : ""} found`}
            </p>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {/* VEHICLE GRID */}
        <div className="vehicle-grid">

          {loading && vehicles.length === 0 && Array.from({ length: 6 }).map((_, i) => (
            <div className="vehicle-card skeleton" key={i}>
              <div className="skeleton-img" />
              <div className="skeleton-text" />
              <div className="skeleton-text small" />
            </div>
          ))}

          {!loading && searchQuery && filteredVehicles.length === 0 && (
            <div className="no-results">
              <span>🔍</span>
              <p>No vehicles match "<strong>{searchQuery}</strong>"</p>
              <button onClick={() => setSearchQuery("")}>Clear search</button>
            </div>
          )}

          {filteredVehicles.map((v, index) => (
            <div
              className="vehicle-card"
              key={v.scootyId}
              onClick={() => navigate(`/vehicle/${v.scootyId}`)}
            >
              <img
                src={getImageSrc(v)}
                className="vehicle-img"
                /* First 6 cards load eagerly; rest lazy */
                loading={index < 6 ? "eager" : "lazy"}
                /* High fetch priority for first 3 visible cards */
                fetchPriority={index < 3 ? "high" : "auto"}
                decoding="async"
                onError={(e) => { e.currentTarget.src = noImage; }}
                alt={v.modelName}
              />
              <h3>{v.modelName}</h3>
              <p>{v.variantName}</p>
              <p>{v.rangeKm ?? "N/A"} km</p>
              <p>₹ {v.price ?? "N/A"}</p>
              <span className={v.stockAvailable ? "green" : "red"}>
                {v.stockAvailable ? "In Stock" : "Out"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ BOTTOM SHEET ═════════════════════════════════════ */}
      {sheetOpen && <div className="sheet-overlay" onClick={closeSheet} />}

      <div className={`bottom-sheet${sheetOpen ? " sheet-visible" : ""}`}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          <span className="sheet-title">Add Item</span>
          <button className="sheet-close" onClick={closeSheet}>✕</button>
        </div>

        <div className="sheet-body">

          <div className="form-group">
            <label>Model <span className="required">*</span></label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Select Model</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.modelName}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Variant <span className="required">*</span></label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value === "" ? "" : Number(e.target.value))} disabled={variants.length === 0}>
              <option value="">Select Variant</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.variantName}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Colour <span className="required">*</span></label>
            <select value={colourId} onChange={(e) => setColourId(e.target.value === "" ? "" : Number(e.target.value))} disabled={colours.length === 0}>
              <option value="">Select Colour</option>
              {colours.map((c) => <option key={c.id} value={c.id}>{c.colourName}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Price (₹)</label>
            <input type="number" placeholder="e.g. 120000" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Battery Specs</label>
            <input type="text" placeholder="e.g. 3.0 kWh Li-ion" value={batterySpecs} onChange={(e) => setBatterySpecs(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Range (km)</label>
            <input type="number" placeholder="e.g. 120" value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} />
          </div>

          <div className="form-group form-toggle">
            <label>Stock Available</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={stockAvailable} onChange={(e) => setStockAvailable(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-group">
            <label>Image</label>
            <div className="image-upload-box" onClick={() => fileInputRef.current?.click()}>
              {imagePreview
                ? <img src={imagePreview} className="image-preview" alt="preview" />
                : <span className="upload-placeholder">📷 Tap to upload image</span>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
          </div>

          {submitMsg && (
            <p className={`submit-msg ${submitMsg.startsWith("✅") ? "success" : "fail"}`}>
              {submitMsg}
            </p>
          )}

          <div className="sheet-actions">
            <button className="btn-cancel" onClick={closeSheet}>Cancel</button>
            <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}