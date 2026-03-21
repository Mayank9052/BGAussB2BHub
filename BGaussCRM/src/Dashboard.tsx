import "./dashboard.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState, useRef } from "react";
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

interface ModelOption  { id: number; modelName: string; }
interface VariantOption { id: number; variantName: string; }
interface ColourOption  { id: number; colourName: string; }

const resolveImageSrc = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

export default function Dashboard() {
  const [vehicles, setVehicles]     = useState<Vehicle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Bottom sheet state
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState("");

  // Dropdown options
  const [models,   setModels]   = useState<ModelOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [colours,  setColours]  = useState<ColourOption[]>([]);

  // Form fields
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

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }

    const cached = localStorage.getItem("vehicles");
    if (cached) { setVehicles(JSON.parse(cached)); setLoading(false); }

    fetchVehicles();
    fetchModels();
  }, [navigate]);

  // ── Cascade dropdowns ────────────────────────────────────────
  useEffect(() => {
    if (modelId !== "") fetchVariants(Number(modelId));
    else { setVariants([]); setVariantId(""); }
  }, [modelId]);

  useEffect(() => {
    if (modelId !== "" && variantId !== "")
      fetchColours(Number(modelId), Number(variantId));
    else { setColours([]); setColourId(""); }
  }, [variantId]);

  // ── Data fetchers ────────────────────────────────────────────
  const fetchVehicles = async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        const res = await axios.get<VehicleApi[]>("/api/ScootyInventory/models-list");
        const normalized = res.data.map((item) => ({
          ...item,
          imageUrl: item.imageUrl ?? item.imagePath ?? null,
        }));
        setVehicles(normalized);
        localStorage.setItem("vehicles", JSON.stringify(normalized));
        setLoading(false);
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

  // ── Image picker ─────────────────────────────────────────────
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

  // ── Open / close sheet ───────────────────────────────────────
  const openSheet = () => {
    resetForm();
    fetchModels();
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSubmitMsg("");
  };

  const resetForm = () => {
    setModelId(""); setVariantId(""); setColourId("");
    setPrice(""); setBatterySpecs(""); setRangeKm("");
    setStockAvailable(true);
    setImageFile(null); setImagePreview(null);
    setSubmitMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (modelId === "" || variantId === "") {
      setSubmitMsg("Model and Variant are required.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const form = new FormData();
      form.append("modelId",        String(modelId));
      form.append("variantId",      String(variantId));
      if (colourId !== "") form.append("colourId", String(colourId));
      if (price)           form.append("price",    price);
      if (batterySpecs)    form.append("batterySpecs", batterySpecs);
      if (rangeKm)         form.append("rangeKm",  rangeKm);
      form.append("stockAvailable", String(stockAvailable));
      if (imageFile)       form.append("image", imageFile);

      await axios.post("/api/ScootyInventory/add-item", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitMsg("✅ Item added successfully!");
      fetchVehicles();

      setTimeout(() => {
        closeSheet();
      }, 1200);
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
    localStorage.removeItem("vehicles");
    navigate("/", { replace: true });
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Dashboard</span>
          </div>
        </div>
        <div className="pro-right">
          <span className="user-name">
              Welcome, {localStorage.getItem("username")} ({localStorage.getItem("role")})
          </span>
          {localStorage.getItem("role") === "admin" && (
            <button
              className="module-btn"
              onClick={() => navigate("/modules")}
            >
            Modules
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="main-content">
        <div className="dashboard-title-row">
          <h1>Scooty Inventory</h1>

          {/* ➕ ADD BUTTON */}
          <button className="add-fab" onClick={openSheet} title="Add Item">
            +
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="vehicle-grid">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div className="vehicle-card skeleton" key={i}>
              <div className="skeleton-img"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text small"></div>
            </div>
          ))}

          {vehicles.map((v) => (
            <div
              className="vehicle-card"
              key={v.scootyId}
              onClick={() => navigate(`/vehicle/${v.scootyId}`)}
            >
              <img
                src={resolveImageSrc(v.imageUrl)}
                className="vehicle-img"
                loading="lazy"
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

      {/* ── BOTTOM SHEET OVERLAY ─────────────────────────────── */}
      {sheetOpen && (
        <div className="sheet-overlay" onClick={closeSheet} />
      )}

      {/* ── BOTTOM SHEET PANEL ───────────────────────────────── */}
      <div className={`bottom-sheet ${sheetOpen ? "sheet-visible" : ""}`}>

        {/* Sheet handle */}
        <div className="sheet-handle" />

        {/* Sheet header */}
        <div className="sheet-header">
          <span className="sheet-title">Add Item</span>
          <button className="sheet-close" onClick={closeSheet}>✕</button>
        </div>

        {/* Sheet body — scrollable */}
        <div className="sheet-body">

          {/* Model */}
          <div className="form-group">
            <label>Model <span className="required">*</span></label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">Select Model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.modelName}</option>
              ))}
            </select>
          </div>

          {/* Variant */}
          <div className="form-group">
            <label>Variant <span className="required">*</span></label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={variants.length === 0}
            >
              <option value="">Select Variant</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.variantName}</option>
              ))}
            </select>
          </div>

          {/* Colour */}
          <div className="form-group">
            <label>Colour<span className="required">*</span></label>
            <select
              value={colourId}
              onChange={(e) => setColourId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={colours.length === 0}
            >
              <option value="">Select Colour</option>
              {colours.map((c) => (
                <option key={c.id} value={c.id}>{c.colourName}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="form-group">
            <label>Price (₹)</label>
            <input
              type="number"
              placeholder="e.g. 120000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Battery Specs */}
          <div className="form-group">
            <label>Battery Specs</label>
            <input
              type="text"
              placeholder="e.g. 3.0 kWh Li-ion"
              value={batterySpecs}
              onChange={(e) => setBatterySpecs(e.target.value)}
            />
          </div>

          {/* Range Km */}
          <div className="form-group">
            <label>Range (km)</label>
            <input
              type="number"
              placeholder="e.g. 120"
              value={rangeKm}
              onChange={(e) => setRangeKm(e.target.value)}
            />
          </div>

          {/* Stock */}
          <div className="form-group form-toggle">
            <label>Stock Available</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={stockAvailable}
                onChange={(e) => setStockAvailable(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Image</label>
            <div
              className="image-upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} className="image-preview" alt="preview" />
              ) : (
                <span className="upload-placeholder">📷 Tap to upload image</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </div>

          {/* Message */}
          {submitMsg && (
            <p className={`submit-msg ${submitMsg.startsWith("✅") ? "success" : "fail"}`}>
              {submitMsg}
            </p>
          )}

          {/* Actions */}
          <div className="sheet-actions">
            <button className="btn-cancel" onClick={closeSheet}>Cancel</button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

        </div>{/* end sheet-body */}
      </div>{/* end bottom-sheet */}

    </div>
  );
}
