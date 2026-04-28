import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ComparisonList.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface ComparisonCard {
  id: number;
  scooty1Id: number; scooty2Id: number; scooty3Id?: number | null;
  model1Name: string; model2Name: string; model3Name?: string | null;
  variant1Name: string; variant2Name: string; variant3Name?: string | null;
  price1: number | null; price2: number | null; price3?: number | null;
  image1Url: string | null; image2Url: string | null; image3Url?: string | null;
}

const resolveImg = (path: string | null): string => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatPrice = (p: number | null) =>
  p != null ? `Rs. ${(p / 100000).toFixed(2)}L` : "";

const getInitials = (name: string) => {
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const getBrand = (name: string) => {
  if (!name) return "Other";
  const brands = ["TVS", "Ather", "Ola", "Hero", "Bajaj", "Suzuki", "Honda", "Yamaha", "BGauss"];
  return brands.find(b => name.toLowerCase().includes(b.toLowerCase())) ?? "Other";
};

export default function ComparisonList() {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<ComparisonCard[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error,   setError]           = useState("");

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initials = getInitials(username || "U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/", { replace: true }); return; }
    fetchComparisons();
  }, [navigate]);

  const fetchComparisons = async () => {
    try {
      const res = await axios.get<ComparisonCard[]>("/api/Comparison/list");
      setComparisons(res.data);
    } catch { setError("Failed to load comparisons."); }
    finally   { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const goToDetail = (c: ComparisonCard) => {
    const path = c.scooty3Id
      ? `/comparison/${c.scooty1Id}/${c.scooty2Id}/${c.scooty3Id}`
      : `/comparison/${c.scooty1Id}/${c.scooty2Id}`;
    navigate(path);
  };

  return (
    <div className="cmp-list-page">

      {/* ── NAVBAR ── */}
      <header className="dash-navbar">
        <div className="dash-nav-left">
          <img src={logo} className="dash-nav-logo" alt="BGauss" />
          <div className="dash-nav-brand">
            <span className="dash-brand-name">BGauss Portal</span>
            <span className="dash-brand-page">Comparisons</span>
          </div>
        </div>
        <div className="dash-nav-right">
          <div className="dash-user-pill">
            <div className="dash-avatar">{initials}</div>
            <div className="dash-user-info">
              <span className="dash-user-name">{username}</span>
              <span className="dash-user-role">{role}</span>
            </div>
          </div>
          <div className="dash-actions">
            <button className="dash-icon-btn dash-btn-dashboard" onClick={() => navigate("/dashboard")} title="Dashboard" aria-label="Dashboard" data-tip="Dashboard">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="white"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="white"/>
                <line x1="15" y1="3" x2="15" y2="21" stroke="white"/>
                <line x1="9" y1="9" x2="21" y2="9" stroke="white"/>
                <line x1="9" y1="15" x2="21" y2="15" stroke="white"/>
              </svg>
            </button>
            <button className="dash-icon-btn dash-btn-logout" onClick={handleLogout} title="Logout" aria-label="Logout" data-tip="Logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="cmp-list-main">

        {error && <div className="dash-error">⚠️ {error}</div>}

        <div className="cmp-list-header">
          <div className="cmp-list-heading">
            <h1 className="cmp-list-title">BGauss Electric Scooter Comparisons</h1>
            <p className="cmp-list-subtitle">Compare models side-by-side to find your perfect ride</p>
          </div>
          {role === "admin" && (
            <button className="cmp-manage-btn" onClick={() => navigate("/comparison/manage")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Manage
            </button>
          )}
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="cmp-cards-wrap">
            {[1, 2, 3].map(i => (
              <div className="cmp-card cmp-card--skel" key={i}>
                <div className="cmp-skel-inner">
                  <div className="cmp-skel-img" />
                  <div className="cmp-skel-badge" />
                  <div className="cmp-skel-img" />
                </div>
                <div className="cmp-skel-img" style={{ height: 36, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="cmp-cards-wrap">
            {comparisons.map(c => (
              <div className="cmp-card" key={c.id} onClick={() => goToDetail(c)}>

                {/* 3-bike badge */}
                {c.scooty3Id && <div className="cmp-three-badge">3 Bikes</div>}

                <div className="cmp-card-bikes">
                  {/* Bike 1 */}
                  <div className="cmp-bike-side">
                    <div className="cmp-bike-img-wrap">
                      <img src={resolveImg(c.image1Url)} alt={c.model1Name} className="cmp-bike-img"
                        onError={e => { e.currentTarget.src = noImage; }} />
                    </div>
                    <span className="cmp-bike-brand">BGauss</span>
                    <span className="cmp-bike-model">{c.model1Name}</span>
                    <span className="cmp-bike-price">{formatPrice(c.price1)}</span>
                  </div>

                  <div className="cmp-vs-badge">vs</div>

                  {/* Bike 2 */}
                  <div className="cmp-bike-side">
                    <div className="cmp-bike-img-wrap">
                      <img src={resolveImg(c.image2Url)} alt={c.model2Name} className="cmp-bike-img"
                        onError={e => { e.currentTarget.src = noImage; }} />
                    </div>
                    <span className="cmp-bike-brand">{getBrand(c.model2Name)}</span>
                    <span className="cmp-bike-model">{c.model2Name}</span>
                    <span className="cmp-bike-price">{formatPrice(c.price2)}</span>
                  </div>

                  {/* Bike 3 — optional */}
                  {c.scooty3Id && c.model3Name && (
                    <>
                      <div className="cmp-vs-badge">vs</div>
                      <div className="cmp-bike-side">
                        <div className="cmp-bike-img-wrap">
                          <img src={resolveImg(c.image3Url ?? null)} alt={c.model3Name} className="cmp-bike-img"
                            onError={e => { e.currentTarget.src = noImage; }} />
                        </div>
                        <span className="cmp-bike-brand">{getBrand(c.model3Name)}</span>
                        <span className="cmp-bike-model">{c.model3Name}</span>
                        <span className="cmp-bike-price">{formatPrice(c.price3 ?? null)}</span>
                      </div>
                    </>
                  )}
                </div>

                <button className="cmp-cta-btn">
                  {c.model1Name} vs {c.model2Name}{c.model3Name ? ` vs ${c.model3Name}` : ""}
                </button>
              </div>
            ))}

            {comparisons.length === 0 && (
              <div className="cmp-empty">
                <div className="cmp-empty-icon">🏍️</div>
                <p>No comparisons configured yet.</p>
                {role === "admin" && (
                  <button onClick={() => navigate("/comparison/manage")}>Add Comparison</button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}