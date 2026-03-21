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

  const [form, setForm] = useState<any>({
    modelId: "",
    variantId: "",
    colourId: "",
    price: "",
    batterySpecs: "",
    rangeKm: "",
    stockAvailable: false,
    image: null
  });

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

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    try {
      if (!form.modelId || !form.variantId || !form.colourId) {
        alert("Please select Model, Variant and Colour");
        return;
      }

      const exists = data.some(
        (item) =>
          Number(item.modelId) === Number(form.modelId) &&
          Number(item.variantId) === Number(form.variantId) &&
          Number(item.colourId) === Number(form.colourId) &&
          item.scootyId !== editingId
      );

      if (exists) {
        alert("⚠️ This combination already exists!");
        return;
      }

      const formData = new FormData();

      formData.append("modelId", String(form.modelId));
      formData.append("variantId", String(form.variantId));
      formData.append("colourId", String(form.colourId));

      if (form.price)
        formData.append("price", String(Number(form.price)));

      if (form.batterySpecs)
        formData.append("batterySpecs", form.batterySpecs);

      if (form.rangeKm)
        formData.append("rangeKm", String(Number(form.rangeKm)));

      formData.append(
        "stockAvailable",
        form.stockAvailable ? "true" : "false"
      );

      if (form.image) {
        formData.append("image", form.image);
      }

      if (editingId) {
        await axios.put(`${API}/${editingId}`, formData);
      } else {
        await axios.post(`${API}/add-item`, formData);
      }

      setForm({
        modelId: "",
        variantId: "",
        colourId: "",
        price: "",
        batterySpecs: "",
        rangeKm: "",
        stockAvailable: false,
        image: null
      });

      setEditingId(null);
      setVariants([]);
      setColours([]);

      fetchData();
    } catch (err: any) {
      console.error("SAVE ERROR 👉", err.response?.data || err.message);
      alert(err.response?.data || "Save failed");
    }
  };

  // ================= EDIT =================
  const handleEdit = (item: any) => {
    const modelId = Number(item.modelId);
    const variantId = Number(item.variantId);

    setForm({
      ...item,
      modelId,
      variantId,
      colourId: Number(item.colourId)
    });

    setEditingId(item.scootyId);

    fetchVariants(modelId);
    fetchColours(modelId, variantId);
  };

  // ================= DELETE =================
  const handleDelete = async (id: number) => {
    try {
      if (!window.confirm("Delete item?")) return;

      await axios.delete(`${API}/${id}`);
      fetchData();
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

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Scooty Inventory</span>
          </div>
        </div>

        <div className="pro-right">
           Welcome, {localStorage.getItem("username")} ({localStorage.getItem("role")})

          <button onClick={() => navigate("/modules")} className="module-btn">
            Modules
          </button>

          <button onClick={() => navigate("/dashboard")} className="module-btn">
            Dashboard
          </button>

          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="inv-container">

        {/* ===== GRID WRAPPER ===== */}
        <div className="section-grid">

          {/* FORM */}
          <div className="form-wrapper">
            <div className="form-card">

              {/* ALL YOUR EXISTING FORM CODE (UNCHANGED) */}
              {/* MODEL */}
              <select value={form.modelId} onChange={(e) => {
                const modelId = Number(e.target.value);
                setForm({
                  modelId,
                  variantId: "",
                  colourId: "",
                  price: "",
                  batterySpecs: "",
                  rangeKm: "",
                  stockAvailable: false,
                  image: null
                });
                fetchVariants(modelId);
                setColours([]);
              }}>
                <option value="">Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.modelName}</option>
                ))}
              </select>

              {/* VARIANT */}
              <select value={form.variantId} onChange={(e) => {
                const variantId = Number(e.target.value);
                const modelId = Number(form.modelId);
                setForm((prev: any) => ({ ...prev, variantId, colourId: "" }));
                fetchColours(modelId, variantId);
              }}>
                <option value="">Variant</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.variantName}</option>
                ))}
              </select>

              {/* COLOUR */}
              <select value={form.colourId} onChange={(e) =>
                setForm({ ...form, colourId: Number(e.target.value) })
              }>
                <option value="">Colour</option>
                {colours.map((c) => (
                  <option key={c.id} value={c.id}>{c.colourName}</option>
                ))}
              </select>

              <input placeholder="Price" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />

              <input placeholder="Battery" value={form.batterySpecs}
                onChange={(e) => setForm({ ...form, batterySpecs: e.target.value })} />

              <input placeholder="Range KM" value={form.rangeKm}
                onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} />

              <input type="file"
                onChange={(e: any) => setForm({ ...form, image: e.target.files[0] })} />

              <label>
                <input type="checkbox" checked={form.stockAvailable}
                  onChange={(e) => setForm({ ...form, stockAvailable: e.target.checked })} />
                In Stock
              </label>

              <button className="add-btn" onClick={handleSubmit}>
                {editingId ? "Update" : "Add"}
              </button>

            </div>
          </div>

          {/* ACTIONS */}
          <div className="actions-wrapper">
            <div className="actions">
              <button className="action-btn" onClick={downloadTemplate}>
                Download Template
              </button>

              <input type="file" onChange={handleImport} />
            </div>
          </div>

        </div>

        {/* TABLE (UNCHANGED) */}
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