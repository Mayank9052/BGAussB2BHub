import "./vehicleDetails.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

interface VehicleDetailsResponse {
  scootyId: number;
  imageUrl: string | null;
  modelName: string;
  variantName: string;
  colourName: string | null;
  price: number | null;
  batterySpecs: string | null;
  rangeKm: number | null;
  stockAvailable: boolean;
}

type VehicleDetailsResponseApi = VehicleDetailsResponse & {
  imagePath?: string | null;
};

interface InventoryItem {
  scootyId: number;
  modelId: number;
  modelName: string;
  variantId: number;
  variantName: string;
  colourId: number | null;
  colourName: string | null;
  price: number | null;
  batterySpecs: string | null;
  rangeKm: number | null;
  stockAvailable: boolean;
  imageUrl: string | null;
}

type InventoryItemApi = InventoryItem & {
  imagePath?: string | null;
};

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

const ZOOM_LEVEL = 2.5;

export default function VehicleDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [vehicle,         setVehicle]         = useState<VehicleDetailsResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Zoom ─────────────────────────────────────────────────
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomStyle,  setZoomStyle]  = useState<React.CSSProperties>({});
  const imgRef      = useRef<HTMLImageElement>(null);
  const zoomPaneRef = useRef<HTMLDivElement>(null);

  // ── Like / Share ─────────────────────────────────────────
  const [isLiked,         setIsLiked]         = useState(false);
  const [likeCount,       setLikeCount]       = useState(0);
  const [likeLoading,     setLikeLoading]     = useState(false);
  const [shareMsg,        setShareMsg]        = useState("");
  const [totalLikedCount, setTotalLikedCount] = useState(0); // ← navbar heart count

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const normalizeImageField = <T extends { imageUrl?: string | null; imagePath?: string | null }>(
    item: T
  ): T & { imageUrl: string | null } => ({
    ...item,
    imageUrl: item.imageUrl ?? item.imagePath ?? null,
  });

  // ── Fetch total liked count (for navbar badge) ────────────
  const fetchTotalLikes = useCallback(async () => {
    if (!username) return;
    try {
      const res = await axios.get<number[]>(
        `/api/UserLikes/my?userId=${encodeURIComponent(username)}`
      );
      setTotalLikedCount(res.data.length);
    } catch { /* silent */ }
  }, [username]);

  // ── Fetch like status for current vehicle ─────────────────
  const fetchLikeStatus = useCallback(async (scootyId: number) => {
    if (!username) return;
    try {
      const res = await axios.get<LikeResponse>(
        `/api/UserLikes/${scootyId}?userId=${encodeURIComponent(username)}`
      );
      setIsLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch { /* silent */ }
  }, [username]);

  // ── Fetch page data ───────────────────────────────────────
  useEffect(() => {
    if (!id) { setError("Vehicle not found."); setLoading(false); return; }

    const fetchVehiclePage = async () => {
      setLoading(true);
      setError("");
      setZoomActive(false);
      setIsLiked(false);
      setLikeCount(0);

      try {
        const [detailsRes, inventoryListRes] = await Promise.all([
          axios.get<VehicleDetailsResponseApi>(`/api/ScootyInventory/details/${id}`),
          axios.get<InventoryItemApi[]>("/api/ScootyInventory"),
        ]);

        const vehicleDetails = normalizeImageField(detailsRes.data);
        const inventoryList  = inventoryListRes.data.map(normalizeImageField);

        const currentInventory = inventoryList.find(
          (item) => item.scootyId === Number(id)
        );

        const relatedModels = inventoryList
          .filter((item) =>
            currentInventory
              ? item.modelId === currentInventory.modelId
              : item.modelName === vehicleDetails.modelName
          )
          .sort((a, b) => {
            if (a.stockAvailable !== b.stockAvailable) return a.stockAvailable ? -1 : 1;
            return (b.price ?? 0) - (a.price ?? 0);
          });

        setVehicle(vehicleDetails);
        setAvailableModels(relatedModels);
        window.scrollTo(0, 0);

        // Fetch like status for this vehicle + total liked count for navbar
        void fetchLikeStatus(vehicleDetails.scootyId);
        void fetchTotalLikes();

      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load vehicle details.");
        setVehicle(null);
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchVehiclePage();
  }, [id, fetchLikeStatus, fetchTotalLikes]);

  // ── Auto-refresh likes badge every 30 seconds ─────────────
useEffect(() => {
  if (!username) return;

  // Refresh immediately on mount
  void fetchTotalLikes();

  // Then every 30 seconds
  const interval = setInterval(() => {
    void fetchTotalLikes();
  }, 30_000);

  return () => clearInterval(interval); // cleanup on unmount
}, [fetchTotalLikes, username]);

// ── Refresh when user returns to tab ─────────────────────
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void fetchTotalLikes();
      if (vehicle) void fetchLikeStatus(vehicle.scootyId);
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [fetchTotalLikes, fetchLikeStatus, vehicle]);

  // ── Like handler ──────────────────────────────────────────
  const handleLike = async () => {
    if (!vehicle || !username || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await axios.post<LikeResponse>(
        `/api/UserLikes/${vehicle.scootyId}?userId=${encodeURIComponent(username)}`
      );
      setIsLiked(res.data.liked);
      setLikeCount(res.data.count);
      // Update navbar badge instantly without extra API call
      setTotalLikedCount((prev) => res.data.liked ? prev + 1 : Math.max(0, prev - 1));
    } catch { /* silent */ }
    finally { setLikeLoading(false); }
  };

  // ── Share handler ─────────────────────────────────────────
  const handleShare = async () => {
    if (!vehicle) return;
    const shareData = {
      title: `${vehicle.modelName} ${vehicle.variantName}`,
      text:  `Check out ${vehicle.modelName} ${vehicle.variantName}${vehicle.price ? ` — ₹${vehicle.price.toLocaleString("en-IN")}` : ""}`,
      url:   window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch { /* user cancelled */ }
  };

  // ── Zoom handlers ─────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img || !vehicle) return;
    const rect = img.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    const imageSrc = img.currentSrc || img.src;
    setZoomStyle({
      backgroundImage:    `url("${imageSrc}")`,
      backgroundSize:     `${ZOOM_LEVEL * 100}%`,
      backgroundPosition: `${xPct * 100}% ${yPct * 100}%`,
      backgroundRepeat:   "no-repeat",
    });
    setZoomActive(true);
  }, [vehicle]);

  const handleMouseLeave = useCallback(() => setZoomActive(false), []);

  // ── Navigation ────────────────────────────────────────────
  const goToDashboard = () => navigate("/dashboard");

  const goToPrevious = () => {
    if (!availableModels.length || !vehicle) return;
    const idx = availableModels.findIndex((x) => x.scootyId === vehicle.scootyId);
    if (idx > 0) navigate(`/vehicle/${availableModels[idx - 1].scootyId}`);
  };

  const goToNext = () => {
    if (!availableModels.length || !vehicle) return;
    const idx = availableModels.findIndex((x) => x.scootyId === vehicle.scootyId);
    if (idx < availableModels.length - 1) navigate(`/vehicle/${availableModels[idx + 1].scootyId}`);
  };

  const formatCurrency = (value: number | null) => {
    if (typeof value !== "number") return "Price on request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(value);
  };

  const currentIdx     = vehicle ? availableModels.findIndex((x) => x.scootyId === vehicle.scootyId) : -1;
  const isPrevDisabled = !vehicle || currentIdx <= 0;
  const isNextDisabled = !vehicle || currentIdx >= availableModels.length - 1;

  const specificationItems = vehicle ? [
    { label: "Model",    value: vehicle.modelName },
    { label: "Variant",   value: vehicle.variantName },
    { label: "Colour",  value: vehicle.colourName ?? "Not specified" },
    { label: "Range",   value: vehicle.rangeKm ? `${vehicle.rangeKm} km` : "Not available" },
    { label: "Battery", value: vehicle.batterySpecs ?? "Not available" },
    { label: "Price",   value: formatCurrency(vehicle.price) },
  ] : [];

  const galleryHighlights = vehicle ? [
    { label: "Range",   value: vehicle.rangeKm ? `${vehicle.rangeKm} km` : "Not available", detail: "Certified riding distance" },
    { label: "Battery", value: vehicle.batterySpecs ?? "Not available",                      detail: "Current battery specification" },
    { label: "Colour",  value: vehicle.colourName ?? "Not specified",                        detail: "Selected vehicle finish" },
    { label: "Stock",   value: vehicle.stockAvailable ? "In Stock" : "Out of Stock",         detail: "Current inventory status" },
  ] : [];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="vehicle-details-page">

      {/* ═══ NAVBAR ══════════════════════════════════════════ */}
      <header className="pro-navbar vehicle-details-pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Details</span>
          </div>
        </div>

        <div className="pro-right vehicle-details-nav-buttons">

          {/* ── Navbar Likes Heart ── */}
          {username && (
            <div
              className="vd-nav-likes"
              onClick={() => navigate("/my-likes")}
              title={`${totalLikedCount} liked vehicle${totalLikedCount !== 1 ? "s" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill={totalLikedCount > 0 ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {totalLikedCount > 0 && (
                <span className="vd-nav-likes-badge">{totalLikedCount}</span>
              )}
            </div>
          )}

          {/* ── User pill ── */}
          <div className="vd-user-pill">
            <div className="desktop-avatar">{initial}</div>
            <div className="desktop-user-info">
              <span className="desktop-user-name">{username}</span>
              <span className="desktop-user-role">{role}</span>
            </div>
          </div>

          {/* ── Dashboard ── */}
          <button className="vd-icon-btn vd-btn-dashboard"
            onClick={goToDashboard} aria-label="Dashboard" data-tip="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
            </svg>
          </button>

          {/* ── Prev ── */}
          <button className="vd-icon-btn vd-btn-prev"
            onClick={goToPrevious} disabled={isPrevDisabled}
            aria-label="Previous Vehicle" data-tip="Prev Vehicle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* ── Next ── */}
          <button className="vd-icon-btn vd-btn-next"
            onClick={goToNext} disabled={isNextDisabled}
            aria-label="Next Vehicle" data-tip="Next Vehicle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

        </div>
      </header>

      {/* ═══ MAIN ════════════════════════════════════════════ */}
      <main className="vehicle-details-main">

        {loading ? (
          <section className="vehicle-details-state-card">
            <h2>Loading vehicle information...</h2>
            <p>Please wait while we fetch specifications and related models.</p>
          </section>

        ) : error ? (
          <section className="vehicle-details-state-card vehicle-details-state-card-error">
            <h2>{error}</h2>
            <p>The selected vehicle could not be loaded from the current inventory.</p>
          </section>

        ) : vehicle ? (
          <section className="vehicle-details-layout">

            {/* ── LEFT COLUMN ── */}
            <div className="vehicle-details-gallery-column">

              <p className="vehicle-details-breadcrumbs">
                Home / Vehicles / BGauss / {vehicle.modelName} / {vehicle.variantName}
              </p>

              {/* ── LIKE + SHARE + ROAD PRICE BUTTONS ── */}
              <div className="vd-action-buttons">

                {/* LIKE */}
                <button
                  className={`vd-like-btn${isLiked ? " liked" : ""}`}
                  onClick={handleLike}
                  disabled={likeLoading || !username}
                  aria-label="Like this vehicle"
                  title={!username ? "Login to like" : isLiked ? "Unlike" : "Like"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {likeCount > 0 && <span className="vd-like-count">{likeCount}</span>}
                </button>

                {/* SHARE */}
                <button
                  className="vd-share-btn"
                  onClick={handleShare}
                  aria-label="Share this vehicle"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  <span>Share</span>
                </button>

                {/* ROAD PRICE */}
                <button
                  className="vd-road-price-btn"
                  onClick={() => navigate(`/road-price/${vehicle.scootyId}`)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>On Road Price</span>
                </button>

                {shareMsg && <span className="vd-share-msg">✓ {shareMsg}</span>}

              </div>

              {/* ── IMAGE + ZOOM WRAPPER ── */}
              <div className="vd-zoom-wrapper">

                <div
                  className="vd-zoom-source"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    ref={imgRef}
                    src={resolveImageSrc(vehicle.imageUrl)}
                    alt={`${vehicle.modelName} ${vehicle.variantName}`}
                    className="vd-main-image"
                    onError={(e) => { e.currentTarget.src = noImage; }}
                    draggable={false}
                  />
                  {zoomActive && <div className="vd-zoom-cursor-hint">🔍</div>}
                </div>

                <div
                  ref={zoomPaneRef}
                  className={`vd-zoom-pane ${zoomActive ? "vd-zoom-pane-active" : ""}`}
                  style={zoomActive ? zoomStyle : {}}
                >
                  {!zoomActive && (
                    <div className="vd-zoom-placeholder">
                      <span>🔍</span>
                      <p>Hover over image to zoom</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Gallery highlights */}
              <div className="vehicle-details-gallery-grid vd-highlights-grid">
                {galleryHighlights.map((item) => (
                  <article className="vehicle-details-gallery-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>

              {/* Variants */}
              <section className="vehicle-details-variants-block">
                <div className="vehicle-details-sidebar-head">
                  <h3>Variants</h3>
                  <p>{availableModels.length} option(s)</p>
                </div>

                <div className="vehicle-details-option-grid">
                  {availableModels.map((item) => {
                    const isSelected = item.scootyId === vehicle.scootyId;
                    return (
                      <button
                        key={item.scootyId}
                        type="button"
                        className={isSelected
                          ? "vehicle-details-option-card vehicle-details-option-card-active"
                          : "vehicle-details-option-card"}
                        onClick={() => navigate(`/vehicle/${item.scootyId}`)}
                      >
                        <strong>{item.variantName}</strong>
                        <span>{formatCurrency(item.price)}</span>
                        <small>{item.stockAvailable ? "Available now" : "Currently unavailable"}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

            </div>{/* end left column */}

            {/* ── RIGHT SIDEBAR ── */}
            <aside className="vehicle-details-sidebar">
              <div className="vehicle-details-sidebar-scroll">

                <p className="vehicle-details-sidebar-title">
                  Selected Colour: <strong>{vehicle.colourName ?? "Not specified"}</strong>
                </p>

                <section className="vehicle-details-sidebar-block">
                  <h2>{vehicle.modelName}</h2>
                  <p className="vehicle-details-sidebar-subtitle">
                    Variant : {vehicle.variantName}
                  </p>

                  <div className="vehicle-details-sidebar-rating">
                    <span>{vehicle.stockAvailable ? "In Stock" : "Out of Stock"}</span>
                    <span>{vehicle.rangeKm ? `${vehicle.rangeKm} km range` : "Range on request"}</span>
                  </div>

                  <div className="vehicle-details-sidebar-price">
                    <strong>{formatCurrency(vehicle.price)}</strong>
                    <p>{vehicle.batterySpecs ?? "Battery details unavailable"}</p>
                  </div>
                </section>

                <section className="vehicle-details-sidebar-block">
                  <div className="vehicle-details-sidebar-head">
                    <h3>Specifications</h3>
                  </div>

                  <div className="vehicle-details-spec-list">
                    {specificationItems.map((item) => (
                      <div className="vehicle-details-spec-row" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}

                    <div className="vehicle-details-spec-row">
                      <span>Availability</span>
                      <strong className={vehicle.stockAvailable
                        ? "vehicle-details-stock-text vehicle-details-stock-text-in"
                        : "vehicle-details-stock-text vehicle-details-stock-text-out"}>
                        {vehicle.stockAvailable ? "Available Now" : "Currently Unavailable"}
                      </strong>
                    </div>
                  </div>
                </section>

              </div>
            </aside>

          </section>
        ) : null}
      </main>
    </div>
  );
}