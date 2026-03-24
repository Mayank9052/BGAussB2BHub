import "./B2BCustomer.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";

const API = "/api/B2BCustomer";
const PAGE_SIZE = 10;

// ── TYPES ──────────────────────────────────────────────────
interface Customer {
  id?: number;
  Id?: number;
  customerId?: number;
  companyName: string;
  contactPerson: string;
  address?: string;
  email: string;
  phone: string;
  gstnumber: string;
}

interface FormState {
  companyName: string;
  contactPerson: string;
  address: string;
  email: string;
  phone: string;
  gstnumber: string;
}

const emptyForm: FormState = {
  companyName: "", contactPerson: "", address: "",
  email: "", phone: "", gstnumber: "",
};

// ── PAGINATION HELPER ──────────────────────────────────────
interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPage: (p: number) => void;
}

function PaginationBar({ currentPage, totalPages, totalRecords, pageSize, onPage }: PaginationBarProps) {
  if (totalRecords <= pageSize) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalRecords);

  // Build page number list with ellipsis
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      if (pages.length > 0 && typeof pages[pages.length - 1] === "number" && (pages[pages.length - 1] as number) < p - 1) {
        pages.push("…");
      }
      pages.push(p);
    }
  }

  return (
    <div className="b2b-pg-bar">
      <span className="b2b-pg-info">
        Showing <strong>{from}–{to}</strong> of <strong>{totalRecords}</strong> records
      </span>
      <div className="b2b-pg-btns">
        <button
          className="b2b-pg"
          onClick={() => onPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >‹</button>

        {pages.map((p, i) =>
          p === "…"
            ? <span key={`e${i}`} className="b2b-pg-ellipsis">…</span>
            : <button
                key={p}
                className={`b2b-pg${currentPage === p ? " active" : ""}`}
                onClick={() => onPage(p as number)}
              >{p}</button>
        )}

        <button
          className="b2b-pg"
          onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >›</button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function B2BCustomer() {
  const navigate = useNavigate();

  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [form,        setForm]        = useState<FormState>(emptyForm);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [successMsg,  setSuccessMsg]  = useState("");
  const [errorMsg,    setErrorMsg]    = useState("");

  // ── FIX: refreshKey replaces useCallback fetchCustomers ──
  // Every "void fetchCustomers()" is now replaced by triggerRefresh().
  // The fetch lives entirely inside useEffect — no setState called
  // synchronously in the effect body (it's called from a .then callback),
  // which satisfies the react-hooks/set-state-in-effect rule.
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    axios
      .get<Customer[]>(API)
      .then((res) => { if (!cancelled) setCustomers(res.data); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [refreshKey]); // re-runs whenever triggerRefresh() is called

  const importRef = useRef<HTMLInputElement>(null);

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const handleLogout = () => { localStorage.clear(); navigate("/", { replace: true }); };

  const flash = (msg: string, type: "success" | "error" = "success") => {
    if (type === "success") {
      setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(msg);
    }
  };

  const getId = (c: Customer) => c.id ?? c.Id ?? c.customerId ?? 0;

  // ── SUBMIT ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      flash("Company Name is required.", "error"); return;
    }
    const query = new URLSearchParams({
      companyName:   form.companyName,
      contactPerson: form.contactPerson,
      address:       form.address,
      email:         form.email,
      phone:         form.phone,
      gstnumber:     form.gstnumber,
    }).toString();

    try {
      if (editingId !== null) {
        await axios.put(`${API}/${editingId}?${query}`);
        flash("Customer updated successfully ✓");
      } else {
        await axios.post(`${API}/create?${query}`);
        flash("Customer added successfully ✓");
      }
      setForm(emptyForm);
      setEditingId(null);
      setErrorMsg("");
      triggerRefresh(); // ← was: void fetchCustomers()
    } catch (err: unknown) {
      const e = err as { response?: { data?: string } };
      flash(e.response?.data || "Save failed", "error");
    }
  };

  // ── EDIT ──────────────────────────────────────────────────
  const handleEdit = (c: Customer) => {
    setForm({
      companyName:   c.companyName   ?? "",
      contactPerson: c.contactPerson ?? "",
      address:       c.address       ?? "",
      email:         c.email         ?? "",
      phone:         c.phone         ?? "",
      gstnumber:     c.gstnumber     ?? "",
    });
    setEditingId(getId(c));
    setErrorMsg(""); setSuccessMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setForm(emptyForm); setEditingId(null);
    setErrorMsg(""); setSuccessMsg("");
  };

  // ── DELETE ────────────────────────────────────────────────
  const handleDelete = async (c: Customer) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await axios.delete(`${API}/${getId(c)}`);
      triggerRefresh(); // ← was: void fetchCustomers()
      flash("Customer deleted");
    } catch {
      flash("Delete failed", "error");
    }
  };

  // ── IMPORT / EXPORT ───────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      await axios.post(`${API}/import`, fd);
      triggerRefresh(); // ← was: void fetchCustomers()
      flash("Import successful ✓");
    } catch { flash("Import failed", "error"); }
    e.target.value = "";
  };

  const downloadTemplate = () => window.open(`${API}/download-template`);

  // ── DERIVED ───────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.companyName   ?? "").toLowerCase().includes(q) ||
      (c.contactPerson ?? "").toLowerCase().includes(q) ||
      (c.email         ?? "").toLowerCase().includes(q) ||
      (c.phone         ?? "").toLowerCase().includes(q) ||
      (c.gstnumber     ?? "").toLowerCase().includes(q)
    );
  }, [customers, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const paginated  = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const companyInitial = (name: string) => (name ?? "?").trim().charAt(0).toUpperCase();

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="b2b-page">

      {/* CYAN TOP BAR */}
      <div className="b2b-topbar" />

      {/* ═══ NAVBAR ══════════════════════════════════════════ */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">B2B Customers</span>
          </div>
        </div>

        <div className="pro-right">
          {/* hidden legacy buttons */}
          <span className="user-name">Welcome, {username} ({role})</span>
          <button onClick={() => navigate("/modules")} className="module-btn">Modules</button>
          <button onClick={() => navigate("/dashboard")} className="module-btn">Dashboard</button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>

          {/* User pill */}
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initial}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="vc-icon-group">
            <button className="vc-icon-btn btn-vc-modules" data-tip="Modules" onClick={() => navigate("/modules")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-dashboard" data-tip="Dashboard" onClick={() => navigate("/dashboard")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
              </svg>
            </button>
            <button className="vc-icon-btn btn-vc-logout" data-tip="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ PAGE CONTENT ════════════════════════════════════ */}
      <div className="b2b-container">

        {/* Alerts */}
        {successMsg && <div className="b2b-alert b2b-alert-success">✅ {successMsg}</div>}
        {errorMsg && (
          <div className="b2b-alert b2b-alert-error">
            ⚠️ {errorMsg}
            <button className="b2b-alert-close" onClick={() => setErrorMsg("")}>×</button>
          </div>
        )}

        {/* Banner */}
        <div className="b2b-banner">
          <div className="b2b-banner-text">
            <h1>B2B Customers</h1>
            <p>Manage dealer &amp; enterprise customer records</p>
          </div>
        </div>

        {/* Top grid: form left | bulk right */}
        <div className="b2b-top-grid">

          {/* FORM CARD */}
          <div className="b2b-left-col">
            <div className="b2b-form-card">
              <div className="b2b-form-header">
                <div className="b2b-form-icon">
                  <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {editingId !== null
                      ? <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                      : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
                    }
                  </svg>
                </div>
                <h2>{editingId !== null ? "Edit Customer" : "Add New Customer"}</h2>
                <p>{editingId !== null ? `Editing customer ID #${editingId}` : "Fill in the details to register a new B2B customer"}</p>
              </div>

              <div className="b2b-form-body">
                {/* Row 1: Company | Contact | Email */}
                <div className="b2b-row-3">
                  <div className="b2b-field">
                    <label className="b2b-label">Company Name *</label>
                    <input className="b2b-input" placeholder="e.g. Acme Corp"
                      value={form.companyName}
                      onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
                  </div>
                  <div className="b2b-field">
                    <label className="b2b-label">Contact Person</label>
                    <input className="b2b-input" placeholder="e.g. John Doe"
                      value={form.contactPerson}
                      onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} />
                  </div>
                  <div className="b2b-field">
                    <label className="b2b-label">Email</label>
                    <input className="b2b-input" placeholder="e.g. john@acme.com" type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>

                {/* Row 2: Phone | GST | Address */}
                <div className="b2b-row-3">
                  <div className="b2b-field">
                    <label className="b2b-label">Phone</label>
                    <input className="b2b-input" placeholder="e.g. +91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="b2b-field">
                    <label className="b2b-label">GST Number</label>
                    <input className="b2b-input" placeholder="e.g. 27AAPFU0939F1ZV"
                      value={form.gstnumber}
                      onChange={(e) => setForm((p) => ({ ...p, gstnumber: e.target.value }))} />
                  </div>
                  <div className="b2b-field">
                    <label className="b2b-label">Address</label>
                    <input className="b2b-input" placeholder="e.g. Mumbai, Maharashtra"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="b2b-form-btns">
                  <button className="b2b-btn-save" onClick={handleSubmit}>
                    {editingId !== null ? "Update" : "Add"}
                  </button>
                  {editingId !== null && (
                    <button className="b2b-btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BULK CARD */}
          <div className="b2b-bulk-card">
            <div className="b2b-bulk-body">
              <div className="b2b-bulk-section">
                <div className="b2b-bulk-section-info">
                  <span className="b2b-bulk-label">DOWNLOAD TEMPLATE</span>
                  <span className="b2b-bulk-desc">Get the Excel import template with correct columns</span>
                </div>
                <button className="b2b-btn-dl" onClick={downloadTemplate}>
                  <svg viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Excel
                </button>
              </div>

              <hr className="b2b-bulk-hr" />

              <div className="b2b-bulk-section">
                <div className="b2b-bulk-section-info">
                  <span className="b2b-bulk-label">IMPORT CUSTOMERS</span>
                  <span className="b2b-bulk-desc">Upload a filled Excel file to bulk-import records</span>
                </div>
                <button className="b2b-btn-imp" onClick={() => importRef.current?.click()}>
                  <svg viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import Excel
                </button>
                <input ref={importRef} type="file" style={{ display: "none" }} onChange={handleImport} />
              </div>
            </div>
          </div>

        </div>{/* end top grid */}

        {/* TABLE CARD */}
        <div className="b2b-table-card">
          <div className="b2b-table-header">

            {/* Title */}
            <div className="b2b-table-title">
              <div className="b2b-table-title-icon">👥</div>
              <div>
                <h2>Customer Records</h2>
                <p>All registered B2B customers</p>
              </div>
            </div>

            {/* Pagination — top / header */}
            <div className="b2b-header-pagination">
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={filteredCustomers.length}
                pageSize={PAGE_SIZE}
                onPage={setCurrentPage}
              />
            </div>

            {/* Search + count */}
            <div className="b2b-table-controls">
              <div className="b2b-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" className="b2b-search" placeholder="Search company, contact, email…"
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }} />
              </div>
              <span className="b2b-count-pill">{filteredCustomers.length} records</span>
            </div>

          </div>

          {/* Table */}
          <div className="b2b-table-scroll">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>GST No.</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? (
                  paginated.map((c, idx) => (
                    <tr key={getId(c)} className={editingId === getId(c) ? "b2b-row-editing" : ""}>

                      <td data-label="#">
                        <span className="b2b-id-badge">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </span>
                      </td>

                      <td data-label="Company">
                        <div className="b2b-company-cell">
                          <div className="b2b-company-avatar">
                            {companyInitial(c.companyName)}
                          </div>
                          <span className="b2b-company-name">{c.companyName}</span>
                        </div>
                      </td>

                      <td data-label="Contact">
                        <div className="b2b-contact-cell">
                          <span className="b2b-contact-name">{c.contactPerson || "—"}</span>
                          <span className="b2b-contact-email">{c.email || ""}</span>
                        </div>
                      </td>

                      <td data-label="Phone">
                        <span className="b2b-phone-cell">{c.phone || "—"}</span>
                      </td>

                      <td data-label="GST No.">
                        <span className="b2b-gst-cell">{c.gstnumber || "—"}</span>
                      </td>

                      <td data-label="Address">
                        <span className="b2b-address-cell">{c.address || "—"}</span>
                      </td>

                      <td data-label="Actions">
                        <div className="b2b-row-acts">
                          <button className="b2b-act-btn b2b-act-edit" onClick={() => handleEdit(c)}>
                            Edit
                          </button>

                          <button className="b2b-act-btn b2b-act-del" onClick={() => handleDelete(c)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="b2b-empty">
                        <div className="b2b-empty-icon">👥</div>
                        <div className="b2b-empty-title">
                          {tableSearch ? `No customers match "${tableSearch}"` : "No customers added yet"}
                        </div>
                        <div className="b2b-empty-sub">
                          {tableSearch ? "Try a different keyword." : "Add your first customer using the form above."}
                        </div>
                      </div>
                    </td> 
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* ══ BOTTOM PAGINATION ══════════════════════════════ */}
          <div className="b2b-table-footer">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={filteredCustomers.length}
              pageSize={PAGE_SIZE}
              onPage={(p) => {
                setCurrentPage(p);
                // Scroll table into view for UX comfort on long lists
                document.querySelector(".b2b-table-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </div>

        </div>

      </div>
    </div>
  );
}