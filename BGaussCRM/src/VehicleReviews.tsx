import "./VehicleReviews.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface Review {
  id: number;
  userId: string;
  title: string;
  reviewText: string;
  rating: number;
  performanceRating: number | null;
  mileageRating:     number | null;
  comfortRating:     number | null;
  maintenanceRating: number | null;
  featuresRating:    number | null;
  createdAt: string;
}
interface Summary {
  totalReviews: number;
  averageRating: number;
  avgPerformance: number | null;
  avgMileage:     number | null;
  avgComfort:     number | null;
  avgMaintenance: number | null;
  avgFeatures:    number | null;
  ratingBreakdown: { five: number; four: number; three: number; two: number; one: number; };
}
interface VehicleInfo {
  scootyId: number;
  modelName: string;
  variantName: string;
  imageUrl: string | null;
  price: number | null;
}

function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="vr-star-bar">
      <span className="vr-star-label">{rating} ★</span>
      <div className="vr-bar-track"><div className="vr-bar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="vr-star-count">({count})</span>
    </div>
  );
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="vr-stars-row" style={{ fontSize: size }}>
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={`vr-star ${s <= Math.round(value) ? "on" : "off"}`}>★</span>
      ))}
    </span>
  );
}

function CatBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  return (
    <div className="vr-cat-bar">
      <span className="vr-cat-label">{label}</span>
      <Stars value={value} size={13} />
      <span className="vr-cat-score">{value}/5</span>
    </div>
  );
}

export default function VehicleReviews() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vehicle,  setVehicle]  = useState<VehicleInfo | null>(null);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [vehicleRes, reviewsRes] = await Promise.all([
        axios.get<VehicleInfo>(`/api/ScootyInventory/details/${id}`),
        axios.get<{ summary: Summary | null; reviews: Review[] }>(`/api/VehicleReviews/${id}`),
      ]);
      setVehicle(vehicleRes.data);
      setSummary(reviewsRes.data.summary);
      setReviews(reviewsRes.data.reviews);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const toggleExpand = (rid: number) => {
  setExpanded((prev) => {
    const s = new Set(prev);

    if (s.has(rid)) {
      s.delete(rid);
    } else {
      s.add(rid);
    }

    return s;
  });
};

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const resolveImg = (path: string | null) => {
    if (!path) return noImage;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  };

  return (
    <div className="vr-page">

      {/* NAVBAR */}
      <header className="vr-navbar">
        <div className="vr-nav-left">
          <img src={logo} className="vr-nav-logo" alt="BGauss" />
          <div className="vr-nav-brand">
            <span className="vr-brand-name">BGauss Portal</span>
            <span className="vr-brand-page">User Reviews</span>
          </div>
        </div>
        <div className="vr-nav-right">
          <div className="vr-user-pill">
            <div className="vr-avatar">{initial}</div>
            <div className="vr-user-info">
              <span className="vr-user-name">{username}</span>
              <span className="vr-user-role">{role}</span>
            </div>
          </div>
          <button className="vr-icon-btn vr-btn-back" onClick={() => navigate(`/vehicle/${id}`)} data-tip="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="vr-icon-btn vr-btn-dash" onClick={() => navigate("/dashboard")} data-tip="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/></svg>
          </button>
        </div>
      </header>

      <main className="vr-main">
        {loading ? (
          <div className="vr-loading"><div className="vr-spinner" /><p>Loading reviews…</p></div>
        ) : (
          <div className="vr-layout">

            {/* LEFT: summary */}
            <div className="vr-left">

              {/* Vehicle card */}
              {vehicle && (
                <div className="vr-vehicle-card" onClick={() => navigate(`/vehicle/${id}`)}>
                  <img src={resolveImg(vehicle.imageUrl)} alt={vehicle.modelName} onError={(e) => { e.currentTarget.src = noImage; }} />
                  <div className="vr-vehicle-info">
                    <h3>{vehicle.modelName}</h3>
                    <p>{vehicle.variantName}</p>
                    {vehicle.price && (
                      <span className="vr-vehicle-price">
                        ₹ {(vehicle.price / 100000).toFixed(2)} Lakh
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Rating summary */}
              {summary ? (
                <div className="vr-summary-card">
                  <div className="vr-summary-top">
                    <div className="vr-big-rating">
                      <span className="vr-big-score">{summary.averageRating}</span>
                      <span className="vr-big-max">/5</span>
                    </div>
                    <Stars value={summary.averageRating} size={22} />
                    <p className="vr-summary-based">Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Bar breakdown */}
                  <div className="vr-bar-section">
                    <StarBar rating={5} count={summary.ratingBreakdown.five}  total={summary.totalReviews} />
                    <StarBar rating={4} count={summary.ratingBreakdown.four}  total={summary.totalReviews} />
                    <StarBar rating={3} count={summary.ratingBreakdown.three} total={summary.totalReviews} />
                    <StarBar rating={2} count={summary.ratingBreakdown.two}   total={summary.totalReviews} />
                    <StarBar rating={1} count={summary.ratingBreakdown.one}   total={summary.totalReviews} />
                  </div>

                  {/* Category bars */}
                  <div className="vr-cat-section">
                    <CatBar label="Performance"  value={summary.avgPerformance} />
                    <CatBar label="Mileage"       value={summary.avgMileage} />
                    <CatBar label="Comfort"       value={summary.avgComfort} />
                    <CatBar label="Maintenance"   value={summary.avgMaintenance} />
                    <CatBar label="Features"      value={summary.avgFeatures} />
                  </div>

                  <button className="vr-write-btn" onClick={() => navigate(`/vehicle/${id}`)}>
                    ✏️ Write a Review
                  </button>
                </div>
              ) : (
                <div className="vr-no-reviews-card">
                  <span>💬</span>
                  <p>No reviews yet. Be the first to review!</p>
                  <button className="vr-write-btn" onClick={() => navigate(`/vehicle/${id}`)}>Write a Review</button>
                </div>
              )}
            </div>

            {/* RIGHT: review list */}
            <div className="vr-right">
              <h2 className="vr-list-title">
                {vehicle?.modelName} User Reviews
                {summary && <span className="vr-list-count"> ({summary.totalReviews})</span>}
              </h2>

              {reviews.length === 0 ? (
                <div className="vr-empty-reviews">
                  <span>💬</span><p>No reviews yet.</p>
                </div>
              ) : (
                <div className="vr-review-list">
                  {reviews.map((r) => {
                    const isExpanded = expanded.has(r.id);
                    const isLong = r.reviewText.length > 200;
                    const displayText = isLong && !isExpanded ? r.reviewText.slice(0, 200) + "…" : r.reviewText;
                    return (
                      <div className="vr-review-card" key={r.id}>
                        <div className="vr-review-header">
                          <div className="vr-reviewer-avatar">{r.userId.charAt(0).toUpperCase()}</div>
                          <div className="vr-reviewer-info">
                            <span className="vr-reviewer-name">{r.userId}</span>
                            <Stars value={r.rating} size={14} />
                          </div>
                          <span className="vr-review-date">{formatDate(r.createdAt)}</span>
                        </div>
                        <h4 className="vr-review-title">{r.title}</h4>
                        <p className="vr-review-text">
                          {displayText}
                          {isLong && (
                            <button className="vr-read-more" onClick={() => toggleExpand(r.id)}>
                              {isExpanded ? " Show less" : " …Read More"}
                            </button>
                          )}
                        </p>
                        {/* Category mini ratings */}
                        {(r.performanceRating || r.mileageRating || r.comfortRating) && (
                          <div className="vr-review-cats">
                            {r.performanceRating && <span>Performance: {r.performanceRating}/5</span>}
                            {r.mileageRating     && <span>Mileage: {r.mileageRating}/5</span>}
                            {r.comfortRating     && <span>Comfort: {r.comfortRating}/5</span>}
                            {r.maintenanceRating && <span>Maintenance: {r.maintenanceRating}/5</span>}
                            {r.featuresRating    && <span>Features: {r.featuresRating}/5</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}