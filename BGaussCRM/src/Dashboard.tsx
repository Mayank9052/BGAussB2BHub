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
  stockQuantity?: number;
  imageUrl: string | null;
}
type VehicleApi = Vehicle & { imagePath?: string | null };

interface ModelOption   { id: number; modelName: string; }
interface VariantOption { id: number; variantName: string; }
interface ColourOption  { id: number; colourName: string; }

interface PincodeArea {
  id: number; areaName: string; pincode: string;
  cityId: number; cityName: string; stateName: string;
}

interface ActiveLocation {
  pincode:   string | null;
  cityId:    number | null;
  areaId:    number | null;
  areaName:  string | null;
  cityName:  string | null;
}

const CACHE_KEY     = "vehicles";
const IMG_CACHE_KEY = "vehicle_img_urls";

const resolveImageSrc = (path: string | null): string => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
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
    const img = new Image(); img.decoding = "async"; img.src = url;
  });
};

const saveImageUrlsToCache = (vehicles: Vehicle[]) => {
  try {
    const map: Record<number, string> = {};
    vehicles.forEach((v) => { if (v.imageUrl) map[v.scootyId] = resolveImageSrc(v.imageUrl); });
    localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(map));
  } catch { /* quota */ }
};

const loadCachedImageUrls = (): Record<number, string> => {
  try {
    const raw = localStorage.getItem(IMG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export default function Dashboard() {
  const [allVehicles,  setAllVehicles]  = useState<Vehicle[]>([]);
  const [pinVehicles,  setPinVehicles]  = useState<Vehicle[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [pinLoading,   setPinLoading]   = useState(false);
  const [error,        setError]        = useState("");
  const [imgCache,     setImgCache]     = useState<Record<number, string>>(loadCachedImageUrls);

  const [searchQuery, setSearchQuery] = useState("");

  // ── Active location (pincode or city) ────────────────────
  const [activeLocation, setActiveLocation] = useState<ActiveLocation | null>(null);

  // ── Pincode search state ──────────────────────────────────
  const [pincodeQuery,       setPincodeQuery]       = useState("");
  const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeArea[]>([]);
  const [pincodeDropOpen,    setPincodeDropOpen]    = useState(false);
  const pincodeRef = useRef<HTMLDivElement>(null);

  // ── Sheet ─────────────────────────────────────────────────
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState("");

  const [models,   setModels]   = useState<ModelOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [colours,  setColours]  = useState<ColourOption[]>([]);
  const [modelId,        setModelId]        = useState<number | "">("");
  const [variantId,      setVariantId]      = useState<number | "">("");
  const [colourId,       setColourId]       = useState<number | "">("");
  const [price,          setPrice]          = useState("");
  const [batterySpecs,   setBatterySpecs]   = useState("");
  const [rangeKm,        setRangeKm]        = useState("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imagePreview,   setImagePreview]   = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate     = useNavigate();
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username);

  // ── Display list: pincode-filtered or all ────────────────
  const displayVehicles = activeLocation ? pinVehicles : allVehicles;

  const filteredVehicles = displayVehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.modelName?.toLowerCase().includes(q)   ||
      v.variantName?.toLowerCase().includes(q) ||
      String(v.price   ?? "").includes(q)       ||
      String(v.rangeKm ?? "").includes(q)
    );
  });

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: Vehicle[] = JSON.parse(cached);
        setAllVehicles(parsed); setLoading(false);
        const cachedUrls = loadCachedImageUrls();
        if (Object.keys(cachedUrls).length > 0) preloadImages(Object.values(cachedUrls));
        else preloadImages(parsed.map((v) => resolveImageSrc(v.imageUrl)));
      } catch { /* corrupt */ }
    }
    void fetchVehicles();
    void fetchModels();
  }, [navigate]);

  // ── Outside click: pincode dropdown ──────────────────────
  useEffect(() => {
    if (!pincodeDropOpen) return;
    const close = (e: MouseEvent) => {
      if (pincodeRef.current && !pincodeRef.current.contains(e.target as Node))
        setPincodeDropOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [pincodeDropOpen]);

  // ── Cascade dropdowns ─────────────────────────────────────
  useEffect(() => {
    if (modelId !== "") void fetchVariants(Number(modelId));
    else { setVariants([]); setVariantId(""); }
  }, [modelId]);

  useEffect(() => {
    if (modelId !== "" && variantId !== "") void fetchColours(Number(modelId), Number(variantId));
    else { setColours([]); setColourId(""); }
  }, [variantId]);

  // ── Pincode search debounce ───────────────────────────────
  useEffect(() => {
    if (pincodeQuery.length < 2) {
      setPincodeSuggestions([]); setPincodeDropOpen(false); return;
    }
    const t = setTimeout(() => void fetchPincodeSuggestions(pincodeQuery), 300);
    return () => clearTimeout(t);
  }, [pincodeQuery]);

  // ── Fetchers ──────────────────────────────────────────────
  const fetchVehicles = async (loc?: ActiveLocation) => {
    let url = "/api/ScootyInventory/models-list";
    if (loc?.pincode) url += `?pincode=${encodeURIComponent(loc.pincode)}`;
    else if (loc?.cityId) url += `?cityId=${loc.cityId}`;

    const isLocationFetch = !!loc;
    if (isLocationFetch) setPinLoading(true);
    else setLoading(true);

    let retries = isLocationFetch ? 1 : 5;
    while (retries > 0) {
      try {
        const res = await axios.get<VehicleApi[]>(url);
        const normalized: Vehicle[] = res.data.map((item) => ({
          ...item, imageUrl: item.imageUrl ?? item.imagePath ?? null,
        }));
        if (isLocationFetch) {
          setPinVehicles(normalized);
        } else {
          setAllVehicles(normalized);
          setLoading(false);
          setError("");
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* quota */ }
          saveImageUrlsToCache(normalized);
          preloadImages(normalized.map((v) => resolveImageSrc(v.imageUrl)));
          const newMap: Record<number, string> = {};
          normalized.forEach((v) => { newMap[v.scootyId] = resolveImageSrc(v.imageUrl); });
          setImgCache(newMap);
        }
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
        retries--;
      }
    }
    if (!isLocationFetch) { setError("Failed to load vehicles"); setLoading(false); }
    else setPinLoading(false);
    if (isLocationFetch) setPinLoading(false);
  };

  const fetchModels = async () => {
    try { const res = await axios.get<ModelOption[]>("/api/ScootyInventory/models"); setModels(res.data); } catch { /* silent */ }
  };
  const fetchVariants = async (mId: number) => {
    try { const res = await axios.get<VariantOption[]>(`/api/ScootyInventory/variants/${mId}`); setVariants(res.data); } catch { setVariants([]); }
  };
  const fetchColours = async (mId: number, vId: number) => {
    try { const res = await axios.get<ColourOption[]>(`/api/ScootyInventory/colours?modelId=${mId}&variantId=${vId}`); setColours(res.data); } catch { setColours([]); }
  };

  // ── Pincode suggestions (pincode + city name) ─────────────
  const fetchPincodeSuggestions = async (q: string) => {
    try {
      const res = await axios.get<PincodeArea[]>(`/api/City/search?q=${encodeURIComponent(q)}`);
      setPincodeSuggestions(res.data);
      setPincodeDropOpen(res.data.length > 0);
    } catch { setPincodeSuggestions([]); }
  };

  // ── Select a pincode/city suggestion ─────────────────────
  const handleLocationSelect = async (area: PincodeArea) => {
    const loc: ActiveLocation = {
      pincode:  area.pincode,
      cityId:   area.cityId,
      areaId:   area.id,
      areaName: area.areaName,
      cityName: area.cityName,
    };
    setActiveLocation(loc);
    setPincodeQuery(area.pincode);
    setPincodeDropOpen(false);
    await fetchVehicles(loc);
    setPinLoading(false);
  };

  const clearLocation = () => {
    setActiveLocation(null);
    setPinVehicles([]);
    setPincodeQuery("");
    setPincodeSuggestions([]);
    setPincodeDropOpen(false);
  };

  // ── Navigate to vehicle with location context ─────────────
  const handleCardClick = (scootyId: number) => {
    if (activeLocation?.pincode) {
      navigate(`/vehicle/${scootyId}?pincode=${encodeURIComponent(activeLocation.pincode)}`);
    } else if (activeLocation?.cityId) {
      navigate(`/vehicle/${scootyId}?cityId=${activeLocation.cityId}`);
    } else {
      navigate(`/vehicle/${scootyId}`);
    }
  };

  const getImageSrc = useCallback(
    (v: Vehicle): string => imgCache[v.scootyId] ?? resolveImageSrc(v.imageUrl),
    [imgCache]
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) { const r = new FileReader(); r.onload = () => setImagePreview(r.result as string); r.readAsDataURL(file); }
    else { setImagePreview(null); }
  };

  const openSheet  = () => { resetForm(); void fetchModels(); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setSubmitMsg(""); };

  const resetForm = () => {
    setModelId(""); setVariantId(""); setColourId("");
    setPrice(""); setBatterySpecs(""); setRangeKm("");
    setStockAvailable(true); setImageFile(null); setImagePreview(null); setSubmitMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (modelId === "" || variantId === "") { setSubmitMsg("Model and Variant are required."); return; }
    setSubmitting(true); setSubmitMsg("");
    try {
      const form = new FormData();
      form.append("modelId", String(modelId)); form.append("variantId", String(variantId));
      if (colourId !== "") form.append("colourId", String(colourId));
      if (price)        form.append("price",        price);
      if (batterySpecs) form.append("batterySpecs", batterySpecs);
      if (rangeKm)      form.append("rangeKm",      rangeKm);
      form.append("stockAvailable", String(stockAvailable));
      if (imageFile) form.append("image", imageFile);
      await axios.post("/api/ScootyInventory/add-item", form, { headers: { "Content-Type": "multipart/form-data" } });
      setSubmitMsg("✅ Item added successfully!");
      void fetchVehicles();
      setTimeout(() => closeSheet(), 1200);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data ? String(err.response.data) : "Failed to add item.";
      setSubmitMsg(`❌ ${message}`);
    } finally { setSubmitting(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem(CACHE_KEY);
    navigate("/", { replace: true });
  };

  return (
    <div className="dashboard">

      {/* ═══ NAVBAR ══════════════════════════════════════════ */}
      <header className="dash-navbar">
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">Dashboard</span>
          </div>
        </div>

        {/* CENTER — model search */}
        <div className="dash-nav-center">
          <div className="dash-search-bar">
            <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="dash-search-input" type="text"
              placeholder="Search model, variant…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="dash-search-clear" onClick={() => setSearchQuery("")}>✕</button>}
          </div>
          {searchQuery && (
            <span className="dash-search-count">
              {filteredVehicles.length === 0 ? "No results" : `${filteredVehicles.length} result${filteredVehicles.length > 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        {/* RIGHT — pincode/city search + user + actions */}
        <div className="dash-nav-right">

          {/* PINCODE / CITY SEARCH */}
          <div className="dash-pin-wrap" ref={pincodeRef}>
            <div className={`dash-pin-bar${activeLocation ? " has-result" : ""}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={activeLocation ? "#059669" : "#9ca3af"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input
                className="dash-pin-input"
                type="text"
                placeholder="Pincode or City…"
                value={pincodeQuery}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9a-zA-Z\s]/g, "").slice(0, 20);
                  setPincodeQuery(v);
                  if (v.length < 2) { setActiveLocation(null); setPinVehicles([]); }
                }}
                onFocus={() => { if (pincodeSuggestions.length > 0) setPincodeDropOpen(true); }}
              />
              {pinLoading && <div className="dash-pin-spinner" />}
              {(pincodeQuery || activeLocation) && !pinLoading && (
                <button className="dash-pin-clear" onClick={clearLocation}>✕</button>
              )}
            </div>

            {activeLocation && (
              <div className="dash-pin-active-badge">
                📍 {activeLocation.areaName ?? activeLocation.cityName} · {pinVehicles.length} vehicle{pinVehicles.length !== 1 ? "s" : ""}
              </div>
            )}

            {pincodeDropOpen && pincodeSuggestions.length > 0 && (
              <div className="dash-pin-dropdown">
                <div className="dash-pin-dd-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Matching areas
                </div>
                {pincodeSuggestions.map((area) => (
                  <button key={area.id} className="dash-pin-dd-item" onClick={() => void handleLocationSelect(area)}>
                    <div className="dash-pin-dd-left">
                      <span className="dash-pin-dd-area">{area.areaName}</span>
                      <span className="dash-pin-dd-city">{area.cityName}, {area.stateName}</span>
                    </div>
                    <span className="dash-pin-dd-code">{area.pincode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User pill */}
          <div className="dash-user-pill">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-user-info">
              <span className="dash-user-name">{username}</span>
              <span className="dash-user-role">{role}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="dash-actions">
            {role === "admin" && (
              <button className="dash-icon-btn dash-btn-modules"
                onClick={() => navigate("/modules")} aria-label="Modules" data-tip="Modules">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </button>
            )}
            <button className="dash-icon-btn dash-btn-logout" onClick={handleLogout} aria-label="Logout" data-tip="Logout">
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

        <div className="dash-title-row">
          <div className="dash-title-left">
            <h1>
              {activeLocation
                ? `Scooties in ${activeLocation.areaName ?? activeLocation.cityName}`
                : "Scooty Inventory"}
            </h1>
            <span className="dash-subtitle">
              {activeLocation
                ? `${activeLocation.pincode ?? activeLocation.cityName} · ${pinVehicles.length} available`
                : loading ? "Loading…"
                : `${filteredVehicles.length} vehicle${filteredVehicles.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {activeLocation && (
              <button className="dash-clear-pin-btn" onClick={clearLocation}>✕ Clear location</button>
            )}
            <button className="dash-add-btn" onClick={openSheet} title="Add Item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="dash-mobile-search">
          <div className="dash-search-bar">
            <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="dash-search-input" type="text" placeholder="Search model, variant…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="dash-search-clear" onClick={() => setSearchQuery("")}>✕</button>}
          </div>
          {/* Mobile pincode */}
          <div className="dash-pin-wrap dash-pin-mobile">
            <div className={`dash-pin-bar${activeLocation ? " has-result" : ""}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={activeLocation ? "#059669" : "#9ca3af"} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input className="dash-pin-input" type="text" placeholder="Pincode or City…"
                value={pincodeQuery}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 20);
                  setPincodeQuery(v);
                  if (v.length < 2) { setActiveLocation(null); setPinVehicles([]); }
                }} />
              {pinLoading && <div className="dash-pin-spinner" />}
              {(pincodeQuery || activeLocation) && !pinLoading && (
                <button className="dash-pin-clear" onClick={clearLocation}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* No vehicles banner */}
        {activeLocation && pinVehicles.length === 0 && !pinLoading && (
          <div className="dash-pin-no-vehicles">
            <span>🛵</span>
            <div>
              <p><strong>No in-stock vehicles</strong> in {activeLocation.areaName ?? activeLocation.pincode}</p>
              <p>Try a different area or <button onClick={clearLocation}>view all inventory</button></p>
            </div>
          </div>
        )}

        {error && <div className="dash-error">⚠️ {error}</div>}

        <div className="dash-grid">
          {(loading && allVehicles.length === 0) && Array.from({ length: 8 }).map((_, i) => (
            <div className="dash-card dash-card--skeleton" key={i}>
              <div className="dash-skel-img" />
              <div className="dash-skel-body">
                <div className="dash-skel-line" />
                <div className="dash-skel-line short" />
                <div className="dash-skel-line shorter" />
              </div>
            </div>
          ))}

          {!loading && searchQuery && filteredVehicles.length === 0 && !activeLocation && (
            <div className="dash-no-results">
              <span>🔍</span>
              <p>No vehicles match "<strong>{searchQuery}</strong>"</p>
              <button onClick={() => setSearchQuery("")}>Clear search</button>
            </div>
          )}

          {filteredVehicles.map((v, index) => (
            <div className="dash-card" key={v.scootyId} onClick={() => handleCardClick(v.scootyId)}>
              <div className="dash-card-img-wrap">
                <img src={getImageSrc(v)} className="dash-card-img"
                  loading={index < 6 ? "eager" : "lazy"} decoding="async"
                  onError={(e) => { e.currentTarget.src = noImage; }}
                  alt={v.modelName} />
                {/* Stock quantity badge when in location mode */}
                {activeLocation && v.stockQuantity !== undefined && (
                  <span className="dash-stock-qty-badge">
                    {v.stockQuantity > 0 ? `${v.stockQuantity} left` : "Sold out"}
                  </span>
                )}
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
              {imagePreview ? <img src={imagePreview} className="dash-upload-preview" alt="preview" /> :
                <div className="dash-upload-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Tap to upload image</span>
                </div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
          </div>
          {submitMsg && <div className={`dash-submit-msg ${submitMsg.startsWith("✅") ? "success" : "fail"}`}>{submitMsg}</div>}
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