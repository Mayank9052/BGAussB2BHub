import "./VehicleConfig.css";
import "./VariantPage.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function VariantPage() {
  const navigate = useNavigate();

  const [variants, setVariants] = useState<any[]>([]);
  const [models,   setModels]   = useState<any[]>([]);

  const [variantName, setVariantName] = useState("");
  const [modelId,     setModelId]     = useState("");
  const [editingId,   setEditingId]   = useState<number | null>(null);

  const [saving,   setSaving]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  useEffect(() => {
    fetchData();
  }, []);

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
        // UPDATE — send id in body (required by controller)
        await axios.put(`/api/VehicleVariants/${editingId}`, {
          id:          editingId,
          variantName: variantName.trim(),
          modelId:     Number(modelId),
        });
        setSuccessMsg("Variant updated successfully!");
      } else {
        console.log("POST data:", { variantName: variantName.trim(), modelId: Number(modelId) });
  
        await axios.post("/api/VehicleVariants/CreateVariant", {
            variantName: variantName.trim(),
            modelId: Number(modelId),
        });
        setSuccessMsg("Variant added successfully!");
      }

      setVariantName("");
      setModelId("");
      setEditingId(null);
      fetchData();

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.log("Error response:", err.response?.data);
      console.log("Error status:", err.response?.status);
    }
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
    setVariantName("");
    setModelId("");
    setEditingId(null);
    setErrorMsg("");
    setSuccessMsg("");
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
  const handleExport = () => {
    window.open("/api/VehicleVariants/download-template");
  };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    // Reset file input
    e.target.value = "";
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="vc-page variant-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Variants</span>
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

      <div className="vc-container variant-container">

        {/* FORM CARD */}
        <div className="section-card variant-card">
          <h2 className="form-title">
            {editingId ? "✏️ Edit Variant" : "➕ Add Variant"}
          </h2>

          <div className="form-row variant-form">

            {/* Model Dropdown */}
            <div className="variant-select">
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

            {/* Variant Name */}
            <input
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Variant Name"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />

            {/* Save Button */}
            <button
              className="primary-btn variant-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add"}
            </button>

            {/* Cancel button — only show during edit */}
            {editingId && (
              <button
                className="cancel-edit-btn"
                onClick={handleCancelEdit}
              >
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
            <h3>📤 Export Variants</h3>
            <p>Download all variants in Excel format</p>
            <button className="action-btn" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="ie-card">
            <h3>📥 Import Variants</h3>
            <p>Upload Excel file to add/update variants</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} />
          </div>
        </div>

        {/* TABLE */}
        <div className="table variant-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Model</th>
                <th>Variant</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}>
                    No variants found
                  </td>
                </tr>
              ) : (
                variants.map((v) => (
                  <tr key={v.id} className={editingId === v.id ? "row-editing" : ""}>
                    <td>{v.id}</td>
                    <td>{v.modelName ?? v.modelId}</td>
                    <td>{v.variantName}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => {
                          setVariantName(v.variantName);
                          setModelId(String(v.modelId));
                          setEditingId(v.id);
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(v.id)}
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