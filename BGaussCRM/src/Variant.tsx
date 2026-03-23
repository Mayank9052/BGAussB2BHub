import "./VehicleConfig.css";
import "./VariantPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function VariantPage() {
  const navigate = useNavigate();

  const [variants, setVariants] = useState<any[]>([]);
  const [models,   setModels]   = useState<any[]>([]);

  const [variantName, setVariantName] = useState("");
  const [modelId,     setModelId]     = useState("");
  const [editingId,   setEditingId]   = useState<number | null>(null);

  const [saving,     setSaving]     = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search,       setSearch]       = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);
  const PAGE_SIZE = 10;

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role") ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => { localStorage.clear(); navigate("/", { replace: true }); };

  // ── Fetch all data ─────────────────────────────────────────
  const fetchData = async () => {
    try {
      const v = await axios.get("/api/VehicleVariants");
      const m = await axios.get("/api/VehicleModels");
      setVariants(v.data);
      setModels(m.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Save (Add or Update) ───────────────────────────────────
  const handleSave = async () => {
    if (!variantName.trim() || !modelId) {
      setErrorMsg("Please select a model and enter a variant name.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (editingId) {
        await axios.put(`/api/VehicleVariants/${editingId}`, {
          id:          editingId,
          variantName: variantName.trim(),
          modelId:     Number(modelId),
        });
        setSuccessMsg("Variant updated successfully!");
      } else {
        await axios.post("/api/VehicleVariants/CreateVariant", {
          variantName: variantName.trim(),
          modelId:     Number(modelId),
        });
        setSuccessMsg("Variant added successfully!");
      }
      setVariantName(""); setModelId(""); setEditingId(null);
      fetchData();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data)
        : "Failed to save variant.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel edit ────────────────────────────────────────────
  const handleCancelEdit = () => {
    setVariantName(""); setModelId(""); setEditingId(null);
    setErrorMsg(""); setSuccessMsg("");
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this variant?")) return;
    try {
      await axios.delete(`/api/VehicleVariants/${id}`);
      fetchData();
    } catch {
      alert("Failed to delete variant.");
    }
  };

  // ── Export ─────────────────────────────────────────────────
  const handleExport = () => { window.open("/api/VehicleVariants/download-template"); };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("/api/VehicleVariants/import", formData);
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
    variants.filter(v =>
      v.variantName?.toLowerCase().includes(search.toLowerCase()) ||
      (v.modelName ?? "").toLowerCase().includes(search.toLowerCase())
    ), [variants, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="vp-page">

      {/* ── CYAN TOP BAR ── */}
      <div className="vp-topbar" />

      {/* ── NAVBAR ── */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Variants</span>
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
      <div className="vp-container">

        {/* Alerts */}
        {successMsg && <div className="vp-alert vp-alert-success">✅ {successMsg}</div>}
        {errorMsg   && (
          <div className="vp-alert vp-alert-error">
            ⚠️ {errorMsg}
            <button className="vp-alert-close" onClick={() => setErrorMsg("")}>×</button>
          </div>
        )}

        {/* ══ SECTION 1 — BANNER ══ */}
        <div className="vp-banner">
          <div className="vp-banner-text">
            <h1>Vehicle Variants</h1>
            <p>Manage variant master records across all vehicle models</p>
          </div>
          
        </div>

        {/* ══ SECTION 2 — FORM + BULK ══ */}
        <div className="vp-top-grid">

          {/* LEFT COLUMN: Form + Mini Table */}
          <div className="vp-left-col">

            {/* ── ADD / EDIT FORM CARD ── */}
            <div className="vp-form-card">
              <div className="vp-form-header">
                <div className="vp-form-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h2>{editingId ? "Edit Variant" : "Add New Variant"}</h2>
                <p>{editingId ? `Editing variant ID #${editingId}` : "Select a model and fill in the variant details"}</p>
              </div>

              <div className="vp-form-body">

                {/* Model + Variant inline row */}
                <div className="vp-fields-row">
                  <div className="vp-field-group">
                    <label className="vp-label">Model</label>
                    <div className="vp-select-wrap">
                      <select
                        className="vp-select"
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

                  <div className="vp-field-group">
                    <label className="vp-label">Variant Name</label>
                    <input
                      className={`vp-input${editingId ? " vp-input-editing" : ""}`}
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="e.g. Standard, Premium..."
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="vp-form-btns">
                  <button className="vp-btn-save" onClick={handleSave} disabled={saving}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      {editingId
                        ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                        : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                      }
                    </svg>
                    {saving ? "Saving…" : editingId ? "Update Variant" : "Add Variant"}
                  </button>
                  {editingId && (
                    <button className="vp-btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                  )}
                </div>

              </div>
            </div>

            {/* ── MINI TABLE — All Variants ── */}
            <div className="vp-mini-table-card">

              <div className="vp-mini-table-header">
                <div className="vp-mini-table-title">
                  <span className="vp-mini-dot" />
                  All Variants
                </div>
                <div className="vp-mini-header-right">
                  <div className="vp-mini-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      className="vp-mini-search"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <span className="vp-mini-count">{filtered.length}</span>
                </div>
              </div>

              <div className="vp-mini-table-scroll">
                <table className="vp-mini-table">
                  <thead>
                    <tr>
                      <th className="vmth-sn">#</th>
                      <th className="vmth-model">Model</th>
                      <th className="vmth-variant">Variant</th>
                      <th className="vmth-act">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length > 0 ? (
                      paginated.map((v, idx) => (
                        <tr key={v.id} className={editingId === v.id ? "vp-row-editing" : ""}>
                          <td className="vmtd-sn">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="vmtd-model">
                            <span className="vp-model-badge">{v.modelName ?? v.modelId}</span>
                          </td>
                          <td className="vmtd-variant">{v.variantName}</td>
                          <td className="vmtd-act">
                            <button
                              className="vp-mini-act vp-mini-edit"
                              title="Edit"
                              onClick={() => {
                                setVariantName(v.variantName);
                                setModelId(String(v.modelId));
                                setEditingId(v.id);
                                setErrorMsg(""); setSuccessMsg("");
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              className="vp-mini-act vp-mini-del"
                              title="Delete"
                              onClick={() => handleDelete(v.id)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="vp-mini-empty">
                          {search ? "No variants match your search." : "No variants yet. Add one above."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mini pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="vp-mini-pagination">
                  <span className="vp-mini-pg-info">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="vp-mini-pg-btns">
                    <button className="vp-mini-pg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`vp-mini-pg${currentPage === p ? " active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                    ))}
                    <button className="vp-mini-pg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                  </div>
                </div>
              )}

            </div>
            {/* END MINI TABLE */}

          </div>
          {/* END LEFT COLUMN */}

          {/* ── RIGHT: BULK OPERATIONS ── */}
          <div className="vp-bulk-card">
            <div className="vp-bulk-header">
              <div className="vp-bulk-icon">📊</div>
              <h2>Bulk Operations</h2>
              <p>Import &amp; export variant data</p>
            </div>

            <div className="vp-bulk-body">
              <div className="vp-bulk-section">
                <div className="vp-bulk-section-info">
                  <span className="vp-bulk-label">DOWNLOAD TEMPLATE</span>
                  <span className="vp-bulk-desc">Get the Excel import template with correct columns</span>
                </div>
                <button className="vp-btn-dl" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Excel
                </button>
              </div>

              <hr className="vp-bulk-hr" />

              <div className="vp-bulk-section">
                <div className="vp-bulk-section-info">
                  <span className="vp-bulk-label">IMPORT VARIANTS</span>
                  <span className="vp-bulk-desc">Upload a filled Excel file to bulk-import variants</span>
                </div>
                <button className="vp-btn-imp" onClick={() => document.getElementById("vp-imp-file")?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import Excel
                </button>
                <input
                  id="vp-imp-file"
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