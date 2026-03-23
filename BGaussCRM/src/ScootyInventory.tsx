import "./ScootyInventory.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "/api/ScootyInventory";

export default function ScootyInventory() {
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [colours, setColours] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    modelId: "",
    variantId: "",
    colourId: "",
    price: "",
    batterySpecs: "",
    rangeKm: "",
    stockAvailable: false,
    image: null
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // ── NEW: ref for hidden import file input ─────────────────────
  const importRef = useRef<HTMLInputElement>(null);

  // ── NEW: ref + filename display for image upload inside form ──
  const imageRef  = useRef<HTMLInputElement>(null);
  const [imageName, setImageName] = useState<string>("");

  // ── NEW: live table search ────────────────────────────────────
  const [tableSearch, setTableSearch] = useState("");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  // ================= FETCH =================
  const fetchData = async () => {
    const res = await axios.get(API);
    setData(res.data);
  };

  const fetchModels = async () => {
    const res = await axios.get(`${API}/models`);
    setModels(res.data);
  };

  const fetchVariants = async (modelId: number) => {
    const res = await axios.get(`${API}/variants/${modelId}`);
    setVariants(res.data);
  };

  const fetchColours = async (modelId: number, variantId: number) => {
    const res = await axios.get(
      `${API}/colours?modelId=${modelId}&variantId=${variantId}`
    );
    setColours(res.data);
  };

  useEffect(() => {
    fetchData();
    fetchModels();
  }, []);

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    try {
      if (!form.modelId || !form.variantId || !form.colourId) {
        alert("Please select Model, Variant and Colour");
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
        alert("⚠️ This combination already exists!");
        return;
      }

      const formData = new FormData();
      formData.append("modelId", String(form.modelId));
      formData.append("variantId", String(form.variantId));
      formData.append("colourId", String(form.colourId));
      if (form.price)        formData.append("price", String(Number(form.price)));
      if (form.batterySpecs) formData.append("batterySpecs", form.batterySpecs);
      if (form.rangeKm)      formData.append("rangeKm", String(Number(form.rangeKm)));
      formData.append("stockAvailable", form.stockAvailable ? "true" : "false");
      if (form.image)        formData.append("image", form.image);

      if (editingId) {
        await axios.put(`${API}/${editingId}`, formData);
      } else {
        await axios.post(`${API}/add-item`, formData);
      }

      setForm({ modelId: "", variantId: "", colourId: "", price: "", batterySpecs: "", rangeKm: "", stockAvailable: false, image: null });
      setEditingId(null);
      setVariants([]);
      setColours([]);
      setImageName("");
      fetchData();
    } catch (err: any) {
      console.error("SAVE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data || "Save failed");
    }
  };

  // ================= EDIT =================
  const handleEdit = (item: any) => {
    const modelId   = Number(item.modelId);
    const variantId = Number(item.variantId);
    setForm({ ...item, modelId, variantId, colourId: Number(item.colourId) });
    setEditingId(item.scootyId);
    fetchVariants(modelId);
    fetchColours(modelId, variantId);
  };

  // ================= DELETE =================
  const handleDelete = async (id: number) => {
    try {
      if (!window.confirm("Delete item?")) return;
      await axios.delete(`${API}/${id}`);
      fetchData();
    } catch (err: any) {
      console.error("DELETE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data || "Delete failed");
    }
  };

  // ================= IMPORT =================
  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("file", file);
    await axios.post(`${API}/import`, fd);
    fetchData();
  };

  const downloadTemplate = () => {
    window.open(`${API}/download-template`);
  };

  // ── Derived ──────────────────────────────────────────────────
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const stockCount   = data.filter((d) => d.stockAvailable).length;
  const noStockCount = data.length - stockCount;

  const filteredData = data.filter((d) => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (d.modelName   ?? "").toLowerCase().includes(q) ||
      (d.variantName ?? "").toLowerCase().includes(q) ||
      (d.colourName  ?? "").toLowerCase().includes(q) ||
      String(d.price   ?? "").includes(q) ||
      String(d.rangeKm ?? "").includes(q)
    );
  });

  const modelInitial = (name: string) =>
    (name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="inv-page">

      {/* ═══ NAVBAR ═══════════════════════════════════════════ */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Scooty Inventory</span>
          </div>
        </div>

        <div className="pro-right">

          {/* EXISTING — hidden via CSS */}
          <span className="user-name">
            Welcome, {username} ({role})
          </span>
          <button onClick={() => navigate("/modules")} className="module-btn">Modules</button>
          <button onClick={() => navigate("/dashboard")} className="module-btn">Dashboard</button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>

          {/* ── USERNAME PILL ── */}
          <div className="inv-user-info">
            <div className="inv-user-avatar">{initial}</div>
            <div className="inv-user-text">
              <span className="inv-user-name">{username}</span>
              <span className="inv-user-role">{role}</span>
            </div>
          </div>

          {/* ── NAV ICON BUTTONS ── */}
          <div className="inv-icon-group">

            <button className="inv-icon-btn btn-inv-modules" data-tip="Modules" aria-label="Modules" onClick={() => navigate("/modules")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>

            <button className="inv-icon-btn btn-inv-dashboard" data-tip="Dashboard" aria-label="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>

            <button className="inv-icon-btn btn-inv-logout" data-tip="Logout" aria-label="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>

        </div>
      </header>

      {/* ═══ CONTENT ══════════════════════════════════════════ */}
      <div className="inv-container">

        {/* ── COMPACT PAGE HEADER ── */}
        <div className="inv-header-row">
          <div className="inv-header-title">
            <div className="inv-header-icon">📦</div>
            <div className="inv-header-text">
              <h1>Scooty Inventory</h1>
              <span className="inv-header-sub">Manage stock, variants & availability</span>
            </div>
          </div>
          <div className="inv-stat-chips">
            <div className="inv-chip chip-total">
              <strong>{data.length}</strong> Total
            </div>
            <div className="inv-chip chip-stock">
              <strong>{stockCount}</strong> In Stock
            </div>
            <div className="inv-chip chip-nostock">
              <strong>{noStockCount}</strong> Out of Stock
            </div>
          </div>
        </div>

        {/* ── ENTERPRISE SECTION GRID ── */}
        <div className="section-grid">

          {/* FORM CARD */}
          <div className="inv-form-card">
            <div className="inv-form-card-header">
              <div className="inv-form-card-header-icon">
                {editingId ? "✏️" : "➕"}
              </div>
              <h3>{editingId ? "Edit Inventory Item" : "Add New Item"}</h3>
              <p>{editingId ? "Update the item details below" : "Fill in the details to add a new inventory item"}</p>
            </div>

            <div className="inv-form-body">
              {/* EXISTING form-card grid — unchanged */}
              <div className="form-card">

                <select value={form.modelId} onChange={(e) => {
                  const modelId = Number(e.target.value);
                  setForm({ modelId, variantId: "", colourId: "", price: "", batterySpecs: "", rangeKm: "", stockAvailable: false, image: null });
                  fetchVariants(modelId);
                  setColours([]);
                }}>
                  <option value="">Model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.modelName}</option>
                  ))}
                </select>

                <select value={form.variantId} onChange={(e) => {
                  const variantId = Number(e.target.value);
                  const modelId   = Number(form.modelId);
                  setForm((prev: any) => ({ ...prev, variantId, colourId: "" }));
                  fetchColours(modelId, variantId);
                }}>
                  <option value="">Variant</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.variantName}</option>
                  ))}
                </select>

                <select value={form.colourId} onChange={(e) =>
                  setForm({ ...form, colourId: Number(e.target.value) })
                }>
                  <option value="">Colour</option>
                  {colours.map((c) => (
                    <option key={c.id} value={c.id}>{c.colourName}</option>
                  ))}
                </select>

                <input placeholder="Price" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />

                <input placeholder="Battery" value={form.batterySpecs}
                  onChange={(e) => setForm({ ...form, batterySpecs: e.target.value })} />

                <input placeholder="Range KM" value={form.rangeKm}
                  onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} />

                {/* Hidden image file input */}
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="inv-file-hidden"
                  onChange={(e: any) => {
                    const file = e.target.files[0];
                    setForm({ ...form, image: file });
                    setImageName(file ? file.name : "");
                  }}
                />

                {/* Styled image upload button */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    type="button"
                    className="inv-image-upload-btn"
                    onClick={() => imageRef.current?.click()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {imageName ? "Change Image" : "Upload Image"}
                  </button>
                  {imageName && (
                    <span className="inv-image-filename">📎 {imageName}</span>
                  )}
                </div>

                <label>
                  <input type="checkbox" checked={form.stockAvailable}
                    onChange={(e) => setForm({ ...form, stockAvailable: e.target.checked })} />
                  In Stock
                </label>

                <button className="add-btn" onClick={handleSubmit}>
                  {editingId ? "Update" : "Add"}
                </button>

              </div>
            </div>
          </div>

          {/* ACTION CARD */}
          <div className="inv-action-card">
            <div className="inv-action-card-header">
              <div className="inv-action-card-header-icon">📊</div>
              <h3>Bulk Operations</h3>
              <p>Import & export inventory data</p>
            </div>

            <div className="inv-action-body">

              <div className="inv-action-item">
                <span className="inv-action-item-label">Download Template</span>
                <span className="inv-action-item-sub">Get the Excel import template with correct columns</span>
                <button className="inv-download-btn" onClick={downloadTemplate}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Excel
                </button>
              </div>

              <div className="inv-action-item">
                <span className="inv-action-item-label">Import Items</span>
                <span className="inv-action-item-sub">Upload a filled Excel file to bulk-import inventory</span>

                {/* Hidden native input */}
                <input
                  ref={importRef}
                  type="file"
                  className="inv-file-hidden"
                  onChange={handleImport}
                />

                {/* Styled button — matches Download Excel */}
                <button
                  className="inv-upload-btn"
                  onClick={() => importRef.current?.click()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 5 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Import Excel
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* ── ENTERPRISE TABLE ── */}
        <div className="inv-table-enterprise">

          {/* Toolbar */}
          <div className="inv-table-toolbar">
            <div className="inv-table-toolbar-title">
              <h3>Inventory Records</h3>
              <span className="inv-table-count">{filteredData.length} items</span>
            </div>
            <div className="inv-table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search model, variant, colour…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Scrollable table */}
          <div className="inv-table-scroll">
            {filteredData.length === 0 ? (
              <div className="inv-empty-state">
                <div className="inv-empty-icon">📦</div>
                <p>{tableSearch ? `No items match "${tableSearch}"` : "No inventory items added yet"}</p>
              </div>
            ) : (
              <table className="inv-enterprise-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Model</th>
                    <th>Variant</th>
                    <th>Colour</th>
                    <th>Price (₹)</th>
                    <th>Range (km)</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((d) => (
                    <tr key={d.scootyId}>

                      <td><span className="inv-id-cell">{d.scootyId}</span></td>

                      <td>
                        <div className="inv-model-cell">
                          <div className="inv-model-avatar">{modelInitial(d.modelName)}</div>
                          <span className="inv-model-name">{d.modelName}</span>
                        </div>
                      </td>

                      <td>{d.variantName}</td>
                      <td>{d.colourName}</td>

                      <td>
                        <span className="inv-price-cell">
                          {d.price != null ? `₹ ${Number(d.price).toLocaleString("en-IN")}` : "—"}
                        </span>
                      </td>

                      <td>{d.rangeKm != null ? `${d.rangeKm} km` : "—"}</td>

                      <td>
                        <span className={`inv-stock-badge ${d.stockAvailable ? "in" : "out"}`}>
                          {d.stockAvailable ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>

                      <td>
                        <div className="inv-row-actions">
                          <button className="inv-edit-btn" onClick={() => handleEdit(d)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button className="inv-delete-btn" onClick={() => handleDelete(d.scootyId)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── HIDDEN: EXISTING elements kept in DOM ── */}
        <div style={{ display: "none" }}>

          {/* Original section-grid */}
          <div className="section-grid">
            <div className="form-wrapper">
              <div className="form-card">
                <select value={form.modelId} onChange={(e) => {
                  const modelId = Number(e.target.value);
                  setForm({ modelId, variantId: "", colourId: "", price: "", batterySpecs: "", rangeKm: "", stockAvailable: false, image: null });
                  fetchVariants(modelId); setColours([]);
                }}>
                  <option value="">Model</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                </select>
                <select value={form.variantId} onChange={(e) => {
                  const variantId = Number(e.target.value);
                  setForm((prev: any) => ({ ...prev, variantId, colourId: "" }));
                  fetchColours(Number(form.modelId), variantId);
                }}>
                  <option value="">Variant</option>
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.variantName}</option>)}
                </select>
                <select value={form.colourId} onChange={(e) => setForm({ ...form, colourId: Number(e.target.value) })}>
                  <option value="">Colour</option>
                  {colours.map((c) => <option key={c.id} value={c.id}>{c.colourName}</option>)}
                </select>
                <input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <input placeholder="Battery" value={form.batterySpecs} onChange={(e) => setForm({ ...form, batterySpecs: e.target.value })} />
                <input placeholder="Range KM" value={form.rangeKm} onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} />
                <input type="file" onChange={(e: any) => setForm({ ...form, image: e.target.files[0] })} />
                <label><input type="checkbox" checked={form.stockAvailable} onChange={(e) => setForm({ ...form, stockAvailable: e.target.checked })} /> In Stock</label>
                <button className="add-btn" onClick={handleSubmit}>{editingId ? "Update" : "Add"}</button>
              </div>
            </div>
            <div className="actions-wrapper">
              <div className="actions">
                <button className="action-btn" onClick={downloadTemplate}>Download Template</button>
                <input type="file" onChange={handleImport} />
              </div>
            </div>
          </div>

          {/* Original table */}
          <div className="table">
            <table>
              <thead>
                <tr><th>ID</th><th>Model</th><th>Variant</th><th>Colour</th><th>Price</th><th>Range</th><th>Stock</th><th>Action</th></tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.scootyId}>
                    <td>{d.scootyId}</td><td>{d.modelName}</td><td>{d.variantName}</td>
                    <td>{d.colourName}</td><td>{d.price}</td><td>{d.rangeKm}</td>
                    <td>{d.stockAvailable ? "Yes" : "No"}</td>
                    <td>
                      <button onClick={() => handleEdit(d)}>Edit</button>
                      <button onClick={() => handleDelete(d.scootyId)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}