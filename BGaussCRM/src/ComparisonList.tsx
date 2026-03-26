import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ComparisonList.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface ComparisonCard {
  id: number;
  scooty1Id: number;
  scooty2Id: number;
  model1Name: string;
  model2Name: string;
  variant1Name: string;
  variant2Name: string;
  price1: number | null;
  price2: number | null;
  image1Url: string | null;
  image2Url: string | null;
}

const resolveImg = (path: string | null): string => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatPrice = (p: number | null): string => {
  if (!p) return "N/A";
  const lakh = p / 100000;
  return `Rs. ${lakh.toFixed(2)} Lakh`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ComparisonList() {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<ComparisonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = localStorage.getItem("username") ?? "";
  const role = localStorage.getItem("role") ?? "";
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
    } catch {
      setError("Failed to load comparisons.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
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
            <button className="dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Dashboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button className="dash-icon-btn dash-btn-logout" onClick={handleLogout} aria-label="Logout">
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
        <div className="cmp-list-header">
          <div>
            <h1 className="cmp-list-title">BGauss Electric Scooters Comparisons</h1>
            <p className="cmp-list-subtitle">Compare models side-by-side to find your perfect ride</p>
          </div>
          {role === "admin" && (
            <button className="cmp-manage-btn" onClick={() => navigate("/comparison/manage")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Manage
            </button>
          )}
        </div>

        {error && <div className="dash-error">⚠️ {error}</div>}

        {/* Skeleton */}
        {loading && (
          <div className="cmp-cards-wrap">
            {[1, 2, 3].map(i => (
              <div className="cmp-card cmp-card--skel" key={i}>
                <div className="cmp-card-inner">
                  <div className="cmp-skel-img" />
                  <div className="cmp-skel-vs">vs</div>
                  <div className="cmp-skel-img" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="cmp-cards-wrap">
            {comparisons.map((c) => (
              <div
                className="cmp-card"
                key={c.id}
                onClick={() => navigate(`/comparison/${c.scooty1Id}/${c.scooty2Id}`)}
              >
                <div className="cmp-card-bikes">
                  {/* Bike 1 */}
                  <div className="cmp-bike-side">
                    <div className="cmp-bike-img-wrap">
                      <img
                        src={resolveImg(c.image1Url)}
                        alt={c.model1Name}
                        className="cmp-bike-img"
                        onError={(e) => { e.currentTarget.src = noImage; }}
                      />
                    </div>
                    <span className="cmp-bike-brand">BGauss</span>
                    <span className="cmp-bike-model">{c.model1Name}</span>
                    <span className="cmp-bike-price">{formatPrice(c.price1)}</span>
                  </div>

                  {/* VS badge */}
                  <div className="cmp-vs-badge">vs</div>

                  {/* Bike 2 */}
                  <div className="cmp-bike-side">
                    <div className="cmp-bike-img-wrap">
                      <img
                        src={resolveImg(c.image2Url)}
                        alt={c.model2Name}
                        className="cmp-bike-img"
                        onError={(e) => { e.currentTarget.src = noImage; }}
                      />
                    </div>
                    <span className="cmp-bike-brand">{c.model2Name.includes("TVS") ? "TVS" : c.model2Name.includes("Ather") ? "Ather" : "Other"}</span>
                    <span className="cmp-bike-model">{c.model2Name}</span>
                    <span className="cmp-bike-price">{formatPrice(c.price2)}</span>
                  </div>
                </div>

                {/* CTA */}
                <button className="cmp-cta-btn">
                  {c.model1Name} vs {c.model2Name}
                </button>
              </div>
            ))}

            {/* Empty state */}
            {comparisons.length === 0 && (
              <div className="cmp-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 12h8M12 8v8"/>
                </svg>
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