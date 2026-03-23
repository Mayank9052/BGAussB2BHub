import "./VehicleConfig.css";
import "./ColourPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ColourPage() {
  const navigate = useNavigate();

  const [colours,  setColours]  = useState<any[]>([]);
  const [models,   setModels]   = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const [filteredVariants, setFilteredVariants] = useState<any[]>([]);

  const [colourName, setColourName] = useState("");
  const [modelId,    setModelId]    = useState("");
  const [variantId,  setVariantId]  = useState("");
  const [editingId,  setEditingId]  = useState<number | null>(null);

  const [saving,     setSaving]     = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search,      setSearch]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role") ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => { localStorage.clear(); navigate("/", { replace: true }); };

  // ── Fetch all data ─────────────────────────────────────────
  const fetchData = async () => {
    try {
      setColours((await axios.get("/api/VehicleColours")).data);
      setModels((await axios.get("/api/VehicleModels")).data);
      setVariants((await axios.get("/api/VehicleVariants")).data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Cascade: filter variants when model changes ────────────
  useEffect(() => {
    if (modelId) {
      const filtered = variants.filter((v) => String(v.modelId) === String(modelId));
      setFilteredVariants(filtered);
      setVariantId("");
    } else {
      setFilteredVariants([]);
      setVariantId("");
    }
  }, [modelId, variants]);

  // ── Save (Add or Update) ───────────────────────────────────
  const handleSave = async () => {
    if (!colourName.trim() || !modelId || !variantId) {
      setErrorMsg("Please fill all fields.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (editingId) {
        await axios.put(`/api/VehicleColours/${editingId}`, {
          id:         editingId,
          colourName: colourName.trim(),
          modelId:    Number(modelId),
          variantId:  Number(variantId),
        });
        setSuccessMsg("Colour updated successfully!");
      } else {
        await axios.post("/api/VehicleColours/CreateColour", {
          colourName: colourName.trim(),
          modelId:    Number(modelId),
          variantId:  Number(variantId),
        });
        setSuccessMsg("Colour added successfully!");
      }
      setColourName(""); setModelId(""); setVariantId(""); setEditingId(null);
      fetchData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data)
        : "Failed to save colour.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel edit ────────────────────────────────────────────
  const handleCancelEdit = () => {
    setColourName(""); setModelId(""); setVariantId(""); setEditingId(null);
    setErrorMsg(""); setSuccessMsg("");
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this colour?")) return;
    try {
      await axios.delete(`/api/VehicleColours/${id}`);
      fetchData();
    } catch {
      alert("Failed to delete colour.");
    }
  };

  // ── Export ─────────────────────────────────────────────────
  const handleExport = () => { window.open("/api/VehicleColours/download-template"); };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("/api/VehicleColours/import", formData);
      fetchData();
      setSuccessMsg("Import successful ✓");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setErrorMsg("Import failed");
    }
    e.target.value = "";
  };

  // ── Filter + Paginate ──────────────────────────────────────
  const filtered = useMemo(() =>
    colours.filter((c) => {
      const q = search.toLowerCase();
      const modelName   = models.find((m) => m.id === c.modelId)?.modelName ?? "";
      const variantName = variants.find((v) => v.id === c.variantId)?.variantName ?? "";
      return (
        c.colourName?.toLowerCase().includes(q) ||
        modelName.toLowerCase().includes(q)     ||
        variantName.toLowerCase().includes(q)
      );
    }), [colours, models, variants, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Colour → CSS colour guess (optional visual touch) ─────
  const guessColourHex = (name: string): string => {
    const map: Record<string, string> = {
      red: "#ef4444", blue: "#3b82f6", green: "#22c55e",
      yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
      pink: "#ec4899", black: "#1f2937", white: "#f9fafb",
      grey: "#9ca3af", gray: "#9ca3af", silver: "#cbd5e1",
      gold: "#f59e0b", brown: "#92400e", cyan: "#06b6d4",
    };
    const lower = name.toLowerCase();
    for (const [key, hex] of Object.entries(map)) {
      if (lower.includes(key)) return hex;
    }
    return "#e5e7eb";
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="cp-page">

      {/* ── CYAN TOP BAR ── */}
      <div className="cp-topbar" />

      {/* ── NAVBAR ── */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Colours</span>
          </div>
        </div>

        <div className="pro-right">
          {/* legacy — hidden by CSS */}
          <span className="user-name">Welcome, {username} ({role})</span>
          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>Back</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>

          {/* User pill */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="vc-icon-group">
            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Back" onClick={() => navigate("/vehicle-config")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-modules" data-tip="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <div className="cp-container">

        {/* Alerts */}
        {successMsg && <div className="cp-alert cp-alert-success">✅ {successMsg}</div>}
        {errorMsg   && (
          <div className="cp-alert cp-alert-error">
            ⚠️ {errorMsg}
            <button className="cp-alert-close" onClick={() => setErrorMsg("")}>×</button>
          </div>
        )}

        {/* ══ SECTION 1 — BANNER ══ */}
        <div className="cp-banner">
          <div className="cp-banner-text">
            <h1>Vehicle Colours</h1>
            <p>Manage colour master records across all vehicle models &amp; variants</p>
          </div>
       
        </div>

        {/* ══ SECTION 2 — FORM + BULK ══ */}
        <div className="cp-top-grid">

          {/* LEFT COLUMN: Form + Mini Table */}
          <div className="cp-left-col">

            {/* ── ADD / EDIT FORM CARD ── */}
            <div className="cp-form-card">
              <div className="cp-form-header">
                <div className="cp-form-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h2>{editingId ? "Edit Colour" : "Add New Colour"}</h2>
                <p>{editingId ? `Editing colour ID #${editingId}` : "Select model, variant and enter colour name"}</p>
              </div>

              <div className="cp-form-body">

                {/* 3-column inline row */}
                <div className="cp-fields-row">

                  {/* Model */}
                  <div className="cp-field-group">
                    <label className="cp-label">Model</label>
                    <div className="cp-select-wrap">
                      <select
                        className="cp-select"
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                      >
                        <option value="">Select Model</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>{m.modelName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Variant */}
                  <div className="cp-field-group">
                    <label className="cp-label">Variant</label>
                    <div className="cp-select-wrap">
                      <select
                        className="cp-select"
                        value={variantId}
                        onChange={(e) => setVariantId(e.target.value)}
                        disabled={!modelId || filteredVariants.length === 0}
                      >
                        <option value="">
                          {!modelId
                            ? "Select Model First"
                            : filteredVariants.length === 0
                            ? "No Variants"
                            : "Select Variant"}
                        </option>
                        {filteredVariants.map((v) => (
                          <option key={v.id} value={v.id}>{v.variantName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Colour Name */}
                  <div className="cp-field-group">
                    <label className="cp-label">Colour Name</label>
                    <input
                      className={`cp-input${editingId ? " cp-input-editing" : ""}`}
                      value={colourName}
                      onChange={(e) => setColourName(e.target.value)}
                      placeholder="e.g. Pearl White..."
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    />
                  </div>

                </div>

                {/* Buttons */}
                <div className="cp-form-btns">
                  <button className="cp-btn-save" onClick={handleSave} disabled={saving}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      {editingId
                        ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                        : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                      }
                    </svg>
                    {saving ? "Saving…" : editingId ? "Update Colour" : "Add Colour"}
                  </button>
                  {editingId && (
                    <button className="cp-btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                  )}
                </div>

              </div>
            </div>

            {/* ── MINI TABLE — All Colours ── */}
            <div className="cp-mini-table-card">

              <div className="cp-mini-table-header">
                <div className="cp-mini-table-title">
                  <span className="cp-mini-dot" />
                  All Colours
                </div>
                <div className="cp-mini-header-right">
                  <div className="cp-mini-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      className="cp-mini-search"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <span className="cp-mini-count">{filtered.length}</span>
                </div>
              </div>

              <div className="cp-mini-table-scroll">
                <table className="cp-mini-table">
                  <thead>
                    <tr>
                      <th className="cmth-sn">#</th>
                      <th className="cmth-model">Model</th>
                      <th className="cmth-variant">Variant</th>
                      <th className="cmth-colour">Colour</th>
                      <th className="cmth-act">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length > 0 ? (
                      paginated.map((c, idx) => {
                        const modelName   = models.find((m) => m.id === c.modelId)?.modelName   ?? c.modelId;
                        const variantName = variants.find((v) => v.id === c.variantId)?.variantName ?? c.variantId;
                        return (
                          <tr key={c.id} className={editingId === c.id ? "cp-row-editing" : ""}>
                            <td className="cmtd-sn">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                            <td className="cmtd-model">
                              <span className="cp-model-badge">{modelName}</span>
                            </td>
                            <td className="cmtd-variant">
                              <span className="cp-variant-badge">{variantName}</span>
                            </td>
                            <td className="cmtd-colour">
                              <span className="cp-colour-swatch">
                                <span
                                  className="cp-colour-dot"
                                  style={{ background: guessColourHex(c.colourName) }}
                                />
                                {c.colourName}
                              </span>
                            </td>
                            <td className="cmtd-act">
                              <button
                                className="cp-mini-act cp-mini-edit"
                                title="Edit"
                                onClick={() => {
                                  setColourName(c.colourName);
                                  setModelId(String(c.modelId));
                                  setTimeout(() => setVariantId(String(c.variantId)), 50);
                                  setEditingId(c.id);
                                  setErrorMsg(""); setSuccessMsg("");
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button
                                className="cp-mini-act cp-mini-del"
                                title="Delete"
                                onClick={() => handleDelete(c.id)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="cp-mini-empty">
                          {search ? "No colours match your search." : "No colours yet. Add one above."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mini pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="cp-mini-pagination">
                  <span className="cp-mini-pg-info">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="cp-mini-pg-btns">
                    <button className="cp-mini-pg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`cp-mini-pg${currentPage === p ? " active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                    ))}
                    <button className="cp-mini-pg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                  </div>
                </div>
              )}

            </div>
            {/* END MINI TABLE */}

          </div>
          {/* END LEFT COLUMN */}

          {/* ── RIGHT: BULK OPERATIONS ── */}
          <div className="cp-bulk-card">
            <div className="cp-bulk-header">
              <div className="cp-bulk-icon">📊</div>
              <h2>Bulk Operations</h2>
              <p>Import &amp; export colour data</p>
            </div>

            <div className="cp-bulk-body">
              <div className="cp-bulk-section">
                <div className="cp-bulk-section-info">
                  <span className="cp-bulk-label">DOWNLOAD TEMPLATE</span>
                  <span className="cp-bulk-desc">Get the Excel import template with correct columns</span>
                </div>
                <button className="cp-btn-dl" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Excel
                </button>
              </div>

              <hr className="cp-bulk-hr" />

              <div className="cp-bulk-section">
                <div className="cp-bulk-section-info">
                  <span className="cp-bulk-label">IMPORT COLOURS</span>
                  <span className="cp-bulk-desc">Upload a filled Excel file to bulk-import colours</span>
                </div>
                <button className="cp-btn-imp" onClick={() => document.getElementById("cp-imp-file")?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import Excel
                </button>
                <input
                  id="cp-imp-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={handleImport}
                />
              </div>
            </div>
          </div>

        </div>
        {/* END SECTION 2 */}

      </div>
    </div>
  );
}