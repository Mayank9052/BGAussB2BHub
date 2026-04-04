import "./vehicleDetails.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";
import Tooltip from "./Tooltip";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import EmiCalculator from "./EmiCalculator";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

// ── Interfaces ─────────────────────────────────────────────────
interface AreaStockInfo {
  cityAreaId:     number;
  areaName:       string;
  pincode:        string;
  cityName:       string;
  stockQuantity:  number;
  stockAvailable: boolean;
}

interface VehicleDetailsResponse {
  scootyId:        number;
  imageUrl:        string | null;
  modelName:       string;
  variantName:     string;
  colourName:      string | null;
  price:           number | null;
  batterySpecs:    string | null;
  rangeKm:         number | null;
  stockAvailable:  boolean;
  stockQuantity:   number;
  maxPowerKw:      number | null;
  brakeFront:      string | null;
  brakeRear:       string | null;
  brakingType:     string | null;
  wheelSize:       string | null;
  wheelType:       string | null;
  chargingTimeHrs: string | null;
  startingType:    string | null;
  speedometer:     string | null;
  areaStock?:      AreaStockInfo | null;
}

type VehicleDetailsResponseApi = VehicleDetailsResponse & { imagePath?: string | null };

interface InventoryItem {
  scootyId:       number;
  modelId:        number;
  modelName:      string;
  variantId:      number;
  variantName:    string;
  colourId:       number | null;
  colourName:     string | null;
  price:          number | null;
  batterySpecs:   string | null;
  rangeKm:        number | null;
  stockAvailable: boolean;
  imageUrl:       string | null;
}
type InventoryItemApi = InventoryItem & { imagePath?: string | null };

interface LikeResponse { liked: boolean; count: number; }

interface ReviewSummary {
  totalReviews:    number;
  averageRating:   number;
  avgPerformance:  number | null;
  avgMileage:      number | null;
  avgComfort:      number | null;
  avgMaintenance:  number | null;
  avgFeatures:     number | null;
  ratingBreakdown: { five: number; four: number; three: number; two: number; one: number; };
}

// ── Helpers ────────────────────────────────────────────────────
const resolveImageSrc = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const ZOOM_LEVEL = 2.5;

// ── Star (interactive) ─────────────────────────────────────────
function StarRating({ value, onChange, size = 24 }: {
  value: number; onChange?: (v: number) => void; size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="vd-stars" style={{ gap: 3 }}>
      {[1,2,3,4,5].map((s) => (
        <span
          key={s}
          className={`vd-star${s <= (hover || value) ? " filled" : ""}`}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default" }}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(s)}
        >★</span>
      ))}
    </div>
  );
}

// ── Mini stars (display only) ──────────────────────────────────
function MiniStars({ value }: { value: number }) {
  return (
    <span className="vd-mini-stars">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={`vd-mini-star${s <= Math.round(value) ? " on" : ""}`}>★</span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
export default function VehicleDetails() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  // ── URL params ────────────────────────────────────────────
  const urlPincode = searchParams.get("pincode");
  const urlCityId  = searchParams.get("cityId");

  const [vehicle,         setVehicle]         = useState<VehicleDetailsResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── EMI calculator — locked until enquiry submitted ───────
  const [showEmiCalc,    setShowEmiCalc]    = useState(false);
  const [emiEnquiryDone, setEmiEnquiryDone] = useState(false);

  // ── Zoom ──────────────────────────────────────────────────
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomStyle,  setZoomStyle]  = useState<React.CSSProperties>({});
  const imgRef      = useRef<HTMLImageElement>(null);
  const zoomPaneRef = useRef<HTMLDivElement>(null);

  // ── Like / Share ──────────────────────────────────────────
  const [isLiked,         setIsLiked]         = useState(false);
  const [likeCount,       setLikeCount]       = useState(0);
  const [likeLoading,     setLikeLoading]     = useState(false);
  const [shareMsg,        setShareMsg]        = useState("");
  const [totalLikedCount, setTotalLikedCount] = useState(0);

  // ── Review summary ────────────────────────────────────────
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

  // ── Review modal ──────────────────────────────────────────
  const [reviewModalOpen,  setReviewModalOpen]  = useState(false);
  const [reviewTitle,      setReviewTitle]      = useState("");
  const [reviewText,       setReviewText]       = useState("");
  const [reviewRating,     setReviewRating]     = useState(0);
  const [perfRating,       setPerfRating]       = useState(0);
  const [mileageRating,    setMileageRating]    = useState(0);
  const [comfortRating,    setComfortRating]    = useState(0);
  const [maintRating,      setMaintRating]      = useState(0);
  const [featRating,       setFeatRating]       = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg,        setReviewMsg]        = useState("");

  // ── EMI enquiry modal ─────────────────────────────────────
  const [emiModalOpen,  setEmiModalOpen]  = useState(false);
  const [emiName,       setEmiName]       = useState("");
  const [emiMobile,     setEmiMobile]     = useState("");
  const [emiPin,        setEmiPin]        = useState("");
  const [emiWantsLoan,  setEmiWantsLoan]  = useState<boolean | null>(null);
  const [emiSubmitting, setEmiSubmitting] = useState(false);
  const [emiMsg,        setEmiMsg]        = useState("");
  const [emiSuccess,    setEmiSuccess]    = useState(false);

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  const normalizeImageField = <T extends { imageUrl?: string | null; imagePath?: string | null }>(
    item: T
  ): T & { imageUrl: string | null } => ({
    ...item, imageUrl: item.imageUrl ?? item.imagePath ?? null,
  });

  // ── Open EMI modal helper ─────────────────────────────────
  const openEmiModal = () => {
    setEmiSuccess(false);
    setEmiMsg("");
    setEmiName("");
    setEmiMobile("");
    setEmiPin("");
    setEmiWantsLoan(null);
    setEmiModalOpen(true);
  };

  // ── Likes ─────────────────────────────────────────────────
  const fetchTotalLikes = useCallback(async () => {
    if (!username) return;
    try {
      const res = await axios.get<number[]>(`/api/UserLikes/my?userId=${encodeURIComponent(username)}`);
      setTotalLikedCount(res.data.length);
    } catch { /* silent */ }
  }, [username]);

  const fetchLikeStatus = useCallback(async (scootyId: number) => {
    if (!username) return;
    try {
      const res = await axios.get<LikeResponse>(`/api/UserLikes/${scootyId}?userId=${encodeURIComponent(username)}`);
      setIsLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch { /* silent */ }
  }, [username]);

  // ── Review summary ────────────────────────────────────────
  const fetchReviewSummary = useCallback(async (scootyId: number) => {
    try {
      const res = await axios.get<{ summary: ReviewSummary | null }>(`/api/VehicleReviews/${scootyId}`);
      setReviewSummary(res.data.summary);
    } catch { /* silent */ }
  }, []);

  // ── Build details URL ─────────────────────────────────────
  const buildDetailsUrl = useCallback((scootyId: string) => {
    let url = `/api/ScootyInventory/details/${scootyId}`;
    if (urlPincode) url += `?pincode=${encodeURIComponent(urlPincode)}`;
    else if (urlCityId) url += `?cityId=${urlCityId}`;
    return url;
  }, [urlPincode, urlCityId]);

  // ── Build nav params ──────────────────────────────────────
  const buildParams = useCallback(() =>
    urlPincode ? `?pincode=${encodeURIComponent(urlPincode)}`
    : urlCityId ? `?cityId=${urlCityId}` : "",
  [urlPincode, urlCityId]);

  // ── Fetch page data ───────────────────────────────────────
  useEffect(() => {
    if (!id) { setError("Vehicle not found."); setLoading(false); return; }

    const fetchVehiclePage = async () => {
      setLoading(true);
      setError("");
      setZoomActive(false);
      setIsLiked(false);
      setLikeCount(0);
      setShowEmiCalc(false);

      try {
        const [detailsRes, inventoryListRes] = await Promise.all([
          axios.get<VehicleDetailsResponseApi>(buildDetailsUrl(id)),
          axios.get<InventoryItemApi[]>("/api/ScootyInventory"),
        ]);

        const vehicleDetails = normalizeImageField(detailsRes.data);
        const inventoryList  = inventoryListRes.data.map(normalizeImageField);

        const currentInventory = inventoryList.find((item) => item.scootyId === Number(id));
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
        void fetchLikeStatus(vehicleDetails.scootyId);
        void fetchTotalLikes();
        void fetchReviewSummary(vehicleDetails.scootyId);
      } catch (e) {
        console.error(e);
        setError("Unable to load vehicle details.");
        setVehicle(null);
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchVehiclePage();
  }, [id, urlPincode, urlCityId, buildDetailsUrl, fetchLikeStatus, fetchTotalLikes, fetchReviewSummary]);

  // ── Auto-refresh likes ────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    void fetchTotalLikes();
    const interval = setInterval(() => void fetchTotalLikes(), 30_000);
    return () => clearInterval(interval);
  }, [fetchTotalLikes, username]);

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
      setTotalLikedCount((prev) => res.data.liked ? prev + 1 : Math.max(0, prev - 1));
    } catch { /* silent */ }
    finally { setLikeLoading(false); }
  };

  // ── Share handler ─────────────────────────────────────────
  const handleShare = async () => {
    if (!vehicle) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${vehicle.modelName} ${vehicle.variantName}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2500);
      }
    } catch { /* user cancelled */ }
  };

  // ── Review submit ─────────────────────────────────────────
  const handleReviewSubmit = async () => {
    if (!vehicle) return;
    if (reviewRating === 0) { setReviewMsg("Please select a star rating."); return; }
    if (reviewTitle.trim().length < 5) { setReviewMsg("Title must be at least 5 characters."); return; }
    if (reviewText.trim().length < 10) { setReviewMsg("Review must be at least 10 characters."); return; }
    setReviewSubmitting(true);
    setReviewMsg("");
    try {
      await axios.post("/api/VehicleReviews", {
        scootyId:          vehicle.scootyId,
        userId:            username || "Anonymous",
        title:             reviewTitle.trim(),
        reviewText:        reviewText.trim(),
        rating:            reviewRating,
        performanceRating: perfRating    || null,
        mileageRating:     mileageRating || null,
        comfortRating:     comfortRating || null,
        maintenanceRating: maintRating   || null,
        featuresRating:    featRating    || null,
      });
      setReviewMsg("✅ Review submitted successfully!");
      void fetchReviewSummary(vehicle.scootyId);
      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewTitle(""); setReviewText(""); setReviewRating(0);
        setPerfRating(0); setMileageRating(0); setComfortRating(0);
        setMaintRating(0); setFeatRating(0); setReviewMsg("");
      }, 1200);
    } catch (err: unknown) {
      const e = err as { response?: { data?: string } };
      setReviewMsg(e.response?.data ?? "Failed to submit review.");
    } finally { setReviewSubmitting(false); }
  };

  // ── EMI enquiry submit ────────────────────────────────────
  const handleEmiSubmit = async () => {
    if (!vehicle) return;
    if (!emiName.trim())   { setEmiMsg("Please enter your full name."); return; }
    if (!emiMobile.trim()) { setEmiMsg("Please enter your mobile number."); return; }
    if (!emiPin.trim())    { setEmiMsg("Please enter your PIN code."); return; }
    setEmiSubmitting(true);
    setEmiMsg("");
    try {
      await axios.post("/api/EmiEnquiry", {
        scootyId:     vehicle.scootyId,
        userId:       username || "guest",
        fullName:     emiName.trim(),
        mobileNumber: emiMobile.trim(),
        pinCode:      emiPin.trim(),
        wantsLoan:    emiWantsLoan ?? false,
      });
      setEmiSuccess(true);
      setEmiEnquiryDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: string } };
      setEmiMsg(e.response?.data ?? "Submission failed. Please try again.");
    } finally { setEmiSubmitting(false); }
  };

  // ── Zoom handlers ─────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img || !vehicle) return;
    const rect = img.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    setZoomStyle({
      backgroundImage:    `url("${img.currentSrc || img.src}")`,
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
    if (idx > 0) navigate(`/vehicle/${availableModels[idx - 1].scootyId}${buildParams()}`);
  };

  const goToNext = () => {
    if (!availableModels.length || !vehicle) return;
    const idx = availableModels.findIndex((x) => x.scootyId === vehicle.scootyId);
    if (idx < availableModels.length - 1) navigate(`/vehicle/${availableModels[idx + 1].scootyId}${buildParams()}`);
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

  // ── Derived stock display ─────────────────────────────────
  const displayStock    = vehicle?.areaStock ?? null;
  const isInStock       = displayStock ? displayStock.stockAvailable : (vehicle?.stockAvailable ?? false);
  const stockQtyDisplay = displayStock
    ? (displayStock.stockAvailable
        ? `${displayStock.stockQuantity} unit${displayStock.stockQuantity > 1 ? "s" : ""} in ${displayStock.areaName}`
        : `Out of stock in ${displayStock.areaName}`)
    : (vehicle?.stockAvailable ? "In Stock" : "Out of Stock");

  // ── Specs card grid data ──────────────────────────────────
  const specsCardItems = vehicle ? [
    { icon: "⚡", label: "Max Power",     value: vehicle.maxPowerKw      ? `${vehicle.maxPowerKw} kW`   : "—" },
    { icon: "🔋", label: "Battery",       value: vehicle.batterySpecs    ?? "—" },
    { icon: "📍", label: "Range",         value: vehicle.rangeKm         ? `${vehicle.rangeKm} km`      : "—" },
    { icon: "⏱️", label: "Charging Time", value: vehicle.chargingTimeHrs ?? "—" },
    { icon: "🛞", label: "Wheel Size",    value: vehicle.wheelSize        ?? "—" },
    { icon: "🔩", label: "Wheel Type",    value: vehicle.wheelType        ?? "—" },
    { icon: "🛑", label: "Brakes Front",  value: vehicle.brakeFront       ?? "—" },
    { icon: "🛑", label: "Brakes Rear",   value: vehicle.brakeRear        ?? "—" },
    { icon: "🔐", label: "Braking Type",  value: vehicle.brakingType      ?? "—" },
    { icon: "🚀", label: "Starting",      value: vehicle.startingType     ?? "—" },
    { icon: "🎛️", label: "Speedometer",   value: vehicle.speedometer      ?? "—" },
    { icon: "🎨", label: "Colour",        value: vehicle.colourName       ?? "—" },
  ] : [];

  // ── Great things — derived from actual vehicle specs ──────
  const greatThings = vehicle ? [
    {
      icon: "⚡",
      name: "Max Power",
      desc: vehicle.maxPowerKw
        ? `Delivers ${vehicle.maxPowerKw} kW of powerful, silent electric performance.`
        : "Powerful electric motor for smooth city rides.",
    },
    {
      icon: "🔋",
      name: "Battery",
      desc: vehicle.batterySpecs
        ? `Equipped with a ${vehicle.batterySpecs} battery for long-lasting rides.`
        : "High-capacity battery for extended range.",
    },
    {
      icon: "📍",
      name: "Range",
      desc: vehicle.rangeKm
        ? `Ride up to ${vehicle.rangeKm} km on a single full charge.`
        : "Impressive range on a single charge.",
    },
    {
      icon: "⏱️",
      name: "Charging Time",
      desc: vehicle.chargingTimeHrs
        ? `Fully charges in just ${vehicle.chargingTimeHrs} — plug in overnight and go.`
        : "Convenient home charging support.",
    },
    {
      icon: "🛑",
      name: "Braking System",
      desc: (() => {
        const front = vehicle.brakeFront  ?? "";
        const rear  = vehicle.brakeRear   ?? "";
        const type  = vehicle.brakingType ?? "";
        if (front && rear && type) return `${front} front & ${rear} rear with ${type} for superior safety.`;
        if (front && rear)         return `${front} front & ${rear} rear brakes for confident stopping.`;
        if (type)                  return `${type} braking system for reliable, safe stopping power.`;
        return "Advanced braking system for safe, confident rides.";
      })(),
    },
    {
      icon: "🛞",
      name: "Wheels",
      desc: (() => {
        const size = vehicle.wheelSize ?? "";
        const type = vehicle.wheelType ?? "";
        if (size && type) return `${size} ${type} wheels for a stable, comfortable ride.`;
        if (size)         return `${size} wheels built for urban comfort and grip.`;
        if (type)         return `${type} wheels for improved handling and style.`;
        return "Purpose-built wheels for urban riding comfort.";
      })(),
    },
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
          {username && (
            <div
              className="vd-nav-likes"
              onClick={() => navigate("/my-likes")}
              title={`${totalLikedCount} liked`}
            >
              <svg viewBox="0 0 24 24"
                fill={totalLikedCount > 0 ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {totalLikedCount > 0 && <span className="vd-nav-likes-badge">{totalLikedCount}</span>}
            </div>
          )}

          <div className="vd-user-pill">
            <div className="desktop-avatar">{initial}</div>
            <div className="desktop-user-info">
              <span className="desktop-user-name">{username}</span>
              <span className="desktop-user-role">{role}</span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <Tooltip text="Dashboard">
            <button className="vd-icon-btn vd-btn-dashboard" onClick={goToDashboard}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
              </svg>
            </button>
          </Tooltip>

          <Tooltip text="Prev Vehicle">
            <button className="vd-icon-btn vd-btn-prev" onClick={goToPrevious} disabled={isPrevDisabled}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </Tooltip>

          <Tooltip text="Next Vehicle">
            <button className="vd-icon-btn vd-btn-next" onClick={goToNext} disabled={isNextDisabled}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* ═══ MAIN ════════════════════════════════════════════ */}
      <main className="vehicle-details-main">

        {loading ? (
          <section className="vehicle-details-state-card">
            <h2>Loading…</h2><p>Please wait.</p>
          </section>

        ) : error ? (
          <section className="vehicle-details-state-card vehicle-details-state-card-error">
            <h2>{error}</h2>
          </section>

        ) : vehicle ? (
          <section className="vehicle-details-layout">

            {/* ── LEFT COLUMN ───────────────────────────────── */}
            <div className="vehicle-details-gallery-column">

              <p className="vehicle-details-breadcrumbs">
                Home / BGauss / {vehicle.modelName} / {vehicle.variantName}
                {displayStock && (
                  <span className="vd-breadcrumb-area">
                    {" · "}📍 {displayStock.areaName} ({displayStock.pincode})
                  </span>
                )}
              </p>

              {/* Action row */}
              <div className="vd-action-buttons">
                <button
                  className={`vd-like-btn${isLiked ? " liked" : ""}`}
                  onClick={handleLike}
                  disabled={likeLoading || !username}
                  title={isLiked ? "Unlike" : "Like"}
                >
                  <svg viewBox="0 0 24 24"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {likeCount > 0 && <span className="vd-like-count">{likeCount}</span>}
                </button>

                <button className="vd-share-btn" onClick={handleShare}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  <span>Share</span>
                </button>

                <button
                  className="vd-road-price-btn"
                  onClick={() => navigate(`/road-price/${vehicle.scootyId}`)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>On Road Price</span>
                </button>

                {shareMsg && <span className="vd-share-msg">✓ {shareMsg}</span>}
              </div>

              {/* Image + Zoom */}
              <div className="vd-zoom-wrapper">
                <div className="vd-zoom-source"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}>
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
                  className={`vd-zoom-pane${zoomActive ? " vd-zoom-pane-active" : ""}`}
                  style={zoomActive ? zoomStyle : {}}
                >
                  {!zoomActive && (
                    <div className="vd-zoom-placeholder">
                      <span>🔍</span><p>Hover over image to zoom</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews bar */}
              <div className="vd-reviews-bar">
                <div className="vd-reviews-bar-left">
                  {reviewSummary ? (
                    <>
                      <span className="vd-avg-score">{reviewSummary.averageRating}/5</span>
                      <MiniStars value={reviewSummary.averageRating} />
                      <span
                        className="vd-review-count"
                        onClick={() => navigate(`/reviews/${vehicle.scootyId}`)}
                        style={{ cursor: "pointer" }}
                      >
                        {reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? "s" : ""}
                      </span>
                    </>
                  ) : (
                    <span className="vd-review-count no-reviews">No reviews yet</span>
                  )}
                </div>
                <div className="vd-reviews-bar-right">
                  <button className="vd-write-review-btn" onClick={() => setReviewModalOpen(true)}>
                    ✏️ Write a Review
                  </button>
                  {reviewSummary && reviewSummary.totalReviews > 0 && (
                    <button className="vd-see-reviews-btn"
                      onClick={() => navigate(`/reviews/${vehicle.scootyId}`)}>
                      See All Reviews →
                    </button>
                  )}
                </div>
              </div>

              {/* ── SPECS CARD GRID ── */}
              <section className="vd-specs-card-section">
                <div className="vehicle-details-sidebar-head">
                  <h3>Specifications</h3>
                </div>
                <div className="vd-specs-card-grid">
                  {specsCardItems.map((spec) => (
                    <div className="vd-spec-card" key={spec.label}>
                      <span className="vd-spec-card-icon">{spec.icon}</span>
                      <span className="vd-spec-card-label">{spec.label}</span>
                      <strong className="vd-spec-card-value">{spec.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

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
                        onClick={() => navigate(`/vehicle/${item.scootyId}${buildParams()}`)}
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

            {/* ── RIGHT SIDEBAR ─────────────────────────────── */}
            <aside className="vehicle-details-sidebar">
              <div className="vehicle-details-sidebar-scroll">

                <p className="vehicle-details-sidebar-title">
                  Selected Colour: <strong>{vehicle.colourName ?? "Not specified"}</strong>
                </p>

                <section className="vehicle-details-sidebar-block">
                  <h2>{vehicle.modelName}</h2>
                  <p className="vehicle-details-sidebar-subtitle">Variant: {vehicle.variantName}</p>

                  <div className="vehicle-details-sidebar-rating">
                    <span className={isInStock ? "" : "out-of-stock-chip"}>
                      {isInStock ? "In Stock" : "Out of Stock"}
                    </span>
                    <span>{vehicle.rangeKm ? `${vehicle.rangeKm} km range` : "Range on request"}</span>
                  </div>

                  {/* Area stock banner */}
                  {displayStock && (
                    <div className="vd-area-stock-banner">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div>
                        <span className="vd-area-stock-name">
                          {displayStock.cityName} · {displayStock.areaName}
                        </span>
                        <span className={`vd-area-stock-qty ${displayStock.stockAvailable ? "in" : "out"}`}>
                          {displayStock.stockAvailable
                            ? `${displayStock.stockQuantity} unit${displayStock.stockQuantity > 1 ? "s" : ""} available`
                            : "Out of stock in this area"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="vehicle-details-sidebar-price">
                    <strong>{formatCurrency(vehicle.price)}</strong>
                    <p>{vehicle.batterySpecs ?? "Battery details unavailable"}</p>
                  </div>
                </section>

                {/* ── EMI BUTTONS ── */}
                <div className="vd-emi-btn-row">

                  <button className="vd-emi-offer-btn" onClick={openEmiModal}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    Get EMI Offers
                  </button>

                  {emiEnquiryDone ? (
                    <button
                      className="vd-emi-calc-btn"
                      onClick={() => setShowEmiCalc(p => !p)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2"/>
                        <line x1="8" y1="6" x2="16" y2="6"/>
                        <line x1="8" y1="10" x2="16" y2="10"/>
                        <line x1="8" y1="14" x2="12" y2="14"/>
                      </svg>
                      {showEmiCalc ? "Hide EMI" : "Calculate EMI"}
                    </button>
                  ) : (
                    <Tooltip text="Submit EMI enquiry to unlock">
                      <button
                        className="vd-emi-calc-btn vd-emi-calc-btn--locked"
                        onClick={openEmiModal}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Calculate EMI
                      </button>
                    </Tooltip>
                  )}
                </div>

                {/* Hint text when locked */}
                {!emiEnquiryDone && (
                  <p className="vd-emi-locked-hint">
                    Submit an EMI enquiry to unlock the calculator.
                  </p>
                )}

                {/* EMI Calculator — unlocked + toggled */}
                {emiEnquiryDone && showEmiCalc && (
                  <EmiCalculator
                    scootyId={vehicle.scootyId}
                    modelName={vehicle.modelName}
                    variantName={vehicle.variantName}
                    basePrice={vehicle.price}
                  />
                )}

                {/* ── GREAT THINGS ABOUT THIS SCOOTER ── */}
                  {greatThings.length > 0 && (
                    <div className="vd-great-things">
                      <p className="vd-great-things-title">Great things about this scooter</p>
                      <div className="vd-great-things-grid">
                        {greatThings.map((item) => (
                          <div className="vd-great-thing-item" key={item.name}>
                            <div className="vd-great-thing-icon">{item.icon}</div>
                            {/* CRITICAL: Text Wrapper for proper alignment */}
                            <div className="vd-great-thing-content">
                              <p className="vd-great-thing-name">{item.name}</p>
                              <p className="vd-great-thing-desc">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>{/* end sidebar-scroll */}
            </aside>

          </section>
        ) : null}
      </main>

      {/* ═══ REVIEW MODAL ════════════════════════════════════ */}
      {reviewModalOpen && (
        <>
          <div className="vd-modal-overlay" onClick={() => setReviewModalOpen(false)} />
          <div className="vd-modal vd-review-modal">
            <div className="vd-modal-header">
              <h3>Write Your Review</h3>
              <button className="vd-modal-close" onClick={() => setReviewModalOpen(false)}>✕</button>
            </div>
            <div className="vd-modal-body">

              <div className="vd-review-vehicle-tag">
                <img
                  src={resolveImageSrc(vehicle?.imageUrl ?? null)}
                  alt=""
                  onError={(e) => { e.currentTarget.src = noImage; }}
                />
                <span>Reviewing: <strong>{vehicle?.modelName} {vehicle?.variantName}</strong></span>
              </div>

              <div className="vd-review-field">
                <label>Overall Rating <span className="req">*</span></label>
                <StarRating value={reviewRating} onChange={setReviewRating} size={32} />
              </div>

              <div className="vd-review-field">
                <label>Review Title <span className="req">*</span></label>
                <input className="vd-review-input"
                  placeholder="e.g. Innovative and Powerful"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={200} />
                {reviewTitle.length > 0 && reviewTitle.length < 5 && (
                  <span className="vd-review-hint">Please enter minimum 5 characters</span>
                )}
              </div>

              <div className="vd-review-field">
                <label>Your Review <span className="req">*</span></label>
                <textarea className="vd-review-textarea"
                  placeholder="Share your experience with this vehicle…"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={2000} rows={4} />
                {reviewText.length > 0 && reviewText.length < 10 && (
                  <span className="vd-review-hint">Please enter minimum 10 characters</span>
                )}
              </div>

              <div className="vd-review-categories">
                <p className="vd-review-cat-title">Rate by Category (optional)</p>
                <div className="vd-review-cat-grid">
                  {[
                    { label: "Performance", val: perfRating,    set: setPerfRating },
                    { label: "Mileage",     val: mileageRating, set: setMileageRating },
                    { label: "Comfort",     val: comfortRating, set: setComfortRating },
                    { label: "Maintenance", val: maintRating,   set: setMaintRating },
                    { label: "Features",    val: featRating,    set: setFeatRating },
                  ].map((cat) => (
                    <div className="vd-cat-row" key={cat.label}>
                      <span>{cat.label}</span>
                      <StarRating value={cat.val} onChange={cat.set} size={18} />
                    </div>
                  ))}
                </div>
              </div>

              {reviewMsg && (
                <div className={`vd-review-msg ${reviewMsg.startsWith("✅") ? "success" : "error"}`}>
                  {reviewMsg}
                </div>
              )}

              <div className="vd-modal-actions">
                <button className="vd-modal-btn-cancel" onClick={() => setReviewModalOpen(false)}>Cancel</button>
                <button className="vd-modal-btn-submit" onClick={handleReviewSubmit} disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Submitting…" : "Submit →"}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ═══ EMI ENQUIRY MODAL ═══════════════════════════════ */}
      {emiModalOpen && (
        <>
          <div className="vd-modal-overlay"
            onClick={() => !emiSubmitting && setEmiModalOpen(false)} />
          <div className="vd-modal vd-emi-modal">
            <div className="vd-modal-header">
              <h3>Get EMI Offers</h3>
              <button className="vd-modal-close" onClick={() => setEmiModalOpen(false)}>✕</button>
            </div>
            <div className="vd-modal-body">

              {emiSuccess ? (
                <div className="vd-emi-success">
                  <div className="vd-emi-success-icon">✅</div>
                  <h3>Enquiry Submitted!</h3>
                  <p>Our team will contact you shortly with EMI options.</p>
                  <p className="vd-emi-unlock-note">
                    EMI Calculator is now unlocked for you.
                  </p>
                  <button
                    className="vd-modal-btn-submit"
                    onClick={() => {
                      setEmiModalOpen(false);
                      setShowEmiCalc(true);
                    }}
                  >
                    Calculate EMI Now →
                  </button>
                </div>
              ) : (
                <>
                  <div className="vd-emi-voucher-banner">
                    <div className="vd-emi-voucher-icon">₹</div>
                    <div>
                      <p className="vd-emi-voucher-title">Get Assured Voucher</p>
                      <p className="vd-emi-voucher-sub">Rs 500 Cashback on Submission</p>
                    </div>
                  </div>

                  <div className="vd-emi-benefits">
                    <span>🤝 Connect to the Right Dealer</span>
                    <span>👥 Be a part of 10 lakh+ Community</span>
                  </div>

                  <p className="vd-emi-sub">
                    Get EMI Offers On {vehicle?.modelName} {vehicle?.variantName}
                  </p>
                  <p className="vd-emi-note">
                    We only ask these once and your details are safe with us.
                  </p>

                  <div className="vd-emi-form">
                    <div className="vd-emi-field">
                      <input className="vd-emi-input" placeholder="PIN Code"
                        value={emiPin}
                        onChange={(e) => setEmiPin(e.target.value)}
                        maxLength={6} />
                    </div>
                    <div className="vd-emi-field">
                      <input className="vd-emi-input"
                        placeholder="Full Name (as per PAN / Aadhaar)"
                        value={emiName}
                        onChange={(e) => setEmiName(e.target.value)} />
                    </div>
                    <div className="vd-emi-field">
                      <input className="vd-emi-input" placeholder="Mobile Number"
                        value={emiMobile}
                        onChange={(e) => setEmiMobile(e.target.value)}
                        maxLength={10} type="tel" />
                    </div>
                    <div className="vd-emi-loan-row">
                      <p>Want to Apply for Two Wheeler Loan at Lowest Interest Rates?</p>
                      <div className="vd-emi-radio-group">
                        <label className="vd-emi-radio">
                          <input type="radio" name="loan"
                            checked={emiWantsLoan === true}
                            onChange={() => setEmiWantsLoan(true)} />
                          Yes
                        </label>
                        <label className="vd-emi-radio">
                          <input type="radio" name="loan"
                            checked={emiWantsLoan === false}
                            onChange={() => setEmiWantsLoan(false)} />
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {emiMsg && (
                    <div className={`vd-review-msg ${emiMsg.startsWith("✅") ? "success" : "error"}`}>
                      {emiMsg}
                    </div>
                  )}

                  <button className="vd-emi-submit-btn"
                    onClick={handleEmiSubmit} disabled={emiSubmitting}>
                    {emiSubmitting ? "Submitting…" : "Get EMI offers →"}
                  </button>
                </>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
}