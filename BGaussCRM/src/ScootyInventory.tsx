import "./ScootyInventory.css";
import logo from "./assets/logo.jpg";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "/api/ScootyInventory";

export default function ScootyInventory() {
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [colours, setColours] = useState<any[]>([]);

  const [form, setForm] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  // ================= FETCH =================
  const fetchData = async () => {
    const res = await axios.get(API);
    setData(res.data);
  };

  const fetchModels = async () => {
    const res = await axios.get(`${API}/models`);
    setModels(res.data);
  };

  const fetchVariants = async (modelId: number) => {
    const res = await axios.get(`${API}/variants/${modelId}`);
    setVariants(res.data);
  };

  const fetchColours = async (modelId: number, variantId: number) => {
    const res = await axios.get(
      `${API}/colours?modelId=${modelId}&variantId=${variantId}`
    );
    setColours(res.data);
  };

  useEffect(() => {
    fetchData();
    fetchModels();
  }, []);

  // ================= ADD / UPDATE =================
  const handleSubmit = async () => {
  try {
    if (!form.modelId || !form.variantId) {
      alert("Model & Variant required");
      return;
    }

    const formData = new FormData();

    formData.append("modelId", String(form.modelId));
    formData.append("variantId", String(form.variantId));
    formData.append("colourId", form.colourId ? String(form.colourId) : "");
    formData.append("price", form.price ? String(form.price) : "");
    formData.append("batterySpecs", form.batterySpecs || "");
    formData.append("rangeKm", form.rangeKm ? String(form.rangeKm) : "");

    // 🔥 FIX HERE
    formData.append("stockAvailable", form.stockAvailable ? "true" : "false");

    if (form.image) {
      formData.append("image", form.image);
    }

    if (editingId) {
      await axios.put(`${API}/${editingId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    } else {
      await axios.post(`${API}/add-item`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }

    setForm({});
    setEditingId(null);
    fetchData();

  } catch (err: any) {
    console.error("SAVE ERROR 👉", err.response?.data || err.message);
    alert(err.response?.data || "Save failed");
  }
};

  // ================= EDIT =================
  const handleEdit = (item: any) => {
    setForm(item);
    setEditingId(item.scootyId);

    fetchVariants(item.modelId);
    fetchColours(item.modelId, item.variantId);
  };

  const handleDelete = async (id: number) => {
  try {
    if (!window.confirm("Delete item?")) return;

    await axios.delete(`${API}/${id}`);

    fetchData(); // refresh table

  } catch (err: any) {
    console.error("DELETE ERROR 👉", err.response?.data || err.message);
    alert(err.response?.data || "Delete failed");
  }
};
  // ================= IMPORT =================
  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    const data = new FormData();
    data.append("file", file);

    await axios.post(`${API}/import`, data);
    fetchData();
  };

  const downloadTemplate = () => {
    window.open(`${API}/download-template`);
  };

  return (
    <div className="inv-page">

      {/* ✅ NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Scooty Inventory</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">Welcome, Admin</span>

          <button className="module-btn" onClick={() => navigate("/modules")}>
            Modules
          </button>

          <button className="module-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="inv-container">

        {/* FORM */}
        <div className="form-card">

          <select
            value={form.modelId || ""}
            onChange={(e) => {
              setForm({ ...form, modelId: e.target.value });
              fetchVariants(Number(e.target.value));
            }}
          >
            <option value="">Model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.modelName}
              </option>
            ))}
          </select>

          <select
            value={form.variantId || ""}
            onChange={(e) => {
              setForm({ ...form, variantId: e.target.value });
              fetchColours(form.modelId, Number(e.target.value));
            }}
          >
            <option value="">Variant</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.variantName}
              </option>
            ))}
          </select>

          <select
            value={form.colourId || ""}
            onChange={(e) =>
              setForm({ ...form, colourId: e.target.value })
            }
          >
            <option value="">Colour</option>
            {colours.map((c) => (
              <option key={c.id} value={c.id}>
                {c.colourName}
              </option>
            ))}
          </select>

          <input placeholder="Price"
            value={form.price || ""}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <input placeholder="Battery"
            value={form.batterySpecs || ""}
            onChange={(e) => setForm({ ...form, batterySpecs: e.target.value })}
          />

          <input placeholder="Range KM"
            value={form.rangeKm || ""}
            onChange={(e) => setForm({ ...form, rangeKm: e.target.value })}
          />

          <input type="file"
            onChange={(e: any) =>
              setForm({ ...form, image: e.target.files[0] })
            }
          />

          <label>
            <input
              type="checkbox"
              checked={form.stockAvailable || false}
              onChange={(e) =>
                setForm({ ...form, stockAvailable: e.target.checked })
              }
            />
            In Stock
          </label>

          <button className="add-btn" onClick={handleSubmit}>
            {editingId ? "Update" : "Add"}
          </button>

        </div>

        {/* ACTIONS */}
        <div className="actions">
          <button className="action-btn" onClick={downloadTemplate}>
            Download Template
          </button>

          <input type="file" onChange={handleImport} />
        </div>

        {/* TABLE */}
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Model</th>
                <th>Variant</th>
                <th>Colour</th>
                <th>Price</th>
                <th>Range</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.map((d) => (
                <tr key={d.scootyId}>
                  <td>{d.scootyId}</td>
                  <td>{d.modelName}</td>
                  <td>{d.variantName}</td>
                  <td>{d.colourName}</td>
                  <td>{d.price}</td>
                  <td>{d.rangeKm}</td>
                  <td>{d.stockAvailable ? "Yes" : "No"}</td>

                  <td>
                    <button onClick={() => handleEdit(d)}>Edit</button>
                    <button onClick={() => handleDelete(d.scootyId)}>Delete</button>
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