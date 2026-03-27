import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ComparisonManage.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

/* ── Types ── */
interface ConfigItem {
  id: number;
  scooty1Id: number;
  scooty2Id: number;
  model1Name: string;
  model2Name: string;
  variant1Name: string;
  variant2Name: string;
  price1: number | null;
  price2: number | null;
  image1Url: string | null;
  image2Url: string | null;
  isActive: boolean;
}

interface ScootyOption {
  scootyId: number;
  modelName: string;
  variantName: string;
  price: number | null;
  imageUrl: string | null;
}

interface ModelOption {
  id: number;
  modelName: string;
}

interface BrochureUploadState {
  modelId: number | "";
  file: File | null;
  uploading: boolean;
  msg: string;
}

/* ── Helpers ── */
const resolveImg = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const fmtPrice = (p: number | null) =>
  p != null ? `₹${(p / 100000).toFixed(2)}L` : "";

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ═══════════════════════════════════════════════════════════ */
export default function ComparisonManage() {
  const navigate  = useNavigate();
  const brochureFileRef = useRef<HTMLInputElement>(null);

  const [configs,  setConfigs]  = useState<ConfigItem[]>([]);
  const [scooties, setScooties] = useState<ScootyOption[]>([]);
  const [models,   setModels]   = useState<ModelOption[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  /* Add pair form */
  const [scooty1Id, setScooty1Id] = useState<number | "">("");
  const [scooty2Id, setScooty2Id] = useState<number | "">("");
  const [addMsg,    setAddMsg]    = useState("");
  const [adding,    setAdding]    = useState(false);

  /* Brochure upload */
  const [brochure, setBrochure] = useState<BrochureUploadState>({
    modelId: "", file: null, uploading: false, msg: "",
  });

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username || "U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }
    if (role !== "admin") { navigate("/dashboard", { replace: true }); return; }
    fetchAll();
  }, [navigate, role]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, scootRes, modRes] = await Promise.all([
        axios.get<ConfigItem[]>("/api/Comparison/list-all"),
        axios.get<ScootyOption[]>("/api/ScootyInventory/models-list"),
        axios.get<ModelOption[]>("/api/ScootyInventory/models"),
      ]);
      setConfigs(cfgRes.data);
      setScooties(scootRes.data);
      setModels(modRes.data);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Add pair ── */
  const handleAdd = async () => {
    if (scooty1Id === "" || scooty2Id === "") {
      setAddMsg("Please select both scooties."); return;
    }
    if (scooty1Id === scooty2Id) {
      setAddMsg("Please select two different scooties."); return;
    }
    setAdding(true); setAddMsg("");
    try {
      await axios.post("/api/Comparison/config", { scooty1Id, scooty2Id });
      setAddMsg("✅ Comparison pair added!");
      setScooty1Id(""); setScooty2Id("");
      await fetchAll();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data) : "Failed to add pair.";
      setAddMsg(`❌ ${msg}`);
    } finally {
      setAdding(false);
    }
  };

  /* ── Toggle active ── */
  const handleToggle = async (id: number) => {
    try {
      await axios.put(`/api/Comparison/config/${id}/toggle`);
      setConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, isActive: !c.isActive } : c
      ));
    } catch { /* silent */ }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this comparison pair?")) return;
    try {
      await axios.delete(`/api/Comparison/config/${id}`);
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch { /* silent */ }
  };

  /* ── Brochure upload ── */
  const handleBrochureUpload = async () => {
    if (brochure.modelId === "" || !brochure.file) {
      setBrochure(b => ({ ...b, msg: "Select a model and PDF file." })); return;
    }
    setBrochure(b => ({ ...b, uploading: true, msg: "" }));
    try {
      const form = new FormData();
      form.append("modelId", String(brochure.modelId));
      form.append("file", brochure.file!);
      await axios.post("/api/Comparison/brochure/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBrochure(b => ({ ...b, msg: "✅ Brochure uploaded!", file: null, modelId: "" }));
      if (brochureFileRef.current) brochureFileRef.current.value = "";
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data) : "Upload failed.";
      setBrochure(b => ({ ...b, msg: `❌ ${msg}` }));
    } finally {
      setBrochure(b => ({ ...b, uploading: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  /* ── Render ── */
  return (
    <div className="mgr-page">

      {/* ── NAVBAR ── */}
      <header className="dash-navbar">

        {/* LEFT */}
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">
              Manage Comparisons
            </span>
          </div>
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

            {/* Dashboard */}
            <button className="dash-icon-btn dash-btn-dashboard"
                    onClick={() => navigate("/dashboard")}
                    aria-label="Dashboard"
                    data-tip="Dashboard">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="white"/>
                <line x1="15" y1="3" x2="15" y2="21" stroke="white"/>
                <line x1="9" y1="9" x2="21" y2="9" stroke="white"/>
                <line x1="9" y1="15" x2="21" y2="15" stroke="white"/>
              </svg>
            </button>

            {/* Comparisons */}
            <button className="dash-icon-btn dash-btn-comparison"
                    onClick={() => navigate("/comparison")}
                    aria-label="Comparisons"
                    data-tip="Comparisons">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/>
                <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="9 8 4 12 9 16"/>
                <polyline points="15 8 20 12 15 16"/>
              </svg>
            </button>

            {/* Back */}
            <button className="dash-icon-btn cmpd-back-btn"
                    onClick={() => navigate("/comparison")}
                    aria-label="Go Back"
                    data-tip="Go Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            {/* Logout */}
            <button className="dash-icon-btn dash-btn-logout"
                    onClick={handleLogout}
                    aria-label="Logout"
                    data-tip="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>
        </div>

      </header>
      <main className="mgr-main">

        {error && <div className="dash-error">⚠️ {error}</div>}

        <div className="mgr-grid">

          {/* ── LEFT: Add pair + Brochure ── */}
          <div className="mgr-left">

            {/* Add Comparison Pair */}
            <div className="mgr-card">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <h2>Add Comparison Pair</h2>
              </div>

              <div className="mgr-form">
                <div className="mgr-form-group">
                  <label>BGauss Scooty <span className="req">*</span></label>
                  <select
                    value={scooty1Id}
                    onChange={e => setScooty1Id(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">Select BGauss model…</option>
                    {scooties.map(s => (
                      <option key={s.scootyId} value={s.scootyId}>
                        {s.modelName} — {s.variantName}{s.price ? ` (${fmtPrice(s.price)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mgr-vs-divider">
                  <span>VS</span>
                </div>

                <div className="mgr-form-group">
                  <label>Compare With <span className="req">*</span></label>
                  <select
                    value={scooty2Id}
                    onChange={e => setScooty2Id(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">Select competitor model…</option>
                    {scooties
                      .filter(s => s.scootyId !== Number(scooty1Id))
                      .map(s => (
                        <option key={s.scootyId} value={s.scootyId}>
                          {s.modelName} — {s.variantName}{s.price ? ` (${fmtPrice(s.price)})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Preview */}
                {scooty1Id !== "" && scooty2Id !== "" && (() => {
                  const s1 = scooties.find(s => s.scootyId === scooty1Id);
                  const s2 = scooties.find(s => s.scootyId === scooty2Id);
                  if (!s1 || !s2) return null;
                  return (
                    <div className="mgr-preview">
                      <div className="mgr-preview-bike">
                        <img src={resolveImg(s1.imageUrl)} alt={s1.modelName}
                          onError={e => { e.currentTarget.src = noImage; }} />
                        <span>{s1.modelName}</span>
                      </div>
                      <div className="mgr-preview-vs">VS</div>
                      <div className="mgr-preview-bike">
                        <img src={resolveImg(s2.imageUrl)} alt={s2.modelName}
                          onError={e => { e.currentTarget.src = noImage; }} />
                        <span>{s2.modelName}</span>
                      </div>
                    </div>
                  );
                })()}

                {addMsg && (
                  <div className={`mgr-msg ${addMsg.startsWith("✅") ? "success" : "fail"}`}>
                    {addMsg}
                  </div>
                )}

                <button
                  className="mgr-add-btn"
                  onClick={handleAdd}
                  disabled={adding || scooty1Id === "" || scooty2Id === ""}
                >
                  {adding ? "Adding…" : "Add Pair"}
                </button>
              </div>
            </div>

            {/* Brochure Upload */}
            <div className="mgr-card">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <h2>Upload Brochure</h2>
              </div>

              <div className="mgr-form">
                <div className="mgr-form-group">
                  <label>Model <span className="req">*</span></label>
                  <select
                    value={brochure.modelId}
                    onChange={e => setBrochure(b => ({
                      ...b,
                      modelId: e.target.value === "" ? "" : Number(e.target.value)
                    }))}
                  >
                    <option value="">Select model…</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.modelName}</option>
                    ))}
                  </select>
                </div>

                <div className="mgr-form-group">
                  <label>PDF File <span className="req">*</span></label>
                  <div
                    className="mgr-upload-box"
                    onClick={() => brochureFileRef.current?.click()}
                  >
                    {brochure.file
                      ? (
                        <div className="mgr-file-selected">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span>{brochure.file.name}</span>
                        </div>
                      )
                      : (
                        <div className="mgr-upload-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                            <polyline points="16 16 12 12 8 16"/>
                            <line x1="12" y1="12" x2="12" y2="21"/>
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                          </svg>
                          <span>Click to upload PDF</span>
                        </div>
                      )
                    }
                  </div>
                  <input
                    ref={brochureFileRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: "none" }}
                    onChange={e => setBrochure(b => ({
                      ...b, file: e.target.files?.[0] ?? null, msg: ""
                    }))}
                  />
                </div>

                {brochure.msg && (
                  <div className={`mgr-msg ${brochure.msg.startsWith("✅") ? "success" : "fail"}`}>
                    {brochure.msg}
                  </div>
                )}

                <button
                  className="mgr-add-btn"
                  onClick={handleBrochureUpload}
                  disabled={brochure.uploading || brochure.modelId === "" || !brochure.file}
                >
                  {brochure.uploading ? "Uploading…" : "Upload Brochure"}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Existing pairs table ── */}
          <div className="mgr-right">
            <div className="mgr-card mgr-card--full">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <h2>Existing Pairs</h2>
                <span className="mgr-count">{configs.length}</span>
              </div>

              {loading ? (
                <div className="mgr-table-wrap">
                  {[1,2,3].map(i => (
                    <div className="mgr-row mgr-row--skel" key={i}>
                      <div className="mgr-skel" style={{ width: "60%" }} />
                      <div className="mgr-skel" style={{ width: "20%" }} />
                      <div className="mgr-skel" style={{ width: "14%" }} />
                    </div>
                  ))}
                </div>
              ) : configs.length === 0 ? (
                <div className="mgr-empty">
                  <p>No comparison pairs yet. Add one on the left.</p>
                </div>
              ) : (
                <div className="mgr-table-wrap">

                  {/* Header */}
                  <div className="mgr-row mgr-row--head">
                    <div className="mgr-col mgr-col--pair">Comparison Pair</div>
                    <div className="mgr-col mgr-col--status">Status</div>
                    <div className="mgr-col mgr-col--actions">Actions</div>
                  </div>

                  {configs.map(c => (
                    <div className={`mgr-row ${c.isActive ? "" : "mgr-row--inactive"}`} key={c.id}>

                      {/* Pair info */}
                      <div className="mgr-col mgr-col--pair">
                        <div className="mgr-pair-bikes">
                          <img
                            src={resolveImg(c.image1Url)}
                            className="mgr-thumb"
                            alt={c.model1Name}
                            onError={e => { e.currentTarget.src = noImage; }}
                          />
                          <div className="mgr-pair-info">
                            <span className="mgr-pair-model">BGauss {c.model1Name}</span>
                            <span className="mgr-pair-variant">{c.variant1Name}</span>
                          </div>

                          <div className="mgr-pair-vs">VS</div>

                          <img
                            src={resolveImg(c.image2Url)}
                            className="mgr-thumb"
                            alt={c.model2Name}
                            onError={e => { e.currentTarget.src = noImage; }}
                          />
                          <div className="mgr-pair-info">
                            <span className="mgr-pair-model">{c.model2Name}</span>
                            <span className="mgr-pair-variant">{c.variant2Name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status toggle */}
                      <div className="mgr-col mgr-col--status">
                        <label className="mgr-toggle">
                          <input
                            type="checkbox"
                            checked={c.isActive}
                            onChange={() => handleToggle(c.id)}
                          />
                          <span className="mgr-toggle-track">
                            <span className="mgr-toggle-thumb" />
                          </span>
                          <span className={`mgr-toggle-label ${c.isActive ? "active" : "inactive"}`}>
                            {c.isActive ? "Active" : "Hidden"}
                          </span>
                        </label>
                      </div>

                      {/* Actions */}
                      <div className="mgr-col mgr-col--actions">
                        <button
                          className="mgr-action-btn mgr-action-btn--view"
                          title="Preview comparison"
                          onClick={() => navigate(`/comparison/${c.scooty1Id}/${c.scooty2Id}`)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button
                          className="mgr-action-btn mgr-action-btn--del"
                          title="Delete pair"
                          onClick={() => handleDelete(c.id)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}