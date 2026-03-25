import "./SalesPage.css";
import "./VehicleConfig.css";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";

const API = "/api/RoadPrice";
const PAGE_SIZE = 10;

/* ── TYPES ── */
interface City {
    id: number;
    cityName: string;
    stateName: string;
    isPopular: boolean;
}

interface Scooty {
    scootyId: number;
    modelName: string;
    variantName: string;
    colourName?: string;
}

interface RoadPriceItem {
    id: number;
    scootyId: number;
    modelName: string;
    variantName: string;
    colourName?: string;
    cityId: number;
    cityName: string;
    stateName: string;
    exShowroomPrice: number;
    rtoCharges: number;
    insuranceAmount: number;
    otherCharges: number;
    onRoadPrice: number;
    validFrom: string;
}

interface AllCityRow {
    cityId: number;
    cityName: string;
    stateName: string;
    onRoadPrice: number;
}

/* ── PAGINATION HELPER ── */
function buildPages(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (current > 3) pages.push("…");
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++)
        pages.push(p);
    if (current < total - 2) pages.push("…");
    pages.push(total);
    return pages;
}

export default function RoadPrice() {
    const [data, setData] = useState<RoadPriceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [scootyId, setScootyId] = useState("");
    const [cityId, setCityId] = useState("");
    const [citySearch, setCitySearch] = useState("");
    const [exShowroom, setExShowroom] = useState("");
    const [rto, setRto] = useState("");
    const [insurance, setInsurance] = useState("");
    const [other, setOther] = useState("");
    const [validFrom, setValidFrom] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);

    const [scooties, setScooties] = useState<Scooty[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

    const [allCitiesModal, setAllCitiesModal] = useState<{
        open: boolean;
        scootyId: number | null;
        scootyLabel: string;
        rows: AllCityRow[];
        loading: boolean;
    }>({
        open: false,
        scootyId: null,
        scootyLabel: "",
        rows: [],
        loading: false,
    });

    const [tableSearch, setTableSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [alert, setAlert] = useState<any>(null);

    const importRef = useRef<HTMLInputElement>(null);
    const citySearchRef = useRef<HTMLInputElement>(null);
    const cityDropdownRef = useRef<HTMLDivElement>(null);

    const username = localStorage.getItem("username") ?? "User";
    const initial = username.charAt(0).toUpperCase();
    const navigate = useNavigate();

    /* ── ALERT AUTO-DISMISS ── */
    useEffect(() => {
        if (!alert) return;
        const t = setTimeout(() => setAlert(null), 3500);
        return () => clearTimeout(t);
    }, [alert]);

    /* ── CLOSE CITY DROPDOWN ON OUTSIDE CLICK ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                cityDropdownRef.current &&
                !cityDropdownRef.current.contains(e.target as Node)
            ) {
                setCityDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ── FETCH ALL ROAD PRICES (for table) ── */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get<RoadPriceItem[]>(API);
            setData(res.data);
        } catch {
            setAlert({ type: "error", msg: "Failed to load data" });
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await axios.get(`${API}/cities`);
                setCities(res.data);
            } catch {
                setAlert({ type: "error", msg: "Failed to load cities." });
            }
        };
        fetchCities();
    }, []);

    useEffect(() => {
        const map = new Map();
        data.forEach((d) => {
            map.set(d.scootyId, {
                scootyId: d.scootyId,
                modelName: d.modelName,
                variantName: d.variantName,
                colourName: d.colourName,
            });
        });
        setScooties(Array.from(map.values()));
    }, [data]);

    /* ── RESET FORM ── */
    const resetForm = () => {
        setScootyId(""); setCityId(""); setCitySearch("");
        setExShowroom(""); setRto(""); setInsurance("");
        setOther(""); setValidFrom(""); setEditingId(null);
        setCityDropdownOpen(false);
    };

    /* ── COMPUTED ON-ROAD PRICE ── */
    const computedOnRoad = useMemo(() => {
        const ex = parseFloat(exShowroom) || 0;
        const r = parseFloat(rto) || 0;
        const ins = parseFloat(insurance) || 0;
        const oth = parseFloat(other) || 0;
        return ex + r + ins + oth;
    }, [exShowroom, rto, insurance, other]);

    /* ── SUBMIT (Upsert) ── */
    const handleSubmit = async () => {
        if (!scootyId || !cityId || !exShowroom) {
            setAlert({ type: "error", msg: "Scooty, City and Ex-Showroom Price are required." });
            return;
        }
        const payload = {
            scootyId: Number(scootyId),
            cityId: Number(cityId),
            exShowroomPrice: parseFloat(exShowroom),
            rtoCharges: parseFloat(rto) || 0,
            insuranceAmount: parseFloat(insurance) || 0,
            otherCharges: parseFloat(other) || 0,
            validFrom: validFrom || undefined,
        };
        try {
            await axios.post(`${API}/upsert`, payload);
            setAlert({ type: "success", msg: editingId ? "Road price updated successfully." : "Road price saved successfully." });
            resetForm();
            fetchData();
        } catch (err: any) {
            const msg = err?.response?.data;
            setAlert({ type: "error", msg: typeof msg === "string" ? msg : "Operation failed." });
        }
    };

    /* ── EDIT ── */
    const handleEdit = async (row: RoadPriceItem) => {
        try {
            let d = row;
            if (!row.exShowroomPrice) {
                const res = await axios.get<RoadPriceItem>(`${API}/${row.scootyId}/city/${row.cityId}`);
                d = res.data;
            }
            setEditingId(d.id);
            setScootyId(String(d.scootyId));
            setCityId(String(d.cityId));
            setCitySearch(`${d.cityName}, ${d.stateName}`);
            setExShowroom(String(d.exShowroomPrice));
            setRto(String(d.rtoCharges));
            setInsurance(String(d.insuranceAmount));
            setOther(String(d.otherCharges));
            setValidFrom(d.validFrom ? d.validFrom.slice(0, 10) : "");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
            setAlert({ type: "error", msg: "Failed to load road price details." });
        }
    };

    /* ── DELETE ── */
    const handleDelete = async (row: RoadPriceItem) => {
        if (!window.confirm(`Delete road price for ${row.modelName} in ${row.cityName}?`)) return;
        try {
            let id = row.id;
            if (!id || id === -1) {
                const res = await axios.get<RoadPriceItem>(`${API}/${row.scootyId}/city/${row.cityId}`);
                id = res.data.id;
            }
            await axios.delete(`${API}/${id}`);
            setAlert({ type: "success", msg: "Road price deleted successfully." });
            fetchData();
        } catch {
            setAlert({ type: "error", msg: "Delete failed." });
        }
    };

    /* ── ALL CITIES MODAL ── */
    const openAllCities = async (row: RoadPriceItem) => {
        setAllCitiesModal({
            open: true, scootyId: row.scootyId,
            scootyLabel: `${row.modelName} – ${row.variantName}${row.colourName ? ` (${row.colourName})` : ""}`,
            rows: [], loading: true,
        });
        try {
            const res = await axios.get<AllCityRow[]>(`${API}/${row.scootyId}/all-cities`);
            setAllCitiesModal((prev) => ({ ...prev, rows: res.data, loading: false }));
        } catch {
            setAllCitiesModal((prev) => ({ ...prev, loading: false }));
            setAlert({ type: "error", msg: "Failed to load city prices." });
        }
    };

    /* ── IMPORT EXCEL ── */
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const fd = new FormData();
        fd.append("file", f);
        try {
            const res = await axios.post<string>(`${API}/import`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            setAlert({ type: "success", msg: res.data });
            fetchData();
        } catch (err: any) {
            setAlert({ type: "error", msg: err?.response?.data || "Import failed." });
        }
        e.target.value = "";
    };

    /* ── DOWNLOAD TEMPLATE ── */
    const downloadTemplate = () => { window.open(`${API}/download-template`, "_blank"); };

    /* ── FILTER + PAGINATE TABLE ── */
    const filtered = useMemo(() => {
        const q = tableSearch.toLowerCase();
        return data.filter((d) =>
            d.modelName?.toLowerCase().includes(q) ||
            d.variantName?.toLowerCase().includes(q) ||
            d.cityName?.toLowerCase().includes(q) ||
            d.stateName?.toLowerCase().includes(q) ||
            String(d.onRoadPrice).includes(q)
        );
    }, [data, tableSearch]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

    const selectedCity = cities.find((c) => String(c.id) === cityId);

    /* ── UI ── */
    return (
        <div className="scr-page">
            {/* TOP BAR */}
            <div className="scr-topbar" />

            {/* ── NAVBAR ── */}
            <header className="rp-navbar">
                <div className="rp-navbar-left">
                    <img src={logo} className="pro-logo" />
                    <div className="pro-text">
                        <span className="pro-brand">BGauss Portal</span>
                        <span className="pro-page">Modules</span>
                    </div>
                </div>

                <div className="rp-navbar-right">
                    <div className="rp-navbar-user-pill">
                        <div className="rp-navbar-avatar">{initial}</div>
                        <div className="rp-navbar-user-info">
                            <span className="rp-navbar-user-name">{username}</span>
                            <span className="rp-navbar-user-role">Admin</span>
                        </div>
                    </div>

                    <button className="rp-navbar-circle-btn rp-circle-blue" title="Dashboard" onClick={() => navigate("/dashboard")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                    </button>

                    <button className="rp-navbar-circle-btn rp-circle-indigo" title="Home" onClick={() => navigate("/modules")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                            <path d="M9 21V12h6v9" />
                        </svg>
                    </button>

                    <button className="rp-navbar-circle-btn rp-circle-red" title="Logout" onClick={() => navigate("/login")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="scr-container">

                {/* ALERT */}
                {alert && (
                    <div className={`scr-alert ${alert.type === "success" ? "scr-alert-success" : "scr-alert-error"}`}>
                        <span>{alert.type === "success" ? "✓" : "✕"}</span>
                        {alert.msg}
                        <button className="scr-alert-close" onClick={() => setAlert(null)}>×</button>
                    </div>
                )}

                {/* ── BANNER ── */}
                <div className="scr-banner">
                    <div className="scr-banner-text">
                        <h1>Road Price Manager</h1>
                        <p>Manage on-road pricing across cities — ex-showroom, RTO, insurance &amp; other charges</p>
                    </div>
                </div>

                {/* ── TOP GRID: Left col (Form + Table) | Right col (Bulk) ── */}
                <div className="scr-top-grid">

                    {/* LEFT COLUMN — Form card + Table card stacked */}
                    <div className="scr-left-col">

                        {/* ── FORM CARD ── */}
                        <div className="scr-form-card">
                            <div className="scr-form-header">
                                <div className="scr-form-icon">
                                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeWidth="2.5" strokeLinecap="round" /></svg>
                                </div>
                                <h2>{editingId ? "Edit Road Price" : "Add / Update Road Price"}</h2>
                                <p>{editingId ? "Update the selected road price entry below" : "Fill in details to set the on-road price for a scooty in a city"}</p>
                            </div>

                            <div className="scr-form-body">
                                <div className="scr-row-2">
                                    <div className="scr-field">
                                        <label className="scr-label">Scooty</label>
                                        <div className="scr-select-wrap">
                                            <select className="scr-select" value={scootyId} onChange={(e) => setScootyId(e.target.value)}>
                                                <option value="">Select Scooty</option>
                                                {scooties.map((s) => (
                                                    <option key={s.scootyId} value={s.scootyId}>
                                                        {s.modelName} – {s.variantName}{s.colourName ? ` (${s.colourName})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="scr-field" style={{ position: "relative" }} ref={cityDropdownRef}>
                                        <label className="scr-label">City</label>
                                        <input
                                            ref={citySearchRef}
                                            type="text"
                                            className="scr-input"
                                            placeholder="Search city or state…"
                                            value={cityDropdownOpen ? citySearch : selectedCity ? `${selectedCity.cityName}, ${selectedCity.stateName}` : citySearch}
                                            onFocus={() => { setCityDropdownOpen(true); setCitySearch(""); }}
                                            onChange={(e) => { setCitySearch(e.target.value); setCityId(""); setCityDropdownOpen(true); }}
                                        />
                                        {cityDropdownOpen && cities.length > 0 && (
                                            <div className="rp-city-dropdown">
                                                {cities.map((c) => (
                                                    <div
                                                        key={c.id}
                                                        className={`rp-city-option${String(c.id) === cityId ? " selected" : ""}`}
                                                        onMouseDown={(e) => { e.preventDefault(); setCityId(String(c.id)); setCitySearch(`${c.cityName}, ${c.stateName}`); setCityDropdownOpen(false); }}
                                                    >
                                                        <span className="rp-city-name">{c.cityName}</span>
                                                        <span className="rp-city-state">{c.stateName}</span>
                                                        {c.isPopular && <span className="rp-city-popular">★ Popular</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="scr-row-4">
                                    <div className="scr-field">
                                        <label className="scr-label">Ex-Showroom (₹)</label>
                                        <input type="number" className="scr-input" placeholder="e.g. 89999" value={exShowroom} onChange={(e) => setExShowroom(e.target.value)} />
                                    </div>
                                    <div className="scr-field">
                                        <label className="scr-label">RTO Charges (₹)</label>
                                        <input type="number" className="scr-input" placeholder="e.g. 5000" value={rto} onChange={(e) => setRto(e.target.value)} />
                                    </div>
                                    <div className="scr-field">
                                        <label className="scr-label">Insurance (₹)</label>
                                        <input type="number" className="scr-input" placeholder="e.g. 3500" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
                                    </div>
                                    <div className="scr-field">
                                        <label className="scr-label">Other Charges (₹)</label>
                                        <input type="number" className="scr-input" placeholder="e.g. 1000" value={other} onChange={(e) => setOther(e.target.value)} />
                                    </div>
                                </div>

                                <div className="scr-row-bottom">
                                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flex: 1 }}>
                                        <div className="scr-field" style={{ flex: 1 }}>
                                            <label className="scr-label">Valid From</label>
                                            <input type="date" className="scr-input" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                                        </div>
                                        {computedOnRoad > 0 && (
                                            <div className="rp-onroad-preview">
                                                <span className="rp-onroad-label">On-Road</span>
                                                <span className="rp-onroad-value">₹ {computedOnRoad.toLocaleString("en-IN")}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="scr-form-btns">
                                        {editingId && <button className="scr-btn-cancel" onClick={resetForm}>Cancel</button>}
                                        <button className="scr-btn-save" onClick={handleSubmit}>
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="#fff" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {editingId ? "Update" : "Save Price"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── TABLE CARD — directly below form ── */}
                        <div className="scr-table-card">
                            <div className="scr-table-header">
                                <div className="scr-table-title">
                                    <div className="scr-table-title-icon">🛵</div>
                                    <div>
                                        <h2>Road Price Records</h2>
                                        <p>All scooty–city on-road pricing entries</p>
                                    </div>
                                </div>

                                <div className="scr-header-pagination">
                                    <div className="scr-pg-btns">
                                        <button className="scr-pg" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>‹</button>
                                        {buildPages(safeCurrentPage, totalPages).map((p, i) =>
                                            p === "…" ? (
                                                <span key={`e${i}`} className="scr-pg-ellipsis">…</span>
                                            ) : (
                                                <button key={p} className={`scr-pg${safeCurrentPage === p ? " active" : ""}`} onClick={() => setCurrentPage(p as number)}>{p}</button>
                                            )
                                        )}
                                        <button className="scr-pg" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
                                    </div>
                                </div>

                                <div className="scr-table-controls">
                                    <div className="scr-search-wrap">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input className="scr-search" placeholder="Search model, city, state…" value={tableSearch} onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }} />
                                    </div>
                                    <span className="scr-count-pill">{filtered.length} records</span>
                                </div>
                            </div>

                            <div className="scr-table-scroll">
                                <table className="scr-table">
                                    <thead>
                                        <tr>
                                            <th>#</th><th>Scooty</th><th>Variant</th><th>City</th>
                                            <th>State</th><th>On-Road Price</th><th>Valid From</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                                                    <td key={j}><span className="scr-skel" style={{ width: j === 1 ? "90px" : "60px" }} /></td>
                                                ))}</tr>
                                            ))
                                        ) : paginated.length === 0 ? (
                                            <tr><td colSpan={8}>
                                                <div className="scr-empty">
                                                    <span className="scr-empty-icon">🛵</span>
                                                    <span className="scr-empty-title">No road price records found</span>
                                                    <span className="scr-empty-sub">{tableSearch ? "No records match your search. Try different keywords." : "Add your first road price record using the form above."}</span>
                                                </div>
                                            </td></tr>
                                        ) : (
                                            paginated.map((d, idx) => (
                                                <tr key={`${d.scootyId}-${d.cityId}`}>
                                                    <td data-label="#"><span className="scr-id-badge">{(safeCurrentPage - 1) * PAGE_SIZE + idx + 1}</span></td>
                                                    <td data-label="Scooty">
                                                        <div className="scr-model-cell">
                                                            <div className="scr-model-avatar">{d.modelName?.charAt(0).toUpperCase() ?? "?"}</div>
                                                            <span className="scr-model-name">{d.modelName ?? "—"}</span>
                                                        </div>
                                                    </td>
                                                    <td data-label="Variant"><span className="scr-variant-badge">{d.variantName ?? "—"}</span></td>
                                                    <td data-label="City"><span style={{ fontWeight: 600, color: "#0f172a" }}>{d.cityName}</span></td>
                                                    <td data-label="State"><span style={{ fontSize: "11px", color: "#64748b" }}>{d.stateName}</span></td>
                                                    <td data-label="On-Road Price"><span className="scr-price rp-onroad-pill">₹ {Number(d.onRoadPrice).toLocaleString("en-IN")}</span></td>
                                                    <td data-label="Valid From">{d.validFrom ? new Date(d.validFrom).toLocaleDateString("en-IN") : <span style={{ color: "#9ca3af" }}>—</span>}</td>
                                                    <td data-label="Actions">
                                                        <div className="scr-row-acts">
                                                            <button className="scr-act-btn scr-act-cities" onClick={() => openAllCities(d)} title="View all city prices for this scooty">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                                                                    <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                                                                </svg>
                                                            </button>
                                                            <button className="scr-act-btn scr-act-edit" onClick={() => handleEdit(d)}>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>
                                                            <button className="scr-act-btn scr-act-del" onClick={() => handleDelete(d)}>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                                                    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* ── END TABLE CARD ── */}

                    </div>
                    {/* ── END LEFT COLUMN ── */}

                    {/* RIGHT COLUMN — Bulk Operations */}
                    <div className="scr-bulk-card">
                        <div className="scr-bulk-header">
                            <h2>Bulk Operations</h2>
                        </div>
                        <div className="scr-bulk-body">
                            <div className="scr-bulk-section">
                                <div className="scr-bulk-section-info">
                                    <span className="scr-bulk-label">Download Template</span>
                                    <span className="scr-bulk-desc">Get the Excel template with columns: ScootyId, CityId, ExShowroomPrice, RtoCharges, InsuranceAmount, OtherCharges, ValidFrom.</span>
                                </div>
                                <button className="scr-btn-dl" onClick={downloadTemplate}>
                                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                    Download Template
                                </button>
                            </div>
                            <hr className="scr-bulk-hr" />
                            <div className="scr-bulk-section">
                                <div className="scr-bulk-section-info">
                                    <span className="scr-bulk-label">Import Excel</span>
                                    <span className="scr-bulk-desc">Upload a filled Excel file to bulk insert or update road prices. Existing records (same ScootyId + CityId) will be updated automatically.</span>
                                </div>
                                <button className="scr-btn-imp" onClick={() => importRef.current?.click()}>
                                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                                    Import Excel
                                </button>
                                <input type="file" ref={importRef} style={{ display: "none" }} accept=".xlsx,.xls" onChange={handleImport} />
                            </div>
                        </div>
                    </div>

                </div>
                {/* ── END TOP GRID ── */}

            </div>

            {/* ── ALL CITIES MODAL ── */}
            {allCitiesModal.open && (
                <div className="rp-modal-backdrop" onClick={() => setAllCitiesModal((p) => ({ ...p, open: false }))}>
                    <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rp-modal-header">
                            <div>
                                <h3>All City Prices</h3>
                                <p>{allCitiesModal.scootyLabel}</p>
                            </div>
                            <button className="rp-modal-close" onClick={() => setAllCitiesModal((p) => ({ ...p, open: false }))}>×</button>
                        </div>
                        <div className="rp-modal-body">
                            {allCitiesModal.loading ? (
                                <div className="rp-modal-loading">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <span key={i} className="scr-skel" style={{ height: "38px", borderRadius: "8px" }} />
                                    ))}
                                </div>
                            ) : allCitiesModal.rows.length === 0 ? (
                                <div className="scr-empty" style={{ padding: "30px 0" }}>
                                    <span className="scr-empty-icon">🏙️</span>
                                    <span className="scr-empty-title">No city prices found</span>
                                </div>
                            ) : (
                                <table className="rp-modal-table">
                                    <thead>
                                        <tr><th>#</th><th>City</th><th>State</th><th>On-Road Price</th></tr>
                                    </thead>
                                    <tbody>
                                        {allCitiesModal.rows.map((r, i) => (
                                            <tr key={r.cityId}>
                                                <td>{i + 1}</td>
                                                <td style={{ fontWeight: 600 }}>{r.cityName}</td>
                                                <td style={{ color: "#64748b" }}>{r.stateName}</td>
                                                <td><span className="scr-price">₹ {Number(r.onRoadPrice).toLocaleString("en-IN")}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}