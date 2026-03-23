import "./B2BCustomer.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";

const API = "/api/B2BCustomer";

export default function B2BCustomer() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // ── ref for hidden import file input ─────────────────────────
  const importRef = useRef<HTMLInputElement>(null);

  // ── NEW: live search state ────────────────────────────────────
  const [tableSearch, setTableSearch] = useState("");

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

  // ── NEW: filtered customers for enterprise table ──────────────
  const filteredCustomers = customers.filter((c) => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.companyName    ?? "").toLowerCase().includes(q) ||
      (c.contactPerson  ?? "").toLowerCase().includes(q) ||
      (c.email          ?? "").toLowerCase().includes(q) ||
      (c.phone          ?? "").toLowerCase().includes(q)
    );
  });

  // ── Derived values ────────────────────────────────────────────
  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  // Company avatar initial
  const companyInitial = (name: string) =>
    (name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="b2b-page">

      {/* ═══ NAVBAR ═══════════════════════════════════════════ */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">B2B Customer</span>
          </div>
        </div>

        <div className="pro-right">

          {/* EXISTING — hidden via CSS */}
          <span className="user-name">
            Welcome, {username} ({role})
          </span>
          <button className="module-btn" onClick={() => navigate("/modules")}>
            Modules
          </button>
          <button className="module-btn" onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>

          {/* ── USERNAME PILL ── */}
          <div className="b2b-user-info">
            <div className="b2b-user-avatar">{initial}</div>
            <div className="b2b-user-text">
              <span className="b2b-user-name">{username}</span>
              <span className="b2b-user-role">{role}</span>
            </div>
          </div>

          {/* ── NAV ICON BUTTONS ── */}
          <div className="b2b-icon-group">

            {/* Modules */}
            <button
              className="b2b-icon-btn btn-b2b-modules"
              data-tip="Modules"
              aria-label="Modules"
              onClick={() => navigate("/modules")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>

            {/* Dashboard */}
            <button
              className="b2b-icon-btn btn-b2b-dashboard"
              data-tip="Dashboard"
              aria-label="Dashboard"
              onClick={() => navigate("/dashboard")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>

            {/* Logout */}
            <button
              className="b2b-icon-btn btn-b2b-logout"
              data-tip="Logout"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>

        </div>
      </header>

      {/* ═══ CONTENT ══════════════════════════════════════════ */}
      <div className="b2b-container">

        {/* ── ENTERPRISE HEADER ROW ── */}
        <div className="b2b-header-row">
          <div className="b2b-header-title">
            <div className="b2b-header-icon">👥</div>
            <div className="b2b-header-text">
              <h1>B2B Customers</h1>
              <span className="b2b-header-sub">Manage dealer & enterprise customer records</span>
            </div>
          </div>
          <div className="b2b-stat-chips">
            <div className="b2b-chip chip-total">
              <strong>{customers.length}</strong> Total
            </div>
            <div className="b2b-chip chip-active">
              <strong>{customers.length}</strong> Active
            </div>
          </div>
        </div>

        {/* ── ENTERPRISE FORM CARD ── */}
        <div className="b2b-form-card">
          <div className="b2b-form-header">
            <div className="b2b-form-header-icon">
              {editingId !== null ? "✏️" : "➕"}
            </div>
            <div className="b2b-form-header-text">
              <h3>{editingId !== null ? "Edit Customer" : "Add New Customer"}</h3>
              <p>{editingId !== null ? "Update the customer information below" : "Fill in the details to register a new B2B customer"}</p>
            </div>
          </div>

          <div className="b2b-form-body">
            <div className="b2b-form-grid">
            <div className="b2b-form-field">
              <label>Company Name *</label>
              <input
                placeholder="e.g. Acme Corp"
                value={form.companyName || ""}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="b2b-form-field">
              <label>Contact Person</label>
              <input
                placeholder="e.g. John Doe"
                value={form.contactPerson || ""}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="b2b-form-field">
              <label>Email</label>
              <input
                placeholder="e.g. john@acme.com"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="b2b-form-field">
              <label>Phone</label>
              <input
                placeholder="e.g. +91 98765 43210"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="b2b-form-field">
              <label>GST Number</label>
              <input
                placeholder="e.g. 27AAPFU0939F1ZV"
                value={form.gstnumber || ""}
                onChange={(e) => setForm({ ...form, gstnumber: e.target.value })}
              />
            </div>
          </div>

          <div className="b2b-form-actions">
            <button className="b2b-submit-btn" onClick={handleSubmit}>
              {editingId !== null ? "✓  Update Customer" : "+  Add Customer"}
            </button>
            {editingId !== null && (
              <button className="b2b-cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
          </div>{/* /b2b-form-body */}
        </div>

        {/* ── ENTERPRISE ACTION CARDS ── */}
        <div className="b2b-action-cards">

          <div className="b2b-action-card">
            <div className="b2b-action-card-icon">
              <div className="b2b-action-card-icon-circle green">📥</div>
              <span className="b2b-action-card-icon-title">Download Template</span>
            </div>
            <div className="b2b-action-card-body">
              <p>Get the Excel import template with correct column format</p>
              <button className="b2b-action-card-btn green-btn" onClick={downloadTemplate}>
                Download Excel
              </button>
            </div>
          </div>

          <div className="b2b-action-card">
            <div className="b2b-action-card-icon">
              <div className="b2b-action-card-icon-circle blue">📤</div>
              <span className="b2b-action-card-icon-title">Import Customers</span>
            </div>
            <div className="b2b-action-card-body">
              <p>Upload a filled Excel file to bulk-import customer records</p>

              {/* Hidden native file input */}
              <input
                ref={importRef}
                type="file"
                className="b2b-file-hidden"
                onChange={handleImport}
              />

              {/* Styled button matching Download Excel */}
              <button
                className="b2b-upload-btn"
                onClick={() => importRef.current?.click()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 5 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Import Excel
              </button>
            </div>
          </div>

        </div>

        {/* ── ENTERPRISE TABLE ── */}
        <div className="b2b-table-enterprise">

          {/* Toolbar */}
          <div className="b2b-table-toolbar">
            <div className="b2b-table-toolbar-title">
              <h3>Customer Records</h3>
              <span className="b2b-table-count">{filteredCustomers.length} records</span>
            </div>

            {/* Live search */}
            <div className="b2b-table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search customers…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Scrollable table */}
          <div className="b2b-table-scroll">
            {filteredCustomers.length === 0 ? (
              <div className="b2b-empty-state">
                <div className="b2b-empty-icon">👥</div>
                <p>{tableSearch ? `No customers match "${tableSearch}"` : "No customers added yet"}</p>
              </div>
            ) : (
              <table className="b2b-enterprise-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>GST No.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, index) => {
                    const id = getId(c, index);
                    return (
                      <tr key={id}>

                        {/* ID */}
                        <td>
                          <span className="b2b-id-cell">{id}</span>
                        </td>

                        {/* Company */}
                        <td>
                          <div className="b2b-company-cell">
                            <div className="b2b-company-avatar">
                              {companyInitial(c.companyName)}
                            </div>
                            <span className="b2b-company-name">{c.companyName}</span>
                          </div>
                        </td>

                        {/* Contact + Email */}
                        <td>
                          <div className="b2b-contact-cell">
                            <span className="b2b-contact-name">{c.contactPerson || "—"}</span>
                            <span className="b2b-contact-email">{c.email || ""}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td>
                          <span className="b2b-phone-cell">{c.phone || "—"}</span>
                        </td>

                        {/* GST */}
                        <td style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", color: "#64748b" }}>
                          {c.gstnumber || "—"}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="b2b-row-actions">
                            <button
                              className="b2b-edit-btn"
                              onClick={() => handleEdit(c, index)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              className="b2b-delete-btn"
                              onClick={() => handleDelete(c, index)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── HIDDEN EXISTING ELEMENTS (preserved in DOM, not shown) ── */}
        <div style={{ display: "none" }}>
          {/* Original form-card kept for reference — replaced by b2b-form-card above */}
          <div className="form-card">
            <input placeholder="Company Name" value={form.companyName || ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <input placeholder="Contact Person" value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            <input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="GST Number" value={form.gstnumber || ""} onChange={(e) => setForm({ ...form, gstnumber: e.target.value })} />
            <div className="form-actions">
              <button className="add-btn" onClick={handleSubmit}>{editingId !== null ? "Update" : "Add"}</button>
              {editingId !== null && <button className="cancel-btn" onClick={handleCancel}>Cancel</button>}
            </div>
          </div>

          {/* Original action cards */}
          <div className="b2b-actions-container">
            <div className="action-card">
              <h3>Download Template</h3><p>Download Excel format</p>
              <button className="action-btn" onClick={downloadTemplate}>Download Excel</button>
            </div>
            <div className="action-card">
              <h3>Import Customers</h3><p>Upload Excel file</p>
              <input type="file" className="file-input" onChange={handleImport} />
            </div>
          </div>

          {/* Original table */}
          <div className="b2b-table">
            <table>
              <thead><tr><th>ID</th><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead>
              <tbody>
                {customers.map((c, index) => {
                  const id = getId(c, index);
                  return (
                    <tr key={id}>
                      <td>{id}</td><td>{c.companyName}</td><td>{c.contactPerson}</td>
                      <td>{c.email}</td><td>{c.phone}</td>
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
    </div>
  );
}