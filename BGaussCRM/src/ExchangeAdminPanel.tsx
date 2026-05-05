// ═══════════════════════════════════════════════════════════════
// FILE: src/ExchangeAdminPanel.tsx
// BGauss Exchange — Module 2: Admin Approval Panel (A01–A11)
//
// ── FIXES APPLIED ────────────────────────────────────────────
//   1. All TypeScript interfaces changed to camelCase to match
//      ASP.NET Core's default JSON camelCase serialization.
//   2. (selectedCase.scoresByCategory ?? []).map(...)
//   3. (selectedCase.adminActions     ?? []).length
//   4. (selectedCase.adminActions     ?? []).map(...)
//   5. (selectedCase.images           ?? []).find(...)
//   6. Added key={c.id} on <tr> rows.
//   7. [MOBILE FIX] Added sidebarOpen state + mobile topbar JSX
//      with hamburger button + overlay so the nav is reachable
//      on narrow viewports (was CSS-only, never rendered).
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ExchangeAdminPanel.css";
import logo from "./assets/logo.jpg";

// ── Types ─────────────────────────────────────────────────────
type AdminScreen =
  | "A01" | "A02" | "A03" | "A04"
  | "A05" | "A06" | "A07" | "A08"
  | "A09" | "A10" | "A11";

interface DashStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  imagesPending: number;
  thisWeek: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  caseId: number;
  caseNumber: string;
  action: string;
  adminUser: string;
  actionAt: string;
  priceSet?: number;
}

interface QueueItem {
  id: number;
  caseNumber: string;
  customerName: string;
  mobileNumber: string;
  city: string;
  vehicleModel: string;
  registrationNo: string;
  yearOfPurchase: number;
  kmDriven: number;
  grade: string;
  totalScore: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  status: string;
  dealerId: string;
  submittedAt: string;
  imageCount: number;
}

interface CaseDetail extends QueueItem {
  adminNote?: string;
  approvedPrice?: number;
  adminActionAt?: string;
  scoresByCategory: {
    category: string;
    parameters: { parameter: string; score: number }[];
    average: number;
  }[];
  images: { imageType: string; imagePath: string; uploadedAt: string }[];
  adminActions: {
    action: string;
    adminUser: string;
    actionAt: string;
    priceSet?: number;
    note?: string;
  }[];
}

interface NotifItem {
  id: number;
  caseId: number;
  caseNumber: string;
  dealerId: string;
  actionType: string;
  message: string;
  sentAt: string;
  isRead: boolean;
}

// ── Config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Draft:              { label: "Draft",          color: "#64748b", bg: "#f1f5f9" },
  ImagesPending:      { label: "Images Pending", color: "#7c3aed", bg: "#ede9fe" },
  PendingAdminReview: { label: "Pending Review", color: "#d97706", bg: "#fef3c7" },
  AdminApproved:      { label: "Approved",       color: "#16a34a", bg: "#dcfce7" },
  AdminModified:      { label: "Modified",       color: "#2563eb", bg: "#dbeafe" },
  AdminRejected:      { label: "Rejected",       color: "#dc2626", bg: "#fee2e2" },
};

const IMAGE_TYPES = ["Front", "Rear", "Left", "Right", "Odometer", "Battery"] as const;

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

const resolveImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath || imagePath.trim() === "") return null;

  // 1. Normalize separators
  let path = imagePath.replace(/\\/g, "/");

  // 2. Strip ALL leading slashes then add exactly one
  path = "/" + path.replace(/^\/+/, "");

  // 3. Prepend API origin if path doesn't already have it
  //    (handles both same-origin and cross-origin deployments)
  if (API_ORIGIN && !path.startsWith(API_ORIGIN)) {
    return `${API_ORIGIN}${path}`;
  }

  return path;
};

const GRADE_COLOR: Record<string, string> = {
  Excellent: "#16a34a",
  Good:      "#d97706",
  Average:   "#dc2626",
};

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n?: number | null) =>
  n != null ? `₹ ${n.toLocaleString("en-IN")}` : "—";

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── StatusBadge ───────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="eap-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

// ── ScoreBar ──────────────────────────────────────────────────
const ScoreBar = ({ score }: { score: number }) => {
  const color = score >= 8 ? "#16a34a" : score >= 5 ? "#d97706" : "#dc2626";
  return (
    <div className="eap-score-bar-wrap">
      <div className="eap-score-bar" style={{ width: `${score * 10}%`, background: color }} />
      <span style={{ color, fontWeight: 800, fontSize: 12 }}>{score}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ExchangeAdminPanel() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") ?? "Admin";
  const role     = localStorage.getItem("role")     ?? "";

  // ── A01: Auth guard — admin only ───────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || role !== "admin") navigate("/dashboard", { replace: true });
  }, [navigate, role]);

  // ── Screen state ───────────────────────────────────────────
  const [screen, setScreen] = useState<AdminScreen>("A02");

  // ── [MOBILE FIX] Sidebar open/close for hamburger drawer ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Data state ─────────────────────────────────────────────
  const [stats,        setStats]        = useState<DashStats | null>(null);
  const [queue,        setQueue]        = useState<QueueItem[]>([]);
  const [queueTotal,   setQueueTotal]   = useState(0);
  const [queueStatus,  setQueueStatus]  = useState("PendingAdminReview");
  const [queueSearch,  setQueueSearch]  = useState("");
  const [queuePage,    setQueuePage]    = useState(1);
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [lightboxImg,  setLightboxImg]  = useState<string | null>(null);
  const [notifs,       setNotifs]       = useState<NotifItem[]>([]);
  const [notifTotal,   setNotifTotal]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // ── Decision state (A06–A09) ───────────────────────────────
  const [decisionMode,   setDecisionMode]   = useState<"" | "Approved" | "Modified" | "Rejected">("");
  const [modPrice,       setModPrice]       = useState("");
  const [decisionNote,   setDecisionNote]   = useState("");
  const [decisionErr,    setDecisionErr]    = useState("");
  const [decisionResult, setDecisionResult] = useState<{
    status: string; approvedPrice?: number; message: string;
  } | null>(null);

  const initials = username.slice(0, 2).toUpperCase();

  // ── Navigation helper ──────────────────────────────────────
  const goTo = (s: AdminScreen) => {
    setError("");
    setScreen(s);
    setSidebarOpen(false); // close drawer on any navigation
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Fetchers ───────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const r = await axios.get<DashStats>("/api/ExchangeAdmin/dashboard-stats");
      setStats(r.data);
    } catch {
      setError("Failed to load dashboard stats");
    }
  }, []);

  const fetchQueue = useCallback(async (
    status = queueStatus,
    search = queueSearch,
    page   = queuePage,
  ) => {
    setLoading(true);
    try {
      const r = await axios.get("/api/ExchangeAdmin/queue", {
        params: {
          status:   status || undefined,
          search:   search || undefined,
          page,
          pageSize: 15,
        },
      });
      setQueue(r.data.items);
      setQueueTotal(r.data.total);
    } catch {
      setError("Failed to load case queue");
    } finally {
      setLoading(false);
    }
  }, [queueStatus, queueSearch, queuePage]);

  const fetchCaseDetail = useCallback(async (id: number) => {
    if (!id) {
      setError("Invalid case ID");
      return;
    }
    setLoading(true);
    try {
      const r = await axios.get<CaseDetail>(`/api/ExchangeAdmin/cases/${id}`);
      setSelectedCase(r.data);
      setDecisionMode("");
      setModPrice("");
      setDecisionNote("");
      setDecisionErr("");
      setDecisionResult(null);
      goTo("A04");
    } catch {
      setError("Failed to load case details");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const r = await axios.get("/api/ExchangeAdmin/notifications", {
        params: { page, pageSize: 30 },
      });
      setNotifs(r.data.items);
      setNotifTotal(r.data.total);
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-fetch on screen / filter change ───────────────────
  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (screen === "A03") fetchQueue(queueStatus, queueSearch, queuePage);
  }, [screen, queueStatus, queueSearch, queuePage, fetchQueue]);

  useEffect(() => {
    if (screen === "A11") fetchNotifs();
  }, [screen, fetchNotifs]);

  // ── Decision submit (A07 / A08 / A09) → A10 ───────────────
  const handleDecision = async () => {
    if (!selectedCase) return;
    setDecisionErr("");

    if (decisionMode === "Modified") {
      const p = parseFloat(modPrice);
      if (!modPrice || isNaN(p)) {
        setDecisionErr("Enter a valid price."); return;
      }
      if (p < selectedCase.minPrice || p > selectedCase.maxPrice) {
        setDecisionErr(
          `Price must be between ${fmt(selectedCase.minPrice)} and ${fmt(selectedCase.maxPrice)}`
        ); return;
      }
      if (!decisionNote.trim()) {
        setDecisionErr("Reason for modification is required."); return;
      }
    }

    if (decisionMode === "Rejected" && !decisionNote.trim()) {
      setDecisionErr("Rejection reason is mandatory."); return;
    }

    setLoading(true);
    try {
      const r = await axios.post(
        `/api/ExchangeAdmin/cases/${selectedCase.id}/decide`,
        {
          action: decisionMode,
          price:  decisionMode === "Modified" ? parseFloat(modPrice) : undefined,
          note:   decisionNote || undefined,
        }
      );
      setDecisionResult(r.data);

      const updated = await axios.get<CaseDetail>(
        `/api/ExchangeAdmin/cases/${selectedCase.id}`
      );
      setSelectedCase(updated.data);

      goTo("A10");
      fetchStats();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setDecisionErr(
          (e.response?.data as { error?: string })?.error
          ?? "Decision failed. Please try again."
        );
      } else {
        setDecisionErr("Unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="eap-shell">

      {/* ── [MOBILE FIX] TOP BAR — visible only on mobile (CSS: display:none on desktop) ── */}
      <header className="eap-topbar">
        <button
          className={`eap-hamburger ${sidebarOpen ? "open" : ""}`}
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="eap-topbar-brand">
          <img src={logo} alt="BGauss" className="eap-topbar-logo" />
          <div>
            <div className="eap-topbar-title">BGauss</div>
            <div className="eap-topbar-sub">Admin Panel</div>
          </div>
        </div>
      </header>

      {/* ── [MOBILE FIX] Sidebar overlay — closes drawer when tapped ── */}
      {sidebarOpen && (
        <div
          className="eap-sidebar-overlay visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`eap-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="eap-sidebar-brand">
          <img src={logo} alt="BGauss" className="eap-sidebar-logo" />
          <div>
            <div className="eap-sidebar-title">BGauss</div>
            <div className="eap-sidebar-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="eap-sidebar-nav">
          <button
            className={`eap-nav-item ${screen === "A02" ? "active" : ""}`}
            onClick={() => goTo("A02")}
          >
            <span className="eap-nav-icon">⊞</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`eap-nav-item ${
              ["A03","A04","A05","A06","A07","A08","A09"].includes(screen) ? "active" : ""
            }`}
            onClick={() => {
              setQueueStatus("PendingAdminReview");
              setQueuePage(1);
              goTo("A03");
            }}
          >
            <span className="eap-nav-icon">☰</span>
            <span>Case Queue</span>
          </button>

          <button
            className={`eap-nav-item ${screen === "A11" ? "active" : ""}`}
            onClick={() => goTo("A11")}
          >
            <span className="eap-nav-icon">🔔</span>
            <span>Notifications</span>
          </button>

          <button
            className="eap-nav-item"
            onClick={() => navigate("/exchange")}
            style={{ marginTop: "auto" }}
          >
            <span className="eap-nav-icon">↩</span>
            <span>Dealer Portal</span>
          </button>
        </nav>

        <div className="eap-sidebar-footer">
          <div className="eap-sidebar-user">
            <div className="eap-sidebar-avatar">{initials}</div>
            <div>
              <div className="eap-sidebar-uname">{username}</div>
              <div className="eap-sidebar-urole">Administrator</div>
            </div>
          </div>
          <button
            className="eap-sidebar-logout"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/", { replace: true });
            }}
          >
            ⎋ Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main className="eap-main">

        {/* Global error banner */}
        {error && (
          <div className="eap-global-error">
            ⚠ {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A02 — ADMIN DASHBOARD
        ════════════════════════════════════════════════ */}
        {screen === "A02" && (
          <div className="eap-screen eap-a02">
            <div className="eap-page-header">
              <div>
                <h1>Exchange Dashboard</h1>
                <p>Overview of all exchange cases and admin activity</p>
              </div>
              <button
                className="eap-btn-primary"
                onClick={() => {
                  setQueueStatus("PendingAdminReview");
                  setQueuePage(1);
                  goTo("A03");
                }}
              >
                View Pending Queue →
              </button>
            </div>

            {stats ? (
              <>
                <div className="eap-stat-grid">
                  {[
                    {
                      label: "Total Cases",
                      val: stats.total,
                      color: "#0f172a",
                      icon: "📋",
                      queueStatus: "",           // show all
                    },
                    {
                      label: "Pending Review",
                      val: stats.pending,
                      color: "#d97706",
                      icon: "⏳",
                      queueStatus: "PendingAdminReview",
                    },
                    {
                      label: "Images Pending",
                      val: stats.imagesPending ?? 0,
                      color: "#7c3aed",
                      icon: "📷",
                      queueStatus: "ImagesPending",
                    },
                    {
                      label: "Approved",
                      val: stats.approved,
                      color: "#16a34a",
                      icon: "✅",
                      queueStatus: "AdminApproved",
                    },
                    {
                      label: "Rejected",
                      val: stats.rejected,
                      color: "#dc2626",
                      icon: "✗",
                      queueStatus: "AdminRejected",
                    },
                    {
                      label: "Draft",
                      val: stats.draft,
                      color: "#64748b",
                      icon: "📝",
                      queueStatus: "Draft",
                    },
                    {
                      label: "This Week",
                      val: stats.thisWeek,
                      color: "#7c3aed",
                      icon: "📅",
                      queueStatus: "",           // show all, see all recent
                    },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="eap-stat-card clickable"
                      style={{ borderTopColor: s.color }}
                      onClick={() => {
                        setQueueStatus(s.queueStatus);
                        setQueuePage(1);
                        setQueueSearch("");
                        goTo("A03");
                      }}
                    >
                      <div className="eap-stat-icon">{s.icon}</div>
                      <div className="eap-stat-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="eap-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="eap-activity-card">
                  <h3>Recent Activity</h3>
                  {(stats.recentActivity ?? []).length === 0 ? (
                    <p className="eap-empty">No recent activity</p>
                  ) : (
                    <div className="eap-activity-list">
                      {(stats.recentActivity ?? []).map((a, i) => (
                        <div
                          key={i}
                          className="eap-activity-row"
                          onClick={() => fetchCaseDetail(a.caseId)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className={`eap-activity-dot dot-${a.action.toLowerCase()}`} />
                          <div className="eap-activity-info">
                            <span className="eap-activity-case">{a.caseNumber}</span>
                            <span className={`eap-activity-action action-${a.action.toLowerCase()}`}>
                              {a.action}
                            </span>
                            {a.priceSet && (
                              <span className="eap-activity-price">{fmt(a.priceSet)}</span>
                            )}
                          </div>
                          <div className="eap-activity-meta">
                            <span>{a.adminUser}</span>
                            <span>{timeAgo(a.actionAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="eap-loading">Loading dashboard…</div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A03 — CASE QUEUE
        ════════════════════════════════════════════════ */}
        {screen === "A03" && (
          <div className="eap-screen eap-a03">
            <div className="eap-page-header">
              <div>
                <h1>Case Queue</h1>
                <p>
                  {queueTotal} case{queueTotal !== 1 ? "s" : ""} ·{" "}
                  {STATUS_CONFIG[queueStatus]?.label ?? "All"}
                </p>
              </div>
            </div>

            <div className="eap-queue-filters">
              <div className="eap-queue-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  placeholder="Search case, dealer, vehicle…"
                  value={queueSearch}
                  onChange={e => { setQueueSearch(e.target.value); setQueuePage(1); }}
                />
                {queueSearch && (
                  <button onClick={() => { setQueueSearch(""); setQueuePage(1); }}>✕</button>
                )}
              </div>

              <div className="eap-status-tabs">
                {[
                  { v: "PendingAdminReview", l: "Pending"        },
                  { v: "ImagesPending",      l: "Images Pending" },
                  { v: "AdminApproved",      l: "Approved"       },
                  { v: "AdminModified",      l: "Modified"       },
                  { v: "AdminRejected",      l: "Rejected"       },
                  { v: "Draft",              l: "Draft"          },
                  { v: "",                   l: "All"            },
                ].map(t => (
                  <button
                    key={t.v || "all"}
                    className={`eap-stab ${queueStatus === t.v ? "active" : ""}`}
                    onClick={() => { setQueueStatus(t.v); setQueuePage(1); }}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="eap-loading">Loading…</div>
            ) : (
              <>
                <div className="eap-table-wrap">
                  <table className="eap-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>Case #</th>
                        <th style={{ textAlign: "center" }}>Customer</th>
                        <th style={{ textAlign: "center" }}>Vehicle</th>
                        <th style={{ textAlign: "center" }}>Grade</th>
                        <th style={{ textAlign: "center" }}>Score</th>
                        <th style={{ textAlign: "center" }}>Price Band</th>
                        <th style={{ textAlign: "center" }}>Dealer</th>
                        <th style={{ textAlign: "center" }}>Submitted</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.length === 0 && (
                        <tr><td colSpan={10} className="eap-empty">No cases found</td></tr>
                      )}
                      {queue.map(c => (
                        <tr
                          key={c.id}
                          className="eap-table-row"
                          onClick={() => fetchCaseDetail(c.id)}
                        >
                          <td><span className="eap-case-num">{c.caseNumber}</span></td>
                          <td>
                            <div className="eap-customer-cell">
                              <strong>{c.customerName}</strong>
                              <span>{c.city}</span>
                            </div>
                          </td>
                          <td>
                            <div className="eap-vehicle-cell">
                              <strong>{c.vehicleModel}</strong>
                              <span>{c.registrationNo}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="eap-grade-badge"
                              style={{
                                color:      GRADE_COLOR[c.grade] ?? "#64748b",
                                background: (GRADE_COLOR[c.grade] ?? "#64748b") + "18",
                              }}
                            >
                              {c.grade}
                            </span>
                          </td>
                          <td><strong>{c.totalScore?.toFixed(1)}</strong></td>
                          <td>
                            <div className="eap-price-cell">
                              <span className="eap-price-rec">{fmt(c.recommendedPrice)}</span>
                              <span className="eap-price-band">
                                {fmt(c.minPrice)} – {fmt(c.maxPrice)}
                              </span>
                            </div>
                          </td>
                          <td><span className="eap-dealer-id">{c.dealerId}</span></td>
                          <td>
                            <span className="eap-time">
                              {c.submittedAt ? timeAgo(c.submittedAt) : "—"}
                            </span>
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td><button className="eap-btn-review">Review →</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {queueTotal > 15 && (
                  <div className="eap-pagination">
                    <button
                      disabled={queuePage === 1}
                      onClick={() => setQueuePage(p => p - 1)}
                    >← Prev</button>
                    <span>Page {queuePage} of {Math.ceil(queueTotal / 15)}</span>
                    <button
                      disabled={queuePage >= Math.ceil(queueTotal / 15)}
                      onClick={() => setQueuePage(p => p + 1)}
                    >Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A04 — CASE DETAIL VIEW
        ════════════════════════════════════════════════ */}
        {screen === "A04" && selectedCase && (
          <div className="eap-screen eap-a04">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A03")}>
                  ← Case Queue
                </button>
                <h1>{selectedCase.caseNumber}</h1>
                <p>Case Detail Review</p>
              </div>
              <div className="eap-header-actions">
                <StatusBadge status={selectedCase.status} />
                {selectedCase.status === "PendingAdminReview" && (
                  <button className="eap-btn-primary" onClick={() => goTo("A05")}>
                    Review Images →
                  </button>
                )}
              </div>
            </div>

            <div className="eap-detail-grid">
              <div className="eap-detail-card">
                <h4>👤 Customer Information</h4>
                <div className="eap-detail-rows">
                  <div><span>Name</span>     <strong>{selectedCase.customerName}</strong></div>
                  <div><span>Mobile</span>   <strong>{selectedCase.mobileNumber}</strong></div>
                  <div><span>City</span>     <strong>{selectedCase.city}</strong></div>
                  <div><span>Dealer ID</span><strong>{selectedCase.dealerId}</strong></div>
                </div>
              </div>

              <div className="eap-detail-card">
                <h4>🛵 Vehicle Details</h4>
                <div className="eap-detail-rows">
                  <div><span>Model</span>    <strong>{selectedCase.vehicleModel}</strong></div>
                  <div><span>Reg. No.</span> <strong>{selectedCase.registrationNo}</strong></div>
                  <div><span>Year</span>     <strong>{selectedCase.yearOfPurchase}</strong></div>
                  <div>
                    <span>KM Driven</span>
                    <strong>{selectedCase.kmDriven?.toLocaleString("en-IN")} km</strong>
                  </div>
                </div>
              </div>

              <div className="eap-detail-card eap-card-full">
                <h4>🔍 Inspection Scores</h4>
                <div className="eap-scores-grid">
                  {(selectedCase.scoresByCategory ?? []).map(cat => (
                    <div key={cat.category} className="eap-score-cat">
                      <div className="eap-score-cat-header">
                        <span>{cat.category}</span>
                        <span
                          className="eap-score-avg"
                          style={{
                            color: cat.average >= 8 ? "#16a34a"
                                 : cat.average >= 5 ? "#d97706"
                                 : "#dc2626"
                          }}
                        >
                          Avg: {cat.average.toFixed(1)}
                        </span>
                      </div>
                      {(cat.parameters ?? []).map(p => (
                        <div key={p.parameter} className="eap-score-param">
                          <span>{p.parameter}</span>
                          <ScoreBar score={p.score} />
                        </div>
                      ))}
                    </div>
                  ))}
                  {(selectedCase.scoresByCategory ?? []).length === 0 && (
                    <p className="eap-empty" style={{ gridColumn: "1/-1" }}>
                      No inspection scores recorded yet.
                    </p>
                  )}
                </div>
                <div className="eap-grade-summary">
                  <div>
                    <span>Overall Score</span>
                    <strong>{selectedCase.totalScore?.toFixed(1) ?? "—"} / 10</strong>
                  </div>
                  <div>
                    <span>Grade</span>
                    <strong style={{ color: GRADE_COLOR[selectedCase.grade] ?? "#64748b" }}>
                      {selectedCase.grade ?? "—"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="eap-detail-card eap-card-full eap-price-detail-card">
                <h4>💰 System Price Range</h4>
                <div className="eap-price-detail-grid">
                  <div><span>Min Price</span>  <strong>{fmt(selectedCase.minPrice)}</strong></div>
                  <div className="highlight">
                    <span>Recommended</span>
                    <strong>{fmt(selectedCase.recommendedPrice)}</strong>
                  </div>
                  <div><span>Max Price</span>  <strong>{fmt(selectedCase.maxPrice)}</strong></div>
                  {selectedCase.approvedPrice != null && (
                    <div className="approved">
                      <span>Final Approved</span>
                      <strong>{fmt(selectedCase.approvedPrice)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {(selectedCase.adminActions ?? []).length > 0 && (
                <div className="eap-detail-card eap-card-full">
                  <h4>📋 Admin Action History</h4>
                  <div className="eap-action-history">
                    {(selectedCase.adminActions ?? []).map((a, i) => (
                      <div key={i} className={`eap-action-row action-${a.action.toLowerCase()}`}>
                        <div className="eap-action-dot" />
                        <div className="eap-action-body">
                          <span className="eap-action-type">{a.action}</span>
                          <span className="eap-action-admin">by {a.adminUser}</span>
                          {a.priceSet != null && (
                            <span className="eap-action-price">{fmt(a.priceSet)}</span>
                          )}
                          {a.note && (
                            <p className="eap-action-note">"{a.note}"</p>
                          )}
                        </div>
                        <span className="eap-action-time">{timeAgo(a.actionAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedCase.status === "PendingAdminReview" && (
              <div className="eap-sticky-action">
                <button className="eap-btn-secondary" onClick={() => goTo("A05")}>
                  📷 Review Images
                </button>
                <button className="eap-btn-primary" onClick={() => goTo("A06")}>
                  Make Decision →
                </button>
              </div>
            )}
          </div>
        )}

       {/* ════════════════════════════════════════════════
            A05 — IMAGE REVIEW SCREEN
        ════════════════════════════════════════════════ */}
        {screen === "A05" && selectedCase && (
          <div className="eap-screen eap-a05">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A04")}>
                  ← Case Detail
                </button>
                <h1>Image Review</h1>
                <p>{selectedCase.caseNumber} · {selectedCase.vehicleModel}</p>
              </div>
              {selectedCase.status === "PendingAdminReview" && (
                <button className="eap-btn-primary" onClick={() => goTo("A06")}>
                  Proceed to Decision →
                </button>
              )}
            </div>

            <div className="eap-img-grid">
              {IMAGE_TYPES.map(type => {
                const img = (selectedCase.images ?? []).find(
                  i => i.imageType.toLowerCase() === type.toLowerCase()
                );

                // ── Use the robust resolver ───────────────────────────────────
                const src = resolveImageUrl(img?.imagePath);

                return (
                  <div
                    key={type}
                    className={`eap-img-cell ${src ? "has-image" : "missing"}`}
                    onClick={() => src && setLightboxImg(src)}
                  >
                    {src ? (
                      <>
                        <img
                          src={src}
                          alt={`${type} view`}
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.opacity = "0.2";
                            // Show the failed URL in console for debugging
                            console.warn(`[ExchangeImages] 404: ${target.src}`);
                            // Optionally swap to a placeholder:
                            // target.src = "/assets/no-image.png";
                          }}
                        />
                        <div className="eap-img-overlay"><span>🔍 Enlarge</span></div>
                      </>
                    ) : (
                      <div className="eap-img-missing">
                        <span>⚠</span>
                        <p>Not uploaded</p>
                      </div>
                    )}
                    <div className={`eap-img-label ${src ? "" : "missing"}`}>
                      {type} View {src ? "✓" : "✗"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="eap-img-note">
              <span>ℹ</span>
              <p>
                Verify each image matches the declared vehicle condition and inspection scores.
                Click any image to zoom.
              </p>
            </div>

            {selectedCase.status === "PendingAdminReview" && (
              <div className="eap-sticky-action">
                <button className="eap-btn-ghost" onClick={() => goTo("A04")}>
                  ← Back to Details
                </button>
                <button className="eap-btn-primary" onClick={() => goTo("A06")}>
                  Images Verified — Make Decision →
                </button>
              </div>
            )}

            {lightboxImg && (
              <div className="eap-lightbox" onClick={() => setLightboxImg(null)}>
                <button
                  className="eap-lightbox-close"
                  onClick={() => setLightboxImg(null)}
                >✕</button>
                <img
                  src={lightboxImg}
                  alt="Vehicle"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A06 — PRICE REVIEW & DECISION POINT
        ════════════════════════════════════════════════ */}
        {screen === "A06" && selectedCase && (
          <div className="eap-screen eap-a06">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A05")}>
                  ← Image Review
                </button>
                <h1>Price Review & Decision</h1>
                <p>{selectedCase.caseNumber} · {selectedCase.customerName}</p>
              </div>
            </div>

            <div className="eap-price-review-card">
              <div className="eap-price-review-header">
                <h3>System-Generated Price Range</h3>
                <div
                  className="eap-grade-pill"
                  style={{
                    color:      GRADE_COLOR[selectedCase.grade],
                    background: GRADE_COLOR[selectedCase.grade] + "18",
                  }}
                >
                  {selectedCase.grade} · {selectedCase.totalScore?.toFixed(1)}/10
                </div>
              </div>
              <div className="eap-price-band-display">
                <div className="eap-pbd-item">
                  <span>Min</span><strong>{fmt(selectedCase.minPrice)}</strong>
                </div>
                <div className="eap-pbd-track">
                  <div className="eap-pbd-fill" />
                  <div className="eap-pbd-dot" title="Recommended" />
                </div>
                <div className="eap-pbd-item">
                  <span>Max</span><strong>{fmt(selectedCase.maxPrice)}</strong>
                </div>
              </div>
              <div className="eap-pbd-rec">
                Recommended: <strong>{fmt(selectedCase.recommendedPrice)}</strong>
              </div>
            </div>

            <h3 className="eap-decision-heading">Select Decision</h3>
            <div className="eap-decision-btns">
              <button
                className={`eap-decision-btn approve ${decisionMode === "Approved" ? "selected" : ""}`}
                onClick={() => {
                  setDecisionMode("Approved");
                  setDecisionNote(""); setModPrice(""); setDecisionErr("");
                  goTo("A07");
                }}
              >
                <span className="eap-db-icon">✅</span>
                <span className="eap-db-label">Approve</span>
                <span className="eap-db-desc">Approve system price as-is</span>
              </button>

              <button
                className={`eap-decision-btn modify ${decisionMode === "Modified" ? "selected" : ""}`}
                onClick={() => {
                  setDecisionMode("Modified");
                  setDecisionNote(""); setModPrice(""); setDecisionErr("");
                  goTo("A08");
                }}
              >
                <span className="eap-db-icon">✏️</span>
                <span className="eap-db-label">Modify</span>
                <span className="eap-db-desc">Enter revised price within band</span>
              </button>

              <button
                className={`eap-decision-btn reject ${decisionMode === "Rejected" ? "selected" : ""}`}
                onClick={() => {
                  setDecisionMode("Rejected");
                  setDecisionNote(""); setModPrice(""); setDecisionErr("");
                  goTo("A09");
                }}
              >
                <span className="eap-db-icon">✗</span>
                <span className="eap-db-label">Reject</span>
                <span className="eap-db-desc">Reject with mandatory reason</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A07 — CONFIRM APPROVAL
        ════════════════════════════════════════════════ */}
        {screen === "A07" && selectedCase && (
          <div className="eap-screen eap-a07">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A06")}>
                  ← Back to Decision
                </button>
                <h1>Confirm Approval</h1>
                <p>Approving system price as-is for {selectedCase.caseNumber}</p>
              </div>
            </div>

            <div className="eap-confirm-card approve-card">
              <span className="eap-confirm-icon">✅</span>
              <h2>Approve System Price</h2>
              <div className="eap-confirm-price">{fmt(selectedCase.recommendedPrice)}</div>
              <p>
                The recommended price will be communicated to the dealer.
                This action cannot be undone.
              </p>

              {decisionErr && <div className="eap-decision-err">{decisionErr}</div>}

              <div className="eap-confirm-actions">
                <button className="eap-btn-ghost" onClick={() => goTo("A06")}>
                  ← Change Decision
                </button>
                <button
                  className="eap-btn-approve"
                  onClick={handleDecision}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="eap-spinner" /> Approving…</>
                    : "✅ Confirm Approval"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A08 — PRICE MODIFICATION
        ════════════════════════════════════════════════ */}
        {screen === "A08" && selectedCase && (
          <div className="eap-screen eap-a08">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A06")}>
                  ← Back to Decision
                </button>
                <h1>Modify Price</h1>
                <p>Enter revised price within the allowed band</p>
              </div>
            </div>

            <div className="eap-confirm-card modify-card">
              <span className="eap-confirm-icon">✏️</span>
              <h2>Price Modification</h2>

              <div className="eap-band-reminder">
                <span>Allowed Band:</span>
                <strong>{fmt(selectedCase.minPrice)} — {fmt(selectedCase.maxPrice)}</strong>
              </div>

              <div className="eap-mod-field">
                <label>Revised Price (₹) <span className="req">*</span></label>
                <div className="eap-price-input-wrap">
                  <span className="eap-currency">₹</span>
                  <input
                    type="number"
                    placeholder={selectedCase.recommendedPrice?.toString()}
                    value={modPrice}
                    min={selectedCase.minPrice}
                    max={selectedCase.maxPrice}
                    onChange={e => setModPrice(e.target.value)}
                    className={decisionErr && !modPrice ? "error" : ""}
                  />
                </div>
                <p className="eap-field-hint">
                  Must be between {fmt(selectedCase.minPrice)} and {fmt(selectedCase.maxPrice)}
                </p>
              </div>

              <div className="eap-mod-field">
                <label>Reason for Modification <span className="req">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Explain why the price was modified…"
                  value={decisionNote}
                  onChange={e => setDecisionNote(e.target.value)}
                  className={decisionErr && !decisionNote ? "error" : ""}
                />
              </div>

              {decisionErr && <div className="eap-decision-err">{decisionErr}</div>}

              <div className="eap-confirm-actions">
                <button className="eap-btn-ghost" onClick={() => goTo("A06")}>
                  ← Change Decision
                </button>
                <button
                  className="eap-btn-modify"
                  onClick={handleDecision}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="eap-spinner" /> Submitting…</>
                    : "✏️ Confirm Modification"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A09 — REJECTION SCREEN
        ════════════════════════════════════════════════ */}
        {screen === "A09" && selectedCase && (
          <div className="eap-screen eap-a09">
            <div className="eap-page-header">
              <div>
                <button className="eap-breadcrumb" onClick={() => goTo("A06")}>
                  ← Back to Decision
                </button>
                <h1>Reject Case</h1>
                <p>Rejection reason is mandatory</p>
              </div>
            </div>

            <div className="eap-confirm-card reject-card">
              <span className="eap-confirm-icon reject-icon">✗</span>
              <h2>Reject This Case</h2>
              <p>
                The dealer will be notified with the rejection reason and may
                re-inspect and resubmit.
              </p>

              <div className="eap-mod-field">
                <label>Rejection Reason <span className="req">*</span></label>
                <textarea
                  rows={4}
                  placeholder="Provide a clear reason for rejection (mandatory)…"
                  value={decisionNote}
                  onChange={e => setDecisionNote(e.target.value)}
                  className={decisionErr && !decisionNote ? "error" : ""}
                />
                <p className="eap-field-hint">
                  This message will be sent directly to the dealer.
                </p>
              </div>

              {decisionErr && <div className="eap-decision-err">{decisionErr}</div>}

              <div className="eap-confirm-actions">
                <button className="eap-btn-ghost" onClick={() => goTo("A06")}>
                  ← Change Decision
                </button>
                <button
                  className="eap-btn-reject"
                  onClick={handleDecision}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="eap-spinner" /> Rejecting…</>
                    : "✗ Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A10 — DECISION CONFIRMATION
        ════════════════════════════════════════════════ */}
        {screen === "A10" && selectedCase && decisionResult && (
          <div className="eap-screen eap-a10">
            <div className="eap-a10-card">
              <div className={`eap-a10-icon ${
                decisionResult.status === "AdminRejected" ? "reject" : "approve"
              }`}>
                {decisionResult.status === "AdminApproved" ? "✅"
                  : decisionResult.status === "AdminModified" ? "✏️"
                  : "✗"}
              </div>
              <h1>Decision Recorded</h1>

              <div className="eap-a10-info">
                <div>
                  <span>Case ID</span>
                  <strong>{selectedCase.caseNumber}</strong>
                </div>
                <div>
                  <span>Decision</span>
                  <strong className={`decision-${decisionResult.status.toLowerCase()}`}>
                    {decisionResult.status.replace("Admin", "")}
                  </strong>
                </div>
                {decisionResult.approvedPrice != null && (
                  <div>
                    <span>Final Price</span>
                    <strong className="price">{fmt(decisionResult.approvedPrice)}</strong>
                  </div>
                )}
                <div>
                  <span>Admin</span>
                  <strong>{username}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{new Date().toLocaleString()}</strong>
                </div>
              </div>

              <div className="eap-a10-message">
                <span>📨</span>
                <p>
                  <strong>Dealer notified:</strong> {decisionResult.message}
                </p>
              </div>

              <div className="eap-a10-actions">
                <button
                  className="eap-btn-ghost"
                  onClick={() => {
                    setDecisionResult(null);
                    setSelectedCase(null);
                    setQueueStatus("PendingAdminReview");
                    setQueuePage(1);
                    goTo("A03");
                  }}
                >
                  Back to Queue
                </button>
                <button
                  className="eap-btn-primary"
                  onClick={() => {
                    setDecisionResult(null);
                    setSelectedCase(null);
                    goTo("A02");
                    fetchStats();
                  }}
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            A11 — DEALER NOTIFICATION LOG
        ════════════════════════════════════════════════ */}
        {screen === "A11" && (
          <div className="eap-screen eap-a11">
            <div className="eap-page-header">
              <div>
                <h1>Dealer Notification Log</h1>
                <p>{notifTotal} notification{notifTotal !== 1 ? "s" : ""} sent</p>
              </div>
              <button className="eap-btn-ghost" onClick={() => fetchNotifs()}>
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div className="eap-loading">Loading…</div>
            ) : (
              <div className="eap-table-wrap">
                <table className="eap-table eap-notif-table">
                  <thead>
                    <tr>
                      <th>Case #</th>
                      <th>Dealer</th>
                      <th>Action</th>
                      <th>Message</th>
                      <th>Sent</th>
                      <th>Read</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="eap-empty">No notifications sent yet</td>
                      </tr>
                    )}
                    {notifs.map(n => (
                      <tr key={n.id} className={n.isRead ? "" : "eap-notif-unread"}>
                        <td>
                          <span
                            className="eap-case-num"
                            style={{ cursor: "pointer" }}
                            onClick={() => fetchCaseDetail(n.caseId)}
                          >
                            {n.caseNumber}
                          </span>
                        </td>
                        <td><span className="eap-dealer-id">{n.dealerId}</span></td>
                        <td>
                          <span className={`eap-notif-action action-${n.actionType.toLowerCase()}`}>
                            {n.actionType}
                          </span>
                        </td>
                        <td>
                          <span className="eap-notif-msg" title={n.message}>
                            {n.message}
                          </span>
                        </td>
                        <td><span className="eap-time">{timeAgo(n.sentAt)}</span></td>
                        <td>
                          <span className={`eap-read-badge ${n.isRead ? "read" : "unread"}`}>
                            {n.isRead ? "✓ Read" : "Unread"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
