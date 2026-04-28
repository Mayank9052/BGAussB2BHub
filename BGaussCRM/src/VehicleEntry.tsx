import "./VehicleEntry.css";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import logo from "./assets/logo.jpg";
import Tooltip from "./Tooltip";
import { useNavigate } from "react-router-dom";

/* ── TYPES ─────────────────────────────────────────────────── */
type Gender = "Male" | "Female" | "Other" | "";
type RequestType = "Quote" | "Test Ride" | "Brochure" | "Callback" | "";

interface VehicleEntryForm {
  customerName: string;
  mobileNumber: string;
  email: string;
  city: string;
  state: string;
  gender: Gender;
  preferredModel: string;
  requestType: RequestType;
  preferredContact: string;
  notes: string;
}

interface FieldError {
  [key: string]: string;
}

interface CustomerRequest {
  id: number;
  customerName: string;
  mobileNumber: string;
  email?: string;
  city: string;
  state?: string;
  gender?: string;
  preferredModel?: string;
  requestType?: string;
  preferredContact?: string;
  notes?: string;
  createdAt: string;
  status: string;
}

const emptyForm: VehicleEntryForm = {
  customerName: "", mobileNumber: "", email: "",
  city: "", state: "", gender: "",
  preferredModel: "", requestType: "", preferredContact: "", notes: "",
};

const MODELS = ["BGauss A2", "BGauss B8", "BGauss RUV 400", "BGauss D15", "BGauss C3"];
const REQUEST_TYPES: RequestType[] = ["Quote", "Test Ride", "Brochure", "Callback"];
const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const getInitials = (name: string | null) => {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
};

/* ── VALIDATION ────────────────────────────────────────────── */
function validateForm(form: VehicleEntryForm): FieldError {
  const errs: FieldError = {};
  if (!form.customerName.trim()) errs.customerName = "Customer name is required.";
  else if (form.customerName.trim().length < 2) errs.customerName = "Name must be at least 2 characters.";
  
  if (!form.mobileNumber.trim()) errs.mobileNumber = "Mobile number is required.";
  else if (!/^[6-9]\d{9}$/.test(form.mobileNumber.replace(/\s/g, "")))
    errs.mobileNumber = "Enter a valid 10-digit Indian mobile number.";
  
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = "Enter a valid email address.";
  
  if (!form.city.trim()) errs.city = "City is required.";
  if (!form.requestType) errs.requestType = "Please select a request type.";
  
  return errs;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function VehicleEntry() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const role     = localStorage.getItem("role");
  const initials = getInitials(username);

  /* ── State ── */
  const [form,            setForm]            = useState<VehicleEntryForm>(emptyForm);
  const [fieldErrors,     setFieldErrors]     = useState<FieldError>({});
  const [touched,         setTouched]         = useState<Set<string>>(new Set());
  const [requests,        setRequests]        = useState<CustomerRequest[]>([]);
  const [tableSearch,     setTableSearch]     = useState("");
  const [sortField,       setSortField]       = useState<keyof CustomerRequest>("createdAt");
  const [sortDir,         setSortDir]         = useState<"asc"|"desc">("desc");
  const [statusFilter,    setStatusFilter]    = useState<string>("All");
  const [currentPage,     setCurrentPage]     = useState(1);
  const [editingId,       setEditingId]       = useState<number | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [savingRequest,   setSavingRequest]   = useState(false);
  const [requestError,    setRequestError]    = useState("");
  const [successMessage,  setSuccessMessage]  = useState("");
  const [errorMessage,    setErrorMessage]    = useState("");
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [submitSuccess,   setSubmitSuccess]   = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  /* ── Auth guard ── */
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/");
  }, []);

  /* ── Close mobile menu ── */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
        setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileMenuOpen]);

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/"); };

  /* ── Fetch ── */
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    setRequestError("");
    try {
      const res = await axios.get<CustomerRequest[]>("/api/CustomerRequests");
      setRequests(res.data);
    } catch {
      setRequestError("Failed to load customer requests. Please try again.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Form helpers ── */
  const setField = (field: keyof VehicleEntryForm, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setTouched(p => new Set(p).add(field));
    if (fieldErrors[field]) setFieldErrors(p => { const n={...p}; delete n[field]; return n; });
  };

  const markTouched = (field: string) => setTouched(p => new Set(p).add(field));
  const getError = (field: string) => touched.has(field) ? fieldErrors[field] : undefined;

  /* ── Reset form ── */
  const resetForm = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setTouched(new Set());
    setEditingId(null);
    setSubmitSuccess(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  /* ── Edit ── */
  const handleEdit = (r: CustomerRequest) => {
    setEditingId(r.id);
    setForm({
      customerName:    r.customerName,
      mobileNumber:    r.mobileNumber,
      email:           r.email ?? "",
      city:            r.city,
      state:           r.state ?? "",
      gender:          (r.gender as Gender) || "",
      preferredModel:  r.preferredModel ?? "",
      requestType:     (r.requestType as RequestType) || "",
      preferredContact:r.preferredContact ?? "",
      notes:           r.notes ?? "",
    });
    setFieldErrors({});
    setTouched(new Set());
    setSuccessMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Delete ── */
  const handleDelete = async (r: CustomerRequest) => {
    if (!window.confirm(`Delete request for "${r.customerName}"?`)) return;
    try {
      await axios.delete(`/api/CustomerRequests/${r.id}`);
      setSuccessMessage("Request deleted successfully.");
      if (editingId === r.id) resetForm();
      await fetchRequests();
    } catch {
      setErrorMessage("Failed to delete request.");
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { 
      setFieldErrors(errs); 
      Object.keys(errs).forEach(k => setTouched(p => new Set(p).add(k)));
      return; 
    }

    setSavingRequest(true);
    try {
      const payload = {
        customerName:    form.customerName,
        mobileNumber:    form.mobileNumber,
        email:           form.email || undefined,
        city:            form.city,
        state:           form.state || undefined,
        gender:          form.gender || undefined,
        preferredModel:  form.preferredModel || undefined,
        requestType:     form.requestType || undefined,
        preferredContact:form.preferredContact || undefined,
        notes:           form.notes || undefined,
      };
      if (editingId !== null) {
        await axios.put(`/api/CustomerRequests/${editingId}`, payload);
        setSuccessMessage("Request updated successfully.");
      } else {
        await axios.post("/api/CustomerRequests", payload);
        setSubmitSuccess(true);
        setSuccessMessage("Request submitted successfully!");
      }
      setErrorMessage("");
      await fetchRequests();
        setTimeout(() => {
          navigate("/vehicle/new", { replace: true });
        }, 2000);
      if (editingId === null) {
        setTimeout(resetForm, 2500);
      } else {
        resetForm();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: string } };
      setErrorMessage(e.response?.data || (editingId !== null ? "Failed to update." : "Failed to submit."));
      setSuccessMessage("");
    } finally {
      setSavingRequest(false);
    }
  };

  /* ── Table derived ── */
  const filtered = requests
    .filter(r => {
      if (statusFilter !== "All" && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      const q = tableSearch.trim().toLowerCase();
      if (!q) return true;
      return [r.customerName, r.mobileNumber, r.email||"", r.city, r.requestType||"", r.preferredModel||""]
        .join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (field: keyof CustomerRequest) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const statuses = ["All", ...Array.from(new Set(requests.map(r => r.status)))];

  /* ── Stats ── */
  const stats = {
    total:      requests.length,
    newCount:   requests.filter(r => r.status.toLowerCase() === "new").length,
    inProgress: requests.filter(r => r.status.toLowerCase() === "inprogress").length,
    closed:     requests.filter(r => r.status.toLowerCase() === "closed").length,
  };

  return (
    <div className="ve-page">
      <div className="ve-topbar" />

      {/* ═══ NAVBAR ═══ */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Customer Requests</span>
          </div>
        </div>

        <div className="pro-right">
          <div className="vc-user-info">
            <div className="vc-user-avatar">{initials}</div>
            <div className="vc-user-text">
              <span className="vc-user-name">{username}</span>
              <span className="vc-user-role">{role}</span>
            </div>
          </div>

          <div className="vc-icon-group">
            <Tooltip text="Dashboard">
              <button className="vc-icon-btn btn-vc-dashboard" onClick={() => navigate("/dashboard")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
                </svg>
              </button>
            </Tooltip>
            <Tooltip text="Logout">
              <button className="vc-icon-btn btn-vc-logout" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="ve-main">

        {/* ── Global Alerts ── */}
        {successMessage && (
          <div className="ve-alert ve-alert-success">
            ✅ {successMessage}
            <button className="ve-alert-close" onClick={() => setSuccessMessage("")}>×</button>
          </div>
        )}
        {errorMessage && (
          <div className="ve-alert ve-alert-error">
            ⚠️ {errorMessage}
            <button className="ve-alert-close" onClick={() => setErrorMessage("")}>×</button>
          </div>
        )}

        {/* ═══ BANNER ═══ */}
        <div className="ve-banner">
          <div className="ve-banner-text">
            <h1>{editingId !== null ? `Edit Request #${editingId}` : "New Customer Request"}</h1>
            <p>{editingId !== null ? "Update customer request details below." : "Fill in the details to register a new customer request"}</p>
          </div>
        </div>

        {/* ═══ FORM CARD ═══ */}
        <div className="ve-form-card">

          {/* Card header */}
          <div className="ve-form-header">
            <div className="ve-form-icon">
              {editingId !== null
                ? <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                : <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
              }
            </div>
            <div>
              <h2>{editingId !== null ? "Edit Request" : "New Request"}</h2>
              <p>{editingId !== null ? `Editing request #${editingId}` : "Fill in all details to submit a new customer request"}</p>
            </div>
          </div>

          {/* Form body */}
          <div className="ve-form-body">

            {/* Section 1: Contact Info */}
            <div className="ve-section">
              <span className="ve-section-label">PERSONAL INFORMATION</span>
              <div className="ve-row-3">
                <div className={`ve-field ${getError("customerName") ? "has-error" : ""}`}>
                  <label className="ve-label">Customer Name *</label>
                  <input className="ve-input" placeholder="e.g. Rahul Sharma"
                    value={form.customerName}
                    onChange={(e) => setField("customerName", e.target.value)}
                    onBlur={() => markTouched("customerName")}
                  />
                  {getError("customerName") && <span className="ve-error">{getError("customerName")}</span>}
                </div>
                <div className={`ve-field ${getError("mobileNumber") ? "has-error" : ""}`}>
                  <label className="ve-label">Mobile Number *</label>
                  <div className="ve-input-prefix">
                    <span>+91</span>
                    <input className="ve-input" placeholder="98765 43210"
                      value={form.mobileNumber}
                      onChange={(e) => setField("mobileNumber", e.target.value.replace(/\D/g,"").slice(0,10))}
                      onBlur={() => markTouched("mobileNumber")}
                      type="tel"
                      maxLength={10}
                    />
                  </div>
                  {getError("mobileNumber") && <span className="ve-error">{getError("mobileNumber")}</span>}
                </div>
                <div className={`ve-field ${getError("email") ? "has-error" : ""}`}>
                  <label className="ve-label">Email Address</label>
                  <input className="ve-input" placeholder="e.g. rahul@example.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    onBlur={() => markTouched("email")}
                    type="email"
                  />
                  {getError("email") && <span className="ve-error">{getError("email")}</span>}
                </div>
              </div>
            </div>

            {/* Section 2: Location */}
            <div className="ve-section">
              <span className="ve-section-label">LOCATION & CONTACT</span>
              <div className="ve-row-3">
                <div className={`ve-field ${getError("city") ? "has-error" : ""}`}>
                  <label className="ve-label">City *</label>
                  <input className="ve-input" placeholder="e.g. Pune"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    onBlur={() => markTouched("city")}
                  />
                  {getError("city") && <span className="ve-error">{getError("city")}</span>}
                </div>
                <div className="ve-field">
                  <label className="ve-label">State</label>
                  <select className="ve-input"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                  >
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="ve-field">
                  <label className="ve-label">Alternate Contact</label>
                  <div className="ve-input-prefix">
                    <span>+91</span>
                    <input className="ve-input" placeholder="Alternate number"
                      value={form.preferredContact}
                      onChange={(e) => setField("preferredContact", e.target.value.replace(/\D/g,"").slice(0,10))}
                      type="tel"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Request Details */}
            <div className="ve-section">
              <span className="ve-section-label">REQUEST DETAILS</span>
              <div className="ve-row-3">
                <div className="ve-field">
                  <label className="ve-label">Gender</label>
                  <select className="ve-input"
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value as Gender)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="ve-field">
                  <label className="ve-label">Preferred Model</label>
                  <select className="ve-input"
                    value={form.preferredModel}
                    onChange={(e) => setField("preferredModel", e.target.value)}
                  >
                    <option value="">Select model</option>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className={`ve-field ${getError("requestType") ? "has-error" : ""}`}>
                  <label className="ve-label">Request Type *</label>
                  <select className="ve-input"
                    value={form.requestType}
                    onChange={(e) => setField("requestType", e.target.value as RequestType)}
                    onBlur={() => markTouched("requestType")}
                  >
                    <option value="">Select request type</option>
                    {REQUEST_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                  </select>
                  {getError("requestType") && <span className="ve-error">{getError("requestType")}</span>}
                </div>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div className="ve-section">
              <span className="ve-section-label">ADDITIONAL NOTES</span>
              <div className="ve-field">
                <label className="ve-label">Notes</label>
                <textarea className="ve-textarea" placeholder="Any additional information or special requests..."
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <span className="ve-char-count">{form.notes.length}/500</span>
              </div>
            </div>

            {/* Success message */}
            {submitSuccess && (
              <div className="ve-success-box">
                <div className="ve-success-icon">✓</div>
                <div className="ve-success-text">Request submitted successfully!</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="ve-form-buttons">
              <button className="ve-btn-submit" onClick={handleSubmit} disabled={savingRequest}>
                {savingRequest ? "Processing..." : editingId !== null ? "Update Request" : "Submit Request"}
              </button>
              {editingId !== null && (
                <button className="ve-btn-cancel" onClick={resetForm}>Cancel</button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ TABLE CARD ═══ */}
        <div className="ve-table-card">

          {/* Table header */}
          <div className="ve-table-header">
            <div className="ve-table-title">
              <div className="ve-table-icon">📋</div>
              <div>
                <h2>Customer Requests</h2>
                <p>All submitted customer requests</p>
              </div>
            </div>

            <div className="ve-table-controls">
              {/* Status filter */}
              <div className="ve-filter-tabs">
                {statuses.map(s => (
                  <button
                    key={s}
                    className={`ve-filter-tab ${statusFilter === s ? "active" : ""}`}
                    onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="ve-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" className="ve-search" placeholder="Search requests..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <span className="ve-count-pill">{filtered.length} records</span>
            </div>
          </div>

          {/* Table */}
          {loadingRequests ? (
            <div className="ve-table-state">Loading...</div>
          ) : requestError ? (
            <div className="ve-table-state ve-table-err">{requestError}</div>
          ) : requests.length === 0 ? (
            <div className="ve-table-state ve-table-empty">
              <div className="ve-empty-icon">📋</div>
              <div className="ve-empty-title">No requests yet</div>
              <div className="ve-empty-sub">Submit your first customer request using the form above.</div>
            </div>
          ) : (
            <>
              <div className="ve-table-scroll">
                <table className="ve-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>City</th>
                      <th>Model</th>
                      <th>Request Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="ve-no-results">No results match your search or filter.</td>
                      </tr>
                    ) : paginated.map((r, idx) => (
                      <tr key={r.id} className={editingId === r.id ? "ve-row-editing" : ""}>
                        <td data-label="#">
                          <span className="ve-row-num">{(currentPage-1)*PAGE_SIZE+idx+1}</span>
                        </td>
                        <td data-label="Customer">
                          <div className="ve-customer-cell">
                            <div className="ve-customer-avatar">{r.customerName.trim().charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="ve-customer-name">{r.customerName}</div>
                              {r.email && <div className="ve-customer-email">{r.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Mobile" className="ve-mono">{r.mobileNumber}</td>
                        <td data-label="City">{r.city}{r.state ? `, ${r.state}` : ""}</td>
                        <td data-label="Model">{r.preferredModel || "—"}</td>
                        <td data-label="Request Type">
                          <span className={`ve-rt-badge ve-rt-${r.requestType?.toLowerCase().replace(" ","-")}`}>
                            {r.requestType || "—"}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className={`ve-status-chip ve-status-${r.status.toLowerCase()}`}>{r.status}</span>
                        </td>
                        <td data-label="Date" className="ve-date">
                          {new Date(r.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
                        </td>
                        <td data-label="Actions">
                          <div className="ve-row-acts">
                            <button className="ve-act-btn ve-act-edit" onClick={() => handleEdit(r)}>Edit</button>
                            <button className="ve-act-btn ve-act-del" onClick={() => handleDelete(r)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="ve-pagination">
                  <span className="ve-pg-info">
                    Showing {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="ve-pg-btns">
                    <button className="ve-pg" onClick={() => setCurrentPage(1)} disabled={currentPage===1}>«</button>
                    <button className="ve-pg" onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                    {Array.from({length: totalPages}, (_,i)=>i+1)
                      .filter(p => p===1||p===totalPages||Math.abs(p-currentPage)<=1)
                      .reduce<(number|"…")[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => p === "…"
                        ? <span key={`e${i}`} className="ve-pg-ellipsis">…</span>
                        : <button key={p} className={`ve-pg ${currentPage===p?"active":""}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
                      )
                    }
                    <button className="ve-pg" onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
                    <button className="ve-pg" onClick={() => setCurrentPage(totalPages)} disabled={currentPage===totalPages}>»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}