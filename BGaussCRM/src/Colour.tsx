import "./VehicleConfig.css";
import "./ColourPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ColourPage() {
  const navigate = useNavigate();

  const [colours,  setColours]  = useState<any[]>([]);
  const [models,   setModels]   = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // Filtered variants based on selected model
  const [filteredVariants, setFilteredVariants] = useState<any[]>([]);

  const [colourName, setColourName] = useState("");
  const [modelId,    setModelId]    = useState("");
  const [variantId,  setVariantId]  = useState("");
  const [editingId,  setEditingId]  = useState<number | null>(null);

  const [saving,     setSaving]     = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  useEffect(() => {
    fetchData();
  }, []);

  // ── Cascade: filter variants when model changes ────────────
  useEffect(() => {
    if (modelId) {
      const filtered = variants.filter(
        (v) => String(v.modelId) === String(modelId)
      );
      setFilteredVariants(filtered);
      setVariantId(""); // reset variant when model changes
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

      setColourName("");
      setModelId("");
      setVariantId("");
      setEditingId(null);
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
    setColourName("");
    setModelId("");
    setVariantId("");
    setEditingId(null);
    setErrorMsg("");
    setSuccessMsg("");
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
  const handleExport = () => {
    window.open("/api/VehicleColours/download-template");
  };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    e.target.value = "";
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="vc-page colour-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="logo" />
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

        {/* FORM CARD */}
        <div className="section-card colour-card">
          <h2 className="form-title">
            {editingId ? "✏️ Edit Colour" : "➕ Add Colour"}
          </h2>

          <div className="form-row colour-form">

            {/* Model Dropdown */}
            <div className="colour-select">
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                <option value="">Select Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.modelName}</option>
                ))}
              </select>
            </div>

            {/* Variant Dropdown — filtered by model */}
            <div className="colour-select">
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                disabled={!modelId || filteredVariants.length === 0}
              >
                <option value="">
                  {!modelId
                    ? "Select Model First"
                    : filteredVariants.length === 0
                    ? "No Variants for this Model"
                    : "Select Variant"}
                </option>
                {filteredVariants.map((v) => (
                  <option key={v.id} value={v.id}>{v.variantName}</option>
                ))}
              </select>
            </div>

            {/* Colour Name */}
            <input
              value={colourName}
              onChange={(e) => setColourName(e.target.value)}
              placeholder="Colour Name"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />

            {/* Save Button */}
            <button
              className="primary-btn colour-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add"}
            </button>

            {/* Cancel — only during edit */}
            {editingId && (
              <button className="cancel-edit-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}

          </div>

          {/* Messages */}
          {errorMsg   && <p className="form-error">❌ {errorMsg}</p>}
          {successMsg && <p className="form-success">✅ {successMsg}</p>}
        </div>

        {/* IMPORT / EXPORT */}
        <div className="ie-grid">
          <div className="ie-card">
            <h3>📤 Export Colours</h3>
            <p>Download all colours in Excel format</p>
            <button className="action-btn" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Import Colours</h3>
            <p>Upload Excel file to add/update colours</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} />
          </div>
        </div>

        {/* TABLE */}
        <div className="table colour-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Model</th>
                <th>Variant</th>
                <th>Colour</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {colours.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}>
                    No colours found
                  </td>
                </tr>
              ) : (
                colours.map((c) => (
                  <tr key={c.id} className={editingId === c.id ? "row-editing" : ""}>
                    <td>{c.id}</td>
                    <td>
                      {models.find((m) => m.id === c.modelId)?.modelName ?? c.modelId}
                    </td>
                    <td>
                      {variants.find((v) => v.id === c.variantId)?.variantName ?? c.variantId}
                    </td>
                    <td>{c.colourName}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => {
                          setColourName(c.colourName);
                          setModelId(String(c.modelId));
                          // filteredVariants will auto-update via useEffect
                          // set variantId after short delay to allow filter to run
                          setTimeout(() => setVariantId(String(c.variantId)), 50);
                          setEditingId(c.id);
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}