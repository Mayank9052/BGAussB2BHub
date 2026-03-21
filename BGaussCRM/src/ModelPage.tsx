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
        await axios.put(`/api/VehicleModels/${editingId}`, { modelName });
      } else {
        await axios.post("/api/VehicleModels", { modelName });
      }

      setModelName("");
      setEditingId(null);
      fetchModels();
    } catch {
      alert("Save failed");
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
    window.open("/api/VehicleModels/export");
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
          <span className="user-name">Welcome, Admin</span>

          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>
            Back
          </button>

          <button className="module-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="vc-container">

        {/* ===== FORM ===== */}
        <div className="section-card">
          <h2>{editingId ? "Update Model" : "Add Model"}</h2>

          <div className="form-row">
            <input
              type="text"
              placeholder="Enter Model Name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />

            <button className="primary-btn" onClick={handleSave}>
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* ===== IMPORT / EXPORT ===== */}
        <div className="ie-grid">

          <div className="ie-card">
            <h3>📤 Export Models</h3>
            <p>Download all models in Excel format</p>

            <button className="action-btn" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Import Models</h3>
            <p>Upload Excel file to add/update models</p>

            <input type="file" onChange={handleImport} />
          </div>

        </div>

        {/* ===== TABLE ===== */}
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Model Name</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.modelName}</td>
                  <td>
                    <button onClick={() => handleEdit(m)}>Edit</button>
                    <button onClick={() => handleDelete(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}