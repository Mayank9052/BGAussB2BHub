import "./VehicleConfig.css";
import "./ModelPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ModelPage() {
  const navigate = useNavigate();

  const [models, setModels]           = useState<any[]>([]);
  const [modelName, setModelName]     = useState("");
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [sortAsc, setSortAsc]         = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role") ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => { localStorage.clear(); navigate("/", { replace: true }); };

  const fetchModels = async () => {
    setLoading(true);
    try   { const res = await axios.get("/api/VehicleModels"); setModels(res.data); }
    catch { setError("Failed to load models."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchModels(); }, []);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const handleSave = async () => {
    if (!modelName.trim()) { alert("Enter model name"); return; }
    try {
      if (editingId) {
        await axios.put(`/api/VehicleModels/${editingId}`, { id: editingId, modelName: modelName.trim() });
        flash("Model updated successfully ✓");
      } else {
        await axios.post("/api/VehicleModels/CreateModel", { modelName: modelName.trim() });
        flash("Model added successfully ✓");
      }
      setModelName(""); setEditingId(null); fetchModels();
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) && err.response?.data ? String(err.response.data) : "Save failed");
    }
  };

  const handleEdit   = (m: any) => { setModelName(m.modelName); setEditingId(m.id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleCancel = ()       => { setModelName(""); setEditingId(null); };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this model?")) return;
    try   { await axios.delete(`/api/VehicleModels/${id}`); fetchModels(); flash("Model deleted successfully"); }
    catch { setError("Delete failed"); }
  };

  const handleExport = () => window.open("/api/VehicleModels/download-template");
  const handleImport = async (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try   { await axios.post("/api/VehicleModels/import", fd); fetchModels(); flash("Import successful ✓"); }
    catch { setError("Import failed"); }
  };

  const filtered = useMemo(() => {
    const list = models.filter(m => m.modelName?.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => sortAsc
      ? a.modelName.localeCompare(b.modelName)
      : b.modelName.localeCompare(a.modelName));
  }, [models, search, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="si-page">

      {/* ── CYAN TOP BAR ── */}
      <div className="si-topbar" />

      {/* ── NAVBAR ── */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Models</span>
          </div>
        </div>
        <div className="pro-right">
          <span className="user-name">Welcome, {username} ({role})</span>
          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>Back</button>
          <button className="module-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>
          <div className="vc-icon-group">
            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Back" onClick={() => navigate("/vehicle-config")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <button className="vc-icon-btn btn-vc-modules" data-tip="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>
            </button>
            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <div className="si-container">

        {/* Alerts */}
        {success && <div className="si-alert si-alert-success">✅ {success}</div>}
        {error   && <div className="si-alert si-alert-error">⚠️ {error}<button className="si-alert-close" onClick={() => setError("")}>×</button></div>}

        {/* ══ SECTION 1 — BANNER ══ */}
        <div className="si-banner">
          <div className="si-banner-left">
            <div className="si-banner-text">
              <h1>Vehicle Models</h1>
              <p>Manage vehicle model master records across the system</p>
            </div>
          </div>
       
        </div>

        {/* ══ SECTION 2 — FORM + BULK (two columns) ══ */}
        <div className="si-top-grid">

          {/* LEFT COLUMN: Form card + Table card stacked */}
          <div className="si-left-col">

            {/* Add / Edit form */}
            <div className="si-form-card">
              <div className="si-form-header">
                <div className="si-form-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h2>{editingId ? "Edit Model" : "Add New Item"}</h2>
                <p>{editingId ? `Editing model ID #${editingId}` : "Fill in the details to add a new vehicle model"}</p>
              </div>

              <div className="si-form-body">
                <div className="si-field-group">
                  <label className="si-label">Model Name</label>
                  <input
                    type="text"
                    className={`si-input${editingId ? " si-input-editing" : ""}`}
                    placeholder={editingId ? "Update model name..." : "e.g. A60, RV400, B60..."}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                </div>
                <div className="si-form-btns">
                  <button className="si-btn-add" onClick={handleSave}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                      {editingId
                        ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                        : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                      }
                    </svg>
                    {editingId ? "Update Model" : "Add Model"}
                  </button>
                  {editingId && (
                    <button className="si-btn-cancel" onClick={handleCancel}>Cancel</button>
                  )}
                </div>
              </div>
            </div>

            {/* ── SMALL TABLE — All Vehicle Models ── */}
            <div className="si-mini-table-card">

              {/* Mini table header */}
              <div className="si-mini-table-header">
                <div className="si-mini-table-title">
                  <span className="si-mini-dot" />
                  All Vehicle Models
                </div>
                <div className="si-mini-header-right">
                  <div className="si-mini-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      className="si-mini-search"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <span className="si-mini-count">{filtered.length}</span>
                </div>
              </div>

              {/* Table */}
              <div className="si-mini-table-scroll">
                <table className="si-mini-table">
                  <thead>
                    <tr>
                      <th className="mth-sn">#</th>
                      <th className="mth-name si-th-sort" onClick={() => setSortAsc(p => !p)}>
                        Model Name <span className="si-sort-arr">{sortAsc ? "↑" : "↓"}</span>
                      </th>
                      <th className="mth-act">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td><div className="si-skel" style={{ width: 24, height: 11 }} /></td>
                          <td><div className="si-skel" style={{ width: 120, height: 11 }} /></td>
                          <td><div className="si-skel" style={{ width: 60, height: 11 }} /></td>
                        </tr>
                      ))
                    ) : paginated.length > 0 ? (
                      paginated.map((m, idx) => (
                        <tr key={m.id} className={editingId === m.id ? "si-row-editing" : ""}>
                          <td className="mtd-sn">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="mtd-name">{m.modelName}</td>
                          <td className="mtd-act">
                            <button className="si-mini-act si-mini-edit" title="Edit" onClick={() => handleEdit(m)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="si-mini-act si-mini-del" title="Delete" onClick={() => handleDelete(m.id)}>
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
                        <td colSpan={3} className="si-mini-empty">
                          {search ? "No models match your search." : "No models yet. Add one above."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mini pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="si-mini-pagination">
                  <span className="si-mini-pg-info">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="si-mini-pg-btns">
                    <button className="si-mini-pg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`si-mini-pg${currentPage === p ? " active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                    ))}
                    <button className="si-mini-pg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                  </div>
                </div>
              )}
            </div>
            {/* END MINI TABLE */}

          </div>
          {/* END LEFT COLUMN */}

          {/* RIGHT: Bulk Operations */}
          <div className="si-bulk-card">
            <div className="si-bulk-header">
              <div className="si-bulk-icon">📊</div>
              <h2>Bulk Operations</h2>
              <p>Import &amp; export model data</p>
            </div>

            <div className="si-bulk-body">
              <div className="si-bulk-section">
                <div className="si-bulk-section-info">
                  <span className="si-bulk-label">DOWNLOAD TEMPLATE</span>
                  <span className="si-bulk-desc">Get the Excel import template with correct columns</span>
                </div>
                <button className="si-btn-dl" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Excel
                </button>
              </div>

              <hr className="si-bulk-hr" />

              <div className="si-bulk-section">
                <div className="si-bulk-section-info">
                  <span className="si-bulk-label">IMPORT MODELS</span>
                  <span className="si-bulk-desc">Upload a filled Excel file to bulk-import models</span>
                </div>
                <button className="si-btn-imp" onClick={() => document.getElementById("si-imp-file")?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import Excel
                </button>
                <input id="si-imp-file" type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}