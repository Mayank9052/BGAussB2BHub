import "./B2BCustomer.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const API = "/api/B2BCustomer";

export default function B2BCustomer() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const getId = (c: any, index?: number) => {
    return c.id ?? c.Id ?? c.customerId ?? index;
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(API);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async () => {
    if (!form.companyName) {
      alert("Company Name required");
      return;
    }

    const query = new URLSearchParams({
      companyName: form.companyName || "",
      contactPerson: form.contactPerson || "",
      address: form.address || "",
      email: form.email || "",
      phone: form.phone || "",
      gstnumber: form.gstnumber || "",
    }).toString();

    if (editingId !== null) {
      await axios.put(`${API}/${editingId}?${query}`);
    } else {
      await axios.post(`${API}/create?${query}`);
    }

    setForm({});
    setEditingId(null);
    fetchCustomers();
  };

  const handleDelete = async (c: any, index: number) => {
    const id = getId(c, index);

    if (!window.confirm("Delete this customer?")) return;

    await axios.delete(`${API}/${id}`);
    fetchCustomers();
  };

  const handleEdit = (c: any, index: number) => {
    const id = getId(c, index);

    setForm({
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      address: c.address,
      email: c.email,
      phone: c.phone,
      gstnumber: c.gstnumber,
    });

    setEditingId(id);
  };

  const handleCancel = () => {
    setForm({});
    setEditingId(null);
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);

    await axios.post(`${API}/import`, data);
    fetchCustomers();
  };

  const downloadTemplate = () => {
    window.open(`${API}/download-template`);
  };

  return (
    <div className="b2b-page">

      {/* NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">B2B Customer</span>
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
      <div className="b2b-container">

        <h1>B2B Customers</h1>

        {/* FORM */}
        <div className="form-card">
          <input placeholder="Company Name"
            value={form.companyName || ""}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />

          <input placeholder="Contact Person"
            value={form.contactPerson || ""}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
          />

          <input placeholder="Email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input placeholder="Phone"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input placeholder="GST Number"
            value={form.gstnumber || ""}
            onChange={(e) => setForm({ ...form, gstnumber: e.target.value })}
          />

          <div className="form-actions">
            <button className="add-btn" onClick={handleSubmit}>
              {editingId !== null ? "Update" : "Add"}
            </button>

            {editingId !== null && (
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* IMPORT & DOWNLOAD */}
        <div className="b2b-actions-container">

          <div className="action-card">
            <h3>Download Template</h3>
            <p>Download Excel format</p>
            <button className="action-btn" onClick={downloadTemplate}>
              Download Excel
            </button>
          </div>

          <div className="action-card">
            <h3>Import Customers</h3>
            <p>Upload Excel file</p>
            <input type="file" className="file-input" onChange={handleImport} />
          </div>

        </div>

        {/* TABLE */}
        <div className="b2b-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((c, index) => {
                const id = getId(c, index);

                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{c.companyName}</td>
                    <td>{c.contactPerson}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>

                    <td className="table-actions">
                      <button className="edit-btn" onClick={() => handleEdit(c, index)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(c, index)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}