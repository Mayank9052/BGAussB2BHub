// FILE: src/ComparisonManage.tsx
// Full 3-bike comparison support + shared navbar (no override)

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
  scooty1Id: number; scooty2Id: number; scooty3Id?: number | null;
  model1Name: string; model2Name: string; model3Name?: string | null;
  variant1Name: string; variant2Name: string; variant3Name?: string | null;
  price1: number | null; price2: number | null; price3?: number | null;
  image1Url: string | null; image2Url: string | null; image3Url?: string | null;
  isActive: boolean;
}
interface ScootyOption { scootyId: number; modelName: string; variantName: string; price: number | null; imageUrl: string | null; }
interface ModelOption   { id: number; modelName: string; }
interface BrochureState { modelId: number | ""; file: File | null; uploading: boolean; msg: string; }

const resolveImg = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};
const fmtPrice = (p: number | null) => p != null ? `₹${(p / 100000).toFixed(2)}L` : "";
const getInitials = (n: string) => {
  const p = n.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

function BikePreviewCard({ scooty }: { scooty: ScootyOption }) {
  return (
    <div className="mgr-preview-bike">
      <img src={resolveImg(scooty.imageUrl)} alt={scooty.modelName}
        onError={e => { e.currentTarget.src = noImage; }} />
      <span>{scooty.modelName}</span>
    </div>
  );
}

export default function ComparisonManage() {
  const navigate     = useNavigate();
  const brochureRef  = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [configs,       setConfigs]       = useState<ConfigItem[]>([]);
  const [scooties,      setScooties]      = useState<ScootyOption[]>([]);
  const [models,        setModels]        = useState<ModelOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add form — 3 bikes
  const [s1, setS1] = useState<number | "">("");
  const [s2, setS2] = useState<number | "">("");
  const [s3, setS3] = useState<number | "">("");
  const [addMsg,  setAddMsg]  = useState("");
  const [adding,  setAdding]  = useState(false);

  // Brochure
  const [brochure, setBrochure] = useState<BrochureState>({ modelId: "", file: null, uploading: false, msg: "" });

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username || "U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }
    if (role !== "admin") { navigate("/dashboard", { replace: true }); return; }
    void fetchAll();
  }, []);

  // Outside click — mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
        setMobileMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [mobileMenuOpen]);

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
    } catch { setError("Failed to load data."); }
    finally  { setLoading(false); }
  };

  const handleAdd = async () => {
    if (s1 === "" || s2 === "") { setAddMsg("Select at least 2 scooties."); return; }
    const ids = [Number(s1), Number(s2), s3 !== "" ? Number(s3) : null].filter(Boolean) as number[];
    if (new Set(ids).size !== ids.length) { setAddMsg("Please select different scooties."); return; }
    setAdding(true); setAddMsg("");
    try {
      await axios.post("/api/Comparison/config", {
        scooty1Id: s1, scooty2Id: s2, scooty3Id: s3 !== "" ? s3 : null,
      });
      setAddMsg("✅ Comparison added!");
      setS1(""); setS2(""); setS3("");
      await fetchAll();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data ? String(err.response.data) : "Failed to add.";
      setAddMsg(`❌ ${msg}`);
    } finally { setAdding(false); }
  };

  const handleToggle = async (id: number) => {
    try {
      await axios.put(`/api/Comparison/config/${id}/toggle`);
      setConfigs(p => p.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this comparison?")) return;
    try {
      await axios.delete(`/api/Comparison/config/${id}`);
      setConfigs(p => p.filter(c => c.id !== id));
    } catch { /* silent */ }
  };

  const handleBrochureUpload = async () => {
    if (brochure.modelId === "" || !brochure.file) {
      setBrochure(b => ({ ...b, msg: "Select a model and PDF." })); return;
    }
    setBrochure(b => ({ ...b, uploading: true, msg: "" }));
    try {
      const fd = new FormData();
      fd.append("modelId", String(brochure.modelId));
      fd.append("file", brochure.file!);
      await axios.post("/api/Comparison/brochure/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setBrochure(b => ({ ...b, msg: "✅ Uploaded!", file: null, modelId: "" }));
      if (brochureRef.current) brochureRef.current.value = "";
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data ? String(err.response.data) : "Upload failed.";
      setBrochure(b => ({ ...b, msg: `❌ ${msg}` }));
    } finally { setBrochure(b => ({ ...b, uploading: false })); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/", { replace: true }); };

  const b1 = scooties.find(s => s.scootyId === s1);
  const b2 = scooties.find(s => s.scootyId === s2);
  const b3 = scooties.find(s => s.scootyId === s3);

  const filterOut = (exclude: number[]) =>
    scooties.filter(s => !exclude.includes(s.scootyId));

  return (
    <div className="mgr-page">

      {/* ── NAVBAR ── */}
      <header className="dash-navbar">
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">Manage Comparisons</span>
          </div>
        </div>
        <div className="dash-nav-right">
          <div className="dash-user-pill">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-user-info">
              <span className="dash-user-name">{username}</span>
              <span className="dash-user-role">{role}</span>
            </div>
          </div>
          {/* Desktop actions */}
          <div className="dash-actions">
            <button className="dash-icon-btn dash-btn-dashboard"
              onClick={() => navigate("/dashboard")} data-tip="Dashboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="white"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="white"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="white"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="white"/>
              </svg>
            </button>
            <button className="dash-icon-btn dash-btn-comparison"
              onClick={() => navigate("/comparison")} data-tip="Comparisons">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/>
                <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="9 8 4 12 9 16"/><polyline points="15 8 20 12 15 16"/>
              </svg>
            </button>
            <button className="dash-icon-btn cmpd-back-btn"
              onClick={() => navigate("/comparison")} data-tip="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="dash-icon-btn dash-btn-logout"
              onClick={handleLogout} data-tip="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
          {/* Mobile hamburger */}
          <div className="dash-mobile-wrap" ref={mobileMenuRef}>
            <button className={`dash-hamburger${mobileMenuOpen ? " open" : ""}`}
              onClick={() => setMobileMenuOpen(o => !o)}>
              <span /><span /><span />
            </button>
            <div className={`dash-mobile-dd${mobileMenuOpen ? " open" : ""}`}>
              <div className="dash-mdd-user">
                <div className="dash-mdd-avatar">{initials}</div>
                <div>
                  <span className="dash-mdd-name">{username}</span>
                  <span className="dash-mdd-role">{role}</span>
                </div>
              </div>
              <div className="dash-mdd-divider" />
              <button className="dash-mdd-item" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}>
                <div className="dash-mdd-icon blue" style={{ background: "linear-gradient(135deg,#4ade80,#16a34a)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </div>
                <div className="dash-mdd-text"><span className="dash-mdd-title">Dashboard</span></div>
              </button>
              <button className="dash-mdd-item" onClick={() => { navigate("/comparison"); setMobileMenuOpen(false); }}>
                <div className="dash-mdd-icon blue" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="9 8 4 12 9 16"/><polyline points="15 8 20 12 15 16"/></svg>
                </div>
                <div className="dash-mdd-text"><span className="dash-mdd-title">Comparisons</span></div>
              </button>
              <div className="dash-mdd-divider" />
              <button className="dash-mdd-item dash-mdd-item--logout" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                <div className="dash-mdd-icon red">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </div>
                <div className="dash-mdd-text"><span className="dash-mdd-title">Logout</span></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mgr-main">
        {error && <div className="dash-error">⚠️ {error}</div>}
        <div className="mgr-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="mgr-left">

            {/* Add Comparison card */}
            <div className="mgr-card">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <h2>Add Comparison (2 or 3 bikes)</h2>
              </div>
              <div className="mgr-form">
                {/* Bike 1 */}
                <div className="mgr-form-group">
                  <label>Bike 1 — BGauss <span className="req">*</span></label>
                  <select value={s1} onChange={e => setS1(e.target.value === "" ? "" : Number(e.target.value))}>
                    <option value="">Select BGauss model…</option>
                    {filterOut([Number(s2), Number(s3)]).map(s => (
                      <option key={s.scootyId} value={s.scootyId}>
                        {s.modelName} — {s.variantName}{s.price ? ` (${fmtPrice(s.price)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mgr-vs-divider"><span>VS</span></div>

                {/* Bike 2 */}
                <div className="mgr-form-group">
                  <label>Bike 2 <span className="req">*</span></label>
                  <select value={s2} onChange={e => setS2(e.target.value === "" ? "" : Number(e.target.value))}>
                    <option value="">Select model…</option>
                    {filterOut([Number(s1), Number(s3)]).map(s => (
                      <option key={s.scootyId} value={s.scootyId}>
                        {s.modelName} — {s.variantName}{s.price ? ` (${fmtPrice(s.price)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mgr-vs-divider"><span>VS (optional)</span></div>

                {/* Bike 3 */}
                <div className="mgr-form-group">
                  <label>Bike 3 — Optional</label>
                  <select value={s3} onChange={e => setS3(e.target.value === "" ? "" : Number(e.target.value))}>
                    <option value="">None (2-bike comparison)</option>
                    {filterOut([Number(s1), Number(s2)]).map(s => (
                      <option key={s.scootyId} value={s.scootyId}>
                        {s.modelName} — {s.variantName}{s.price ? ` (${fmtPrice(s.price)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview */}
                {b1 && b2 && (
                  <div className="mgr-preview">
                    <BikePreviewCard scooty={b1} />
                    <div className="mgr-preview-vs">VS</div>
                    <BikePreviewCard scooty={b2} />
                    {b3 && <><div className="mgr-preview-vs">VS</div><BikePreviewCard scooty={b3} /></>}
                  </div>
                )}

                {addMsg && <div className={`mgr-msg ${addMsg.startsWith("✅") ? "success" : "fail"}`}>{addMsg}</div>}

                <button className="mgr-add-btn" onClick={handleAdd}
                  disabled={adding || s1 === "" || s2 === ""}>
                  {adding ? "Adding…" : "Add Comparison"}
                </button>
              </div>
            </div>

            {/* Brochure Upload card */}
            <div className="mgr-card">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <h2>Upload Brochure</h2>
              </div>
              <div className="mgr-form">
                <div className="mgr-form-group">
                  <label>Model <span className="req">*</span></label>
                  <select value={brochure.modelId}
                    onChange={e => setBrochure(b => ({ ...b, modelId: e.target.value === "" ? "" : Number(e.target.value) }))}>
                    <option value="">Select model…</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                  </select>
                </div>
                <div className="mgr-form-group">
                  <label>PDF File <span className="req">*</span></label>
                  <div className="mgr-upload-box" onClick={() => brochureRef.current?.click()}>
                    {brochure.file
                      ? <div className="mgr-file-selected">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span>{brochure.file.name}</span>
                        </div>
                      : <div className="mgr-upload-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                          <span>Click to upload PDF</span>
                        </div>}
                  </div>
                  <input ref={brochureRef} type="file" accept=".pdf" style={{ display: "none" }}
                    onChange={e => setBrochure(b => ({ ...b, file: e.target.files?.[0] ?? null, msg: "" }))} />
                </div>
                {brochure.msg && <div className={`mgr-msg ${brochure.msg.startsWith("✅") ? "success" : "fail"}`}>{brochure.msg}</div>}
                <button className="mgr-add-btn" onClick={handleBrochureUpload}
                  disabled={brochure.uploading || brochure.modelId === "" || !brochure.file}>
                  {brochure.uploading ? "Uploading…" : "Upload Brochure"}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="mgr-right">
            <div className="mgr-card mgr-card--full">
              <div className="mgr-card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                <h2>Existing Comparisons</h2>
                <span className="mgr-count">{configs.length}</span>
              </div>

              {loading ? (
                <div>
                  {[1,2,3].map(i => (
                    <div className="mgr-skel-row" key={i}>
                      <div className="mgr-skel" style={{ width: "55%", flex: 1 }} />
                      <div className="mgr-skel" style={{ width: 60 }} />
                      <div className="mgr-skel" style={{ width: 50 }} />
                    </div>
                  ))}
                </div>
              ) : configs.length === 0 ? (
                <div className="mgr-empty">
                  <div className="mgr-empty-icon">🏍️</div>
                  <p>No comparisons yet. Add one on the left.</p>
                </div>
              ) : (
                <>
                  <div className="mgr-table-head">
                    <div className="mgr-th">Comparison</div>
                    <div className="mgr-th">Status</div>
                    <div className="mgr-th">Actions</div>
                  </div>

                  {configs.map(c => (
                    <div key={c.id} className={`mgr-pair-row${c.isActive ? "" : " mgr-pair-row--inactive"}`}>
                      {/* Pair cell */}
                      <div className="mgr-pair-cell">
                        <div className="mgr-pair-bikes">
                          {/* Bike 1 */}
                          <img src={resolveImg(c.image1Url)} className="mgr-thumb" alt={c.model1Name}
                            onError={e => { e.currentTarget.src = noImage; }} />
                          <div className="mgr-pair-info">
                            <span className="mgr-pair-model">BGauss {c.model1Name}</span>
                            <span className="mgr-pair-variant">{c.variant1Name}</span>
                          </div>
                          <div className="mgr-pair-vs">VS</div>
                          {/* Bike 2 */}
                          <img src={resolveImg(c.image2Url)} className="mgr-thumb" alt={c.model2Name}
                            onError={e => { e.currentTarget.src = noImage; }} />
                          <div className="mgr-pair-info">
                            <span className="mgr-pair-model">{c.model2Name}</span>
                            <span className="mgr-pair-variant">{c.variant2Name}</span>
                          </div>
                          {/* Bike 3 — optional */}
                          {c.scooty3Id && c.model3Name && (
                            <>
                              <div className="mgr-pair-vs">VS</div>
                              <img src={resolveImg(c.image3Url ?? null)} className="mgr-thumb" alt={c.model3Name}
                                onError={e => { e.currentTarget.src = noImage; }} />
                              <div className="mgr-pair-info">
                                <span className="mgr-pair-model">{c.model3Name}</span>
                                <span className="mgr-pair-variant">{c.variant3Name}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status toggle */}
                      <div className="mgr-status-cell">
                        <label className="mgr-toggle">
                          <input type="checkbox" checked={c.isActive} onChange={() => void handleToggle(c.id)} />
                          <span className="mgr-toggle-track"><span className="mgr-toggle-thumb" /></span>
                          <span className={`mgr-toggle-label ${c.isActive ? "active" : "inactive"}`}>
                            {c.isActive ? "Active" : "Hidden"}
                          </span>
                        </label>
                      </div>

                      {/* Actions */}
                      <div className="mgr-actions-cell">
                        <button className="mgr-action-btn mgr-action-btn--view" title="Preview"
                          onClick={() => {
                            const path = c.scooty3Id
                              ? `/comparison/${c.scooty1Id}/${c.scooty2Id}/${c.scooty3Id}`
                              : `/comparison/${c.scooty1Id}/${c.scooty2Id}`;
                            navigate(path);
                          }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="mgr-action-btn mgr-action-btn--del" title="Delete"
                          onClick={() => void handleDelete(c.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}