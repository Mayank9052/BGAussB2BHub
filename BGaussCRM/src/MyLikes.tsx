import "./MyLikes.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface LikedVehicle {
  scootyId:       number;
  modelName:      string;
  variantName:    string;
  colourName:     string | null;
  price:          number | null;
  batterySpecs:   string | null;
  rangeKm:        number | null;
  stockAvailable: boolean;
  imageUrl:       string | null;
  likedAt?:       string;
}

interface LikeResponse {
  liked: boolean;
  count: number;
}

const resolveImageSrc = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

export default function MyLikes() {
  const navigate  = useNavigate();
  const username  = localStorage.getItem("username") ?? "";
  const role      = localStorage.getItem("role")     ?? "";
  const initial   = username.trim().charAt(0).toUpperCase() || "?";

  const [likedVehicles, setLikedVehicles] = useState<LikedVehicle[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [unlikingId,    setUnlikingId]    = useState<number | null>(null);

  const handleLogout = () => { localStorage.clear(); navigate("/", { replace: true }); };

  // ── Fetch all liked vehicles ──────────────────────────────
  const fetchLikedVehicles = useCallback(async () => {
    if (!username) { navigate("/"); return; }
    setLoading(true);
    try {
      // Step 1: get liked scootyIds
      const idsRes = await axios.get<number[]>(
        `/api/UserLikes/my?userId=${encodeURIComponent(username)}`
      );
      const ids = idsRes.data;

      if (ids.length === 0) { setLikedVehicles([]); return; }

      // Step 2: get full inventory and filter
      const inventoryRes = await axios.get<LikedVehicle[]>("/api/ScootyInventory");
      const all = inventoryRes.data;

      const liked = ids
        .map((id) => all.find((v) => v.scootyId === id))
        .filter((v): v is LikedVehicle => v !== undefined);

      setLikedVehicles(liked);
    } catch {
      setLikedVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [username, navigate]);

  useEffect(() => {
    void fetchLikedVehicles();
  }, [fetchLikedVehicles]);

  // ── Unlike a vehicle ──────────────────────────────────────
  const handleUnlike = async (scootyId: number) => {
    if (unlikingId) return;
    setUnlikingId(scootyId);
    try {
      await axios.post<LikeResponse>(
        `/api/UserLikes/${scootyId}?userId=${encodeURIComponent(username)}`
      );
      // Remove from list instantly
      setLikedVehicles((prev) => prev.filter((v) => v.scootyId !== scootyId));
    } catch { /* silent */ }
    finally { setUnlikingId(null); }
  };

  const formatCurrency = (value: number | null) => {
    if (typeof value !== "number") return "Price on request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(value);
  };

  // ── Filter ────────────────────────────────────────────────
  const filtered = likedVehicles.filter((v) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      v.modelName.toLowerCase().includes(q)   ||
      v.variantName.toLowerCase().includes(q) ||
      (v.colourName ?? "").toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="ml-page">

      {/* ═══ NAVBAR ══════════════════════════════════════════ */}
      <header className="ml-navbar">
        <div className="ml-nav-left">
          <img src={logo} className="ml-nav-logo" alt="BGauss logo" />
          <div className="ml-nav-brand">
            <span className="ml-nav-brand-name">BGauss Portal</span>
            <span className="ml-nav-brand-page">My Liked Vehicles</span>
          </div>
        </div>

        <div className="ml-nav-right">

          {/* Heart badge — current count */}
          <div className="ml-nav-heart">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {likedVehicles.length > 0 && (
              <span className="ml-nav-heart-badge">{likedVehicles.length}</span>
            )}
          </div>

          {/* User pill */}
          <div className="ml-user-pill">
            <div className="ml-user-avatar">{initial}</div>
            <div className="ml-user-info">
              <span className="ml-user-name">{username}</span>
              <span className="ml-user-role">{role}</span>
            </div>
          </div>

          {/* Dashboard */}
          <button className="ml-icon-btn ml-btn-dashboard"
            onClick={() => navigate("/dashboard")}
            aria-label="Dashboard" data-tip="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
            </svg>
          </button>

          {/* Logout */}
          <button className="ml-icon-btn ml-btn-logout"
            onClick={handleLogout}
            aria-label="Logout" data-tip="Logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>

        </div>
      </header>

      {/* ═══ CONTENT ══════════════════════════════════════════ */}
      <main className="ml-main">

        {/* Page header */}
        <div className="ml-page-header">
          <div className="ml-page-header-left">
            <div className="ml-page-header-icon">❤️</div>
            <div>
              <h1>My Liked Vehicles</h1>
              <p>Vehicles you've saved for later</p>
            </div>
          </div>
          <div className="ml-page-header-right">
            {!loading && (
              <span className="ml-count-chip">
                <strong>{likedVehicles.length}</strong> liked
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="ml-loading">
            <div className="ml-spinner" />
            <p>Loading your liked vehicles...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && likedVehicles.length === 0 && (
          <div className="ml-empty">
            <div className="ml-empty-icon">💔</div>
            <h2>No liked vehicles yet</h2>
            <p>Browse vehicles and tap the heart icon to save them here.</p>
            <button className="ml-browse-btn" onClick={() => navigate("/dashboard")}>
              Browse Vehicles
            </button>
          </div>
        )}

        {/* Vehicle grid */}
        {!loading && likedVehicles.length > 0 && (
          <>
            {/* Search bar */}
            <div className="ml-search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search by model, variant or colour…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="ml-search-clear" onClick={() => setSearch("")}>✕</button>
              )}
            </div>

            {/* No search results */}
            {filtered.length === 0 && (
              <div className="ml-empty">
                <div className="ml-empty-icon">🔍</div>
                <h2>No results for "{search}"</h2>
                <p>Try a different search term.</p>
              </div>
            )}

            {/* Grid */}
            <div className="ml-grid">
              {filtered.map((vehicle) => (
                <div className="ml-card" key={vehicle.scootyId}>

                  {/* Image */}
                  <div
                    className="ml-card-image"
                    onClick={() => navigate(`/vehicle/${vehicle.scootyId}`)}
                  >
                    <img
                      src={resolveImageSrc(vehicle.imageUrl)}
                      alt={`${vehicle.modelName} ${vehicle.variantName}`}
                      onError={(e) => { e.currentTarget.src = noImage; }}
                    />
                    <span className={`ml-card-stock ${vehicle.stockAvailable ? "in" : "out"}`}>
                      {vehicle.stockAvailable ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="ml-card-body">
                    <div className="ml-card-title-row">
                      <div>
                        <h3 className="ml-card-model">{vehicle.modelName}</h3>
                        <p className="ml-card-variant">{vehicle.variantName}</p>
                      </div>
                      {/* Unlike button */}
                      <button
                        className="ml-card-unlike"
                        onClick={() => handleUnlike(vehicle.scootyId)}
                        disabled={unlikingId === vehicle.scootyId}
                        title="Remove from liked"
                      >
                        {unlikingId === vehicle.scootyId ? (
                          <span className="ml-card-unlike-spinner" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Specs chips */}
                    <div className="ml-card-chips">
                      {vehicle.colourName && (
                        <span className="ml-chip">🎨 {vehicle.colourName}</span>
                      )}
                      {vehicle.rangeKm && (
                        <span className="ml-chip">🛣 {vehicle.rangeKm} km</span>
                      )}
                      {vehicle.batterySpecs && (
                        <span className="ml-chip">🔋 {vehicle.batterySpecs}</span>
                      )}
                    </div>

                    {/* Price + View button */}
                    <div className="ml-card-footer">
                      <span className="ml-card-price">{formatCurrency(vehicle.price)}</span>
                      <button
                        className="ml-card-view-btn"
                        onClick={() => navigate(`/vehicle/${vehicle.scootyId}`)}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}