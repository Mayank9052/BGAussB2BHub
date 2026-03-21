import "./VehicleConfig.css";
import "./ColourPage.css"
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ColourPage() {
  const navigate = useNavigate();

  const [colours, setColours] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const [colourName, setColourName] = useState("");
  const [modelId, setModelId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setColours((await axios.get("/api/VehicleColours")).data);
      setModels((await axios.get("/api/VehicleModels")).data);
      setVariants((await axios.get("/api/VehicleVariants")).data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!colourName || !modelId || !variantId) return alert("Fill all fields");

    if (editingId) {
      await axios.put(`/api/VehicleColours/${editingId}`, {
        colourName,
        modelId: Number(modelId),
        variantId: Number(variantId)
      });
    } else {
      await axios.post("/api/VehicleColours", {
        colourName,
        modelId: Number(modelId),
        variantId: Number(variantId)
      });
    }

    setColourName("");
    setModelId("");
    setVariantId("");
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete colour?")) return;

    await axios.delete(`/api/VehicleColours/${id}`);
    fetchData();
  };

  const handleExport = () => {
    window.open("/api/VehicleColours/export");
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("/api/VehicleColours/import", formData);
      fetchData();
      alert("Import successful");
    } catch {
      alert("Import failed");
    }
  };

  return (
    <div className="vc-page colour-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Colours</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">
              Welcome, {localStorage.getItem("username")} ({localStorage.getItem("role")})
          </span>
          <button className="module-btn" onClick={() => navigate("/vehicle-config")}>
            Back
          </button>
          <button className="logout-btn" onClick={() => navigate("/")}>
            Logout
          </button>
        </div>
      </header>

      <div className="vc-container colour-container">

        {/* FORM */}
        <div className="section-card colour-card">
          <div className="form-row colour-form">

            <div className="colour-select">
              <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
                <option>Select Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.modelName}</option>
                ))}
              </select>
            </div>

            <div className="colour-select">
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                <option>Select Variant</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.variantName}</option>
                ))}
              </select>
            </div>

            <input
              value={colourName}
              onChange={(e) => setColourName(e.target.value)}
              placeholder="Colour Name"
            />

            <button className="primary-btn colour-btn" onClick={handleSave}>
              {editingId ? "Update" : "Add"}
            </button>

          </div>
        </div>

        {/* IMPORT EXPORT */}
        <div className="ie-grid">
          <div className="ie-card">
            <h3>📤 Export Colours</h3>
            <button className="action-btn" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Import Colours</h3>
            <input type="file" onChange={handleImport} />
          </div>
        </div>

        {/* TABLE */}
        <div className="table colour-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Colour</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {colours.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.colourName}</td>
                  <td>
                    <button onClick={() => {
                      setColourName(c.colourName);
                      setModelId(c.modelId);
                      setVariantId(c.variantId);
                      setEditingId(c.id);
                    }}>
                      Edit
                    </button>

                    <button onClick={() => handleDelete(c.id)}>
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