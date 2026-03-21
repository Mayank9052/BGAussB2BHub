import "./VehicleConfig.css";
import "./VariantPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function VariantPage() {
  const navigate = useNavigate();

  const [variants, setVariants] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  const [variantName, setVariantName] = useState("");
  const [modelId, setModelId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

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

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!variantName || !modelId) return alert("Fill all fields");

    if (editingId) {
      await axios.put(`/api/VehicleVariants/${editingId}`, {
        variantName,
        modelId: Number(modelId)
      });
    } else {
      await axios.post("/api/VehicleVariants", {
        variantName,
        modelId: Number(modelId)
      });
    }

    setVariantName("");
    setModelId("");
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete variant?")) return;

    await axios.delete(`/api/VehicleVariants/${id}`);
    fetchData();
  };

  const handleExport = () => {
    window.open("/api/VehicleVariants/export");
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("/api/VehicleVariants/import", formData);
      fetchData();
      alert("Import successful");
    } catch {
      alert("Import failed");
    }
  };

  return (
    <div className="vc-page variant-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Variants</span>
          </div>
        </div>
        
        <div className="pro-right">
          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>
            Back
          </button>
          <button className="logout-btn" onClick={() => navigate("/")}>
            Logout
          </button>
        </div>
      </header>

      <div className="vc-container variant-container">

        {/* FORM */}
        <div className="section-card variant-card">
          <div className="form-row variant-form">

            <div className="variant-select">
              <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
                <option>Select Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.modelName}</option>
                ))}
              </select>
            </div>

            <input
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Variant Name"
            />

            <button className="primary-btn variant-btn" onClick={handleSave}>
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* IMPORT EXPORT */}
        <div className="ie-grid">
          <div className="ie-card">
            <h3>📤 Export Variants</h3>
            <p>Download all variants in Excel format</p>
            <button className="action-btn" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Import Variants</h3>
            <p>Upload Excel file to add/update variants</p>
            <input type="file" onChange={handleImport} />
          </div>
        </div>

        {/* TABLE */}
        <div className="table variant-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Variant</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.variantName}</td>
                  <td>
                    <button onClick={() => {
                      setVariantName(v.variantName);
                      setModelId(v.modelId);
                      setEditingId(v.id);
                    }}>
                      Edit
                    </button>

                    <button onClick={() => handleDelete(v.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}