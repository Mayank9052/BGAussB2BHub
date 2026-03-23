import "./VehicleConfig.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ModelPage() {
  const navigate = useNavigate();

  const [models, setModels] = useState<any[]>([]);
  const [modelName, setModelName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const username = localStorage.getItem("username") ?? "";
  const role = localStorage.getItem("role") ?? "";
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  // ===== FETCH =====
  const fetchModels = async () => {
    try {
      const res = await axios.get("/api/VehicleModels");
      setModels(res.data);
    } catch {
      setError("Failed to load models");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // ===== SAVE =====
  const handleSave = async () => {
    if (!modelName.trim()) {
      alert("Enter model name");
      return;
    }

    try {
      if (editingId) {
        await axios.put(`/api/VehicleModels/${editingId}`, {
          id: editingId,
          modelName: modelName.trim(),
        });
      } else {
        await axios.post("/api/VehicleModels/CreateModel", {
          modelName: modelName.trim(),
        });
      }

      setModelName("");
      setEditingId(null);
      fetchModels();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data)
        : "Save failed";
      alert(msg);
    }
  };

  // ===== EDIT =====
  const handleEdit = (m: any) => {
    setModelName(m.modelName);
    setEditingId(m.id);
  };

  // ===== DELETE =====
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this model?")) return;

    try {
      await axios.delete(`/api/VehicleModels/${id}`);
      fetchModels();
    } catch {
      alert("Delete failed");
    }
  };

  // ===== EXPORT =====
  const handleExport = () => {
    window.open("/api/VehicleModels/download-template");
  };

  // ===== IMPORT =====
  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("/api/VehicleModels/import", formData);
      fetchModels();
      alert("Import successful");
    } catch {
      alert("Import failed");
    }
  };

  return (
    <div className="vc-page">

      {/* ===== NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Models</span>
          </div>
        </div>

        <div className="pro-right">
          {/* EXISTING — hidden via CSS */}
          <span className="user-name">
            Welcome, {username} ({role})
          </span>
          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>Back</button>
          <button className="module-btn" onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>

          {/* ── USERNAME PILL ── */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* ── NAV ICON BUTTONS ── */}
          <div className="vc-icon-group">
            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Back" aria-label="Back" onClick={() => navigate("/vehicle-config")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <button className="vc-icon-btn btn-vc-modules" data-tip="Dashboard" aria-label="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>

            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" aria-label="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="vc-container">

        {/* ── ENTERPRISE PAGE HEADER ── */}
        <div className="vc-header-row">
          <div className="vc-header-title">
            <div className="vc-header-icon">🚗</div>
            <div className="vc-header-text">
              <h1>Vehicle Models</h1>
              <span className="vc-header-sub">Manage vehicle model master records across the system</span>
            </div>
          </div>
          <div className="vc-stat-chips">
            <div className="vc-chip chip-models">
              <strong>{models.length}</strong> Models
            </div>
          </div>
        </div>

        {/* ── ADD MODEL FORM (COMPACT) ── */}
        <div className="section-card" style={{ marginBottom: "20px" }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <input
              type="text"
              placeholder={editingId ? "Update Model Name..." : "Add new model..."}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
            <button className="primary-btn" onClick={handleSave}>
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* ── IMPORT / EXPORT GRID ── */}
        <div className="ie-grid">
          <div className="ie-card">
            <h3>📤 Export Models</h3>
            <p>Download all vehicle models in Excel format for backup or external use</p>
            <button className="action-btn" onClick={handleExport}>
              Download Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Bulk Import</h3>
            <p>Upload Excel file to quickly add or update multiple models at once</p>
            <input 
              type="file" 
              onChange={handleImport}
              style={{
                padding: "8px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            />
          </div>
        </div>

        {/* ── MODELS TABLE (ENTERPRISE CARD) ── */}
        <div className="section-card">
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Model Name</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {models.length > 0 ? (
                  models.map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>{m.modelName}</td>
                      <td>
                        <button onClick={() => handleEdit(m)}>Edit</button>
                        <button onClick={() => handleDelete(m.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}>
                      No models found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "8px",
            fontSize: "13px"
          }}>
            ⚠️ {error}
          </div>
        )}

      </div>
    </div>
  );
}