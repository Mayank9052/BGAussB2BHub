import "./ScootyInventory.css";
import "./VehicleConfig.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "/api/ScootyInventory";
const PAGE_SIZE = 10;

// ── TYPE DEFINITIONS ────────────────────────────────────────
interface Model {
  id: number;
  modelName: string;
}

interface Variant {
  id: number;
  variantName: string;
}

interface Colour {
  id: number;
  colourName: string;
}

interface InventoryItem {
  scootyId: number;
  modelId: number;
  variantId: number;
  colourId: number;
  modelName: string;
  variantName: string;
  colourName: string;
  price: number | null;
  batterySpecs: string | null;
  rangeKm: number | null;
  stockAvailable: boolean;
  image?: string | null;
}

interface FormState {
  modelId: string | number;
  variantId: string | number;
  colourId: string | number;
  price: string;
  batterySpecs: string;
  rangeKm: string;
  stockAvailable: boolean;
  image: File | null;
}

const guessColourHex = (name: string): string => {
  const map: Record<string, string> = {
    red: "#ef4444", blue: "#3b82f6", green: "#22c55e",
    yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
    pink: "#ec4899", black: "#1f2937", white: "#f9fafb",
    grey: "#9ca3af", gray: "#9ca3af", silver: "#cbd5e1",
    gold: "#f59e0b", brown: "#92400e", cyan: "#06b6d4",
  };
  const lower = (name ?? "").toLowerCase();
  for (const [key, hex] of Object.entries(map)) {
    if (lower.includes(key)) return hex;
  }
  return "#e5e7eb";
};

export default function ScootyInventory() {
  const navigate = useNavigate();

  const [data, setData] = useState<InventoryItem[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);

  const [form, setForm] = useState<FormState>({
    modelId: "", variantId: "", colourId: "",
    price: "", batterySpecs: "", rangeKm: "",
    stockAvailable: false, image: null,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [imageName, setImageName] = useState("");

  const importRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const username = localStorage.getItem("username") ?? "";
  const role = localStorage.getItem("role") ?? "";
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const flash = (msg: string, type: "success" | "error" = "success") => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(msg);
    }
  };

  // ── FETCH ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get<InventoryItem[]>(API);
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await axios.get<Model[]>(`${API}/models`);
      setModels(res.data);
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }
  }, []);

  const fetchVariants = async (modelId: number) => {
    const res = await axios.get<Variant[]>(`${API}/variants/${modelId}`);
    setVariants(res.data);
  };

  const fetchColours = async (modelId: number, variantId: number) => {
    const res = await axios.get<Colour[]>(`${API}/colours?modelId=${modelId}&variantId=${variantId}`);
    setColours(res.data);
  };

  // Fixed: Avoid calling setState synchronously in effect
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchData();
      await fetchModels();
    };
    loadInitialData();
  }, [fetchData, fetchModels]);

  // ── SUBMIT ────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      if (!form.modelId || !form.variantId || !form.colourId) {
        flash("Please select Model, Variant and Colour.", "error");
        return;
      }
      const exists = data.some(
        (item) =>
          Number(item.modelId) === Number(form.modelId) &&
          Number(item.variantId) === Number(form.variantId) &&
          Number(item.colourId) === Number(form.colourId) &&
          item.scootyId !== editingId
      );
      if (exists) {
        flash("⚠️ This combination already exists!", "error");
        return;
      }

      const formData = new FormData();
      formData.append("modelId", String(form.modelId));
      formData.append("variantId", String(form.variantId));
      formData.append("colourId", String(form.colourId));
      if (form.price) formData.append("price", String(Number(form.price)));
      if (form.batterySpecs) formData.append("batterySpecs", form.batterySpecs);
      if (form.rangeKm) formData.append("rangeKm", String(Number(form.rangeKm)));
      formData.append("stockAvailable", form.stockAvailable ? "true" : "false");
      if (form.image) formData.append("image", form.image);

      if (editingId) {
        await axios.put(`${API}/${editingId}`, formData);
        flash("Item updated successfully ✓");
      } else {
        await axios.post(`${API}/add-item`, formData);
        flash("Item added successfully ✓");
      }

      setForm({
        modelId: "", variantId: "", colourId: "",
        price: "", batterySpecs: "", rangeKm: "",
        stockAvailable: false, image: null
      });
      setEditingId(null);
      setVariants([]);
      setColours([]);
      setImageName("");
      setErrorMsg("");
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: string } };
      flash(error.response?.data || "Save failed", "error");
    }
  };

  // ── EDIT ──────────────────────────────────────────────────
  const handleEdit = (item: InventoryItem) => {
    const modelId = Number(item.modelId);
    const variantId = Number(item.variantId);
    setForm({
      modelId,
      variantId,
      colourId: Number(item.colourId),
      price: item.price?.toString() ?? "",
      batterySpecs: item.batterySpecs ?? "",
      rangeKm: item.rangeKm?.toString() ?? "",
      stockAvailable: item.stockAvailable,
      image: null,
    });
    setEditingId(item.scootyId);
    fetchVariants(modelId);
    fetchColours(modelId, variantId);
    setErrorMsg("");
    setSuccessMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setForm({
      modelId: "", variantId: "", colourId: "",
      price: "", batterySpecs: "", rangeKm: "",
      stockAvailable: false, image: null
    });
    setEditingId(null);
    setVariants([]);
    setColours([]);
    setImageName("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  // ── DELETE ────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      fetchData();
      flash("Item deleted");
    } catch (err: unknown) {
      const error = err as { response?: { data?: string } };
      flash(error.response?.data || "Delete failed", "error");
    }
  };

  // ── IMPORT / EXPORT ───────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await axios.post(`${API}/import`, fd);
      fetchData();
      flash("Import successful ✓");
    } catch {
      flash("Import failed", "error");
    }
    e.target.value = "";
  };

  const downloadTemplate = () => window.open(`${API}/download-template`);

  // ── DERIVED ───────────────────────────────────────────────
  const stockCount = data.filter((d) => d.stockAvailable).length;
  // Removed noStockCount since it was unused

  const filteredData = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return data;
    return data.filter((d) =>
      (d.modelName ?? "").toLowerCase().includes(q) ||
      (d.variantName ?? "").toLowerCase().includes(q) ||
      (d.colourName ?? "").toLowerCase().includes(q) ||
      String(d.price ?? "").includes(q) ||
      String(d.rangeKm ?? "").includes(q)
    );
  }, [data, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginated = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const modelInitial = (name: string) => (name ?? "?").trim().charAt(0).toUpperCase();

  // Using stockCount somewhere to avoid unused var warning (optional: remove if not needed)
  console.debug(`Stock count: ${stockCount}`);

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="scr-page">
      {/* CYAN TOP BAR */}
      <div className="scr-topbar" />

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Scooty Inventory</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">Welcome, {username} ({role})</span>
          <button onClick={() => navigate("/modules")} className="module-btn">Modules</button>
          <button onClick={() => navigate("/dashboard")} className="module-btn">Dashboard</button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>

          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          <div className="vc-icon-group">
            <button className="vc-icon-btn btn-vc-modules" data-tip="Modules" onClick={() => navigate("/modules")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* PAGE */}
      <div className="scr-container">
        {successMsg && <div className="scr-alert scr-alert-success">✅ {successMsg}</div>}
        {errorMsg && (
          <div className="scr-alert scr-alert-error">
            ⚠️ {errorMsg}
            <button className="scr-alert-close" onClick={() => setErrorMsg("")}>×</button>
          </div>
        )}

        <div className="scr-banner">
          <div className="scr-banner-text">
            <h1>Scooty Inventory</h1>
            <p>Manage stock, variants &amp; availability</p>
          </div>
        </div>

        <div className="scr-top-grid">
          <div className="scr-left-col">
            <div className="scr-form-card">
              <div className="scr-form-header">
                <div className="scr-form-icon">
                  <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {editingId
                      ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>
                      : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                    }
                  </svg>
                </div>
                <h2>{editingId ? "Edit Inventory Item" : "Add New Item"}</h2>
                <p>{editingId ? `Editing item ID #${editingId}` : "Fill in the details to add a new inventory item"}</p>
              </div>

              <div className="scr-form-body">
                <div className="scr-row-3">
                  <div className="scr-field">
                    <label className="scr-label">Model</label>
                    <div className="scr-select-wrap">
                      <select className="scr-select" value={form.modelId} onChange={(e) => {
                        const modelId = Number(e.target.value);
                        setForm({
                          modelId, variantId: "", colourId: "",
                          price: "", batterySpecs: "", rangeKm: "",
                          stockAvailable: false, image: null
                        });
                        fetchVariants(modelId);
                        setColours([]);
                      }}>
                        <option value="">Select Model</option>
                        {models.map((m) => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="scr-field">
                    <label className="scr-label">Variant</label>
                    <div className="scr-select-wrap">
                      <select className="scr-select" value={form.variantId} onChange={(e) => {
                        const variantId = Number(e.target.value);
                        setForm((prev) => ({ ...prev, variantId, colourId: "" }));
                        fetchColours(Number(form.modelId), variantId);
                      }} disabled={variants.length === 0}>
                        <option value="">Select Variant</option>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.variantName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="scr-field">
                    <label className="scr-label">Colour</label>
                    <div className="scr-select-wrap">
                      <select className="scr-select" value={form.colourId} onChange={(e) => setForm({ ...form, colourId: Number(e.target.value) })} disabled={colours.length === 0}>
                        <option value="">Select Colour</option>
                        {colours.map((c) => <option key={c.id} value={c.id}>{c.colourName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="scr-row-3b">
                  <div className="scr-field">
                    <label className="scr-label">Price (₹)</label>
                    <input className="scr-input" placeholder="e.g. 120000" value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div className="scr-field">
                    <label className="scr-label">Battery</label>
                    <input className="scr-input" placeholder="e.g. 3.0 kWh" value={form.batterySpecs}
                      onChange={(e) => setForm({ ...form, batterySpecs: e.target.value })} />
                  </div>
                  <div className="scr-field">
                    <label className="scr-label">Range (km)</label>
                    <input className="scr-input" placeholder="e.g. 120" value={form.rangeKm}
                      onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} />
                  </div>
                </div>

                <div className="scr-row-bottom">
                  <div className="scr-field">
                    <label className="scr-label">Image</label>
                    <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0] ?? null;
                        setForm({ ...form, image: file });
                        setImageName(file ? file.name : "");
                      }}
                    />
                    <button type="button" className="scr-img-btn" onClick={() => imageRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {imageName ? "Change" : "Upload Image"}
                    </button>
                    {imageName && <span className="scr-img-name">📎 {imageName}</span>}
                  </div>

                  <div className="scr-field" style={{ justifyContent: "flex-end" }}>
                    <label className="scr-label">&nbsp;</label>
                    <label className="scr-checkbox-wrap">
                      <input type="checkbox" checked={form.stockAvailable}
                        onChange={(e) => setForm({ ...form, stockAvailable: e.target.checked })} />
                      In Stock
                    </label>
                  </div>

                  <div className="scr-field" style={{ justifyContent: "flex-end" }}>
                    <label className="scr-label">&nbsp;</label>
                    <div className="scr-form-btns">
                      <button className="scr-btn-save" onClick={handleSubmit}>
                        {editingId ? "Update" : "Add"}
                      </button>
                      {editingId && (
                        <button className="scr-btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="scr-bulk-card">
            <div className="scr-bulk-body">
              <div className="scr-bulk-section">
                <div className="scr-bulk-section-info">
                  <span className="scr-bulk-label">DOWNLOAD TEMPLATE</span>
                  <span className="scr-bulk-desc">Get the Excel import template with correct columns</span>
                </div>
                <button className="scr-btn-dl" onClick={downloadTemplate}>
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Excel
                </button>
              </div>

              <hr className="scr-bulk-hr" />

              <div className="scr-bulk-section">
                <div className="scr-bulk-section-info">
                  <span className="scr-bulk-label">IMPORT ITEMS</span>
                  <span className="scr-bulk-desc">Upload a filled Excel file to bulk-import inventory</span>
                </div>
                <button className="scr-btn-imp" onClick={() => importRef.current?.click()}>
                  <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Import Excel
                </button>
                <input ref={importRef} type="file" style={{ display: "none" }} onChange={handleImport} />
              </div>
            </div>
          </div>
        </div>

        <div className="scr-table-card">
          <div className="scr-table-header">
            <div className="scr-table-title">
              <div className="scr-table-title-icon">📋</div>
              <div>
                <h2>Inventory Records</h2>
                <p>All scooty inventory items</p>
              </div>
            </div>

            <div className="scr-header-pagination">
              {filteredData.length > PAGE_SIZE && (
                <div className="scr-pg-btns">
                  <button className="scr-pg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…"
                        ? <span key={`e${i}`} className="scr-pg-ellipsis">…</span>
                        : <button key={p} className={`scr-pg${currentPage === p ? " active" : ""}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
                    )}
                  <button className="scr-pg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                </div>
              )}
            </div>

            <div className="scr-table-controls">
              <div className="scr-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="scr-search"
                  placeholder="Search model, variant, colour..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <span className="scr-count-pill">{filteredData.length} items</span>
            </div>
          </div>

          <div className="scr-table-scroll">
            <table className="scr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Model</th>
                  <th>Variant</th>
                  <th>Colour</th>
                  <th>Price (₹)</th>
                  <th>Range</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((d, idx) => (
                      <tr key={d.scootyId} className={editingId === d.scootyId ? "scr-row-editing" : ""}>

                        <td data-label="#">
                          <span className="scr-id-badge">
                            {(currentPage - 1) * PAGE_SIZE + idx + 1}
                          </span>
                        </td>

                        <td data-label="Model">
                          <div className="scr-model-cell">
                            <div className="scr-model-avatar">
                              {modelInitial(d.modelName)}
                            </div>
                            <span className="scr-model-name">{d.modelName}</span>
                          </div>
                        </td>

                        <td data-label="Variant">
                          <span className="scr-variant-badge">{d.variantName}</span>
                        </td>

                        <td data-label="Colour">
                          <span className="scr-colour-swatch">
                            <span
                              className="scr-colour-dot"
                              style={{ background: guessColourHex(d.colourName) }}
                            />
                            {d.colourName}
                          </span>
                        </td>

                        <td data-label="Price">
                          <span className="scr-price">
                            {d.price != null
                              ? `₹ ${Number(d.price).toLocaleString("en-IN")}`
                              : "—"}
                          </span>
                        </td>

                        <td data-label="Range">
                          {d.rangeKm != null ? `${d.rangeKm} km` : "—"}
                        </td>

                        <td data-label="Stock">
                          <span className={`scr-stock-pill ${d.stockAvailable ? "scr-stock-in" : "scr-stock-out"}`}>
                            {d.stockAvailable ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>

                        <td data-label="Actions">
                          <div className="scr-row-acts">
                            <button
                              className="scr-act-btn scr-act-edit"
                              onClick={() => handleEdit(d)}
                            >
                              Edit
                            </button>

                            <button
                              className="scr-act-btn scr-act-del"
                              onClick={() => handleDelete(d.scootyId)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="scr-empty">
                          <div className="scr-empty-icon">📦</div>
                          <div className="scr-empty-title">
                            {tableSearch ? `No items match "${tableSearch}"` : "No inventory items added yet"}
                          </div>
                          <div className="scr-empty-sub">
                            {tableSearch ? "Try a different search keyword." : "Add your first item using the form above."}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}