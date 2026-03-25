import "./RoadPrice.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";


const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "";

// ── Types ──────────────────────────────────────────────────────
interface CityOption {
  id:        number;
  cityName:  string;
  stateName: string;
  isPopular: boolean;
}

interface RoadPriceData {
  scootyId:        number;
  modelName:       string;
  variantName:     string;
  colourName:      string | null;
  cityId:          number;
  cityName:        string;
  stateName:       string;
  exShowroomPrice: number;
  rtoCharges:      number;
  insuranceAmount: number;
  otherCharges:    number;
  onRoadPrice:     number;
  validFrom:       string;
}

interface VehicleInfo {
  scootyId:       number;
  modelName:      string;
  variantName:    string;
  colourName:     string | null;
  price:          number | null;
  rangeKm:        number | null;
  imageUrl:       string | null;
  stockAvailable: boolean;
}

const CITY_ICONS: Record<string, string> = {
  "New Delhi":  "🏛️",
  "Mumbai":     "🌊",
  "Bengaluru":  "🌳",
  "Chennai":    "🏖️",
  "Kolkata":    "🎭",
  "Pune":       "🏔️",
  "Hyderabad":  "💎",
  "Ahmedabad":  "🦁",
};

const resolveImageSrc = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

const formatLakh = (val: number) => {
  const lakh = val / 100000;
  return `₹ ${lakh.toFixed(2)} Lakh`;
};

export default function RoadPrice() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vehicle,     setVehicle]     = useState<VehicleInfo | null>(null);
  const [allCities,   setAllCities]   = useState<CityOption[]>([]);
  const [priceData,   setPriceData]   = useState<RoadPriceData | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);

  const [citySearch,  setCitySearch]  = useState("");
  const [showCityModal, setShowCityModal] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError,  setPriceError]  = useState("");
  const [loadingPage, setLoadingPage] = useState(true);

  const modalRef    = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  const username = localStorage.getItem("username") ?? "";
  const role     = localStorage.getItem("role")     ?? "";
  const initial  = username.trim().charAt(0).toUpperCase() || "?";

  // ── Fetch vehicle info ────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await axios.get<VehicleInfo>(`/api/ScootyInventory/details/${id}`);
        setVehicle(res.data);
      } catch { /* silent */ }
      finally { setLoadingPage(false); }
    };
    void load();
  }, [id]);

  // ── Fetch all cities ──────────────────────────────────────
  const fetchCities = useCallback(async (search?: string) => {
    try {
      const url = search
        ? `/api/RoadPrice/cities?search=${encodeURIComponent(search)}`
        : `/api/RoadPrice/cities`;
      const res = await axios.get<CityOption[]>(url);
      setAllCities(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void fetchCities(); }, [fetchCities]);

  // ── Fetch price for selected city ─────────────────────────
  const fetchPrice = useCallback(async (cityId: number) => {
    if (!id) return;
    setLoadingPrice(true);
    setPriceError("");
    setPriceData(null);
    try {
      const res = await axios.get<RoadPriceData>(`/api/RoadPrice/${id}/city/${cityId}`);
      setPriceData(res.data);
    } catch {
      setPriceError("Road price not available for this city yet.");
    } finally { setLoadingPrice(false); }
  }, [id]);

  // ── City search debounce ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => void fetchCities(citySearch || undefined), 300);
    return () => clearTimeout(t);
  }, [citySearch, fetchCities]);

  // ── Close modal on outside click ──────────────────────────
  useEffect(() => {
    if (!showCityModal) return;
    const close = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node))
        setShowCityModal(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [showCityModal]);

  // Focus search input when modal opens
  useEffect(() => {
    if (showCityModal) setTimeout(() => searchRef.current?.focus(), 100);
  }, [showCityModal]);

  const handleCitySelect = (city: CityOption) => {
    setSelectedCity(city);
    setShowCityModal(false);
    setCitySearch("");
    void fetchPrice(city.id);
  };

  const popularCities = allCities.filter((c) => c.isPopular);
  const otherCities   = allCities.filter((c) => !c.isPopular);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="rp-page">

      {/* NAVBAR */}
      <header className="rp-navbar">
        <div className="rp-nav-left">
          <img src={logo} className="rp-nav-logo" alt="BGauss" />
          <div className="rp-nav-brand">
            <span className="rp-brand-name">BGauss Portal</span>
            <span className="rp-brand-page">On Road Price</span>
          </div>
        </div>

        <div className="rp-nav-right">
          <div className="rp-user-pill">
            <div className="rp-avatar">{initial}</div>
            <div className="rp-user-info">
              <span className="rp-user-name">{username}</span>
              <span className="rp-user-role">{role}</span>
            </div>
          </div>

          <button className="rp-icon-btn rp-btn-back"
            onClick={() => navigate(`/vehicle/${id}`)}
            aria-label="Back" data-tip="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <button className="rp-icon-btn rp-btn-dashboard"
            onClick={() => navigate("/dashboard")}
            aria-label="Dashboard" data-tip="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
            </svg>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="rp-main">

        {loadingPage ? (
          <div className="rp-state-card">
            <div className="rp-spinner" />
            <p>Loading vehicle information…</p>
          </div>
        ) : !vehicle ? (
          <div className="rp-state-card rp-state-error">
            <span>⚠️</span>
            <p>Vehicle not found.</p>
            <button onClick={() => navigate("/dashboard")}>← Dashboard</button>
          </div>
        ) : (
          <div className="rp-layout">

            {/* LEFT: vehicle card */}
            <div className="rp-vehicle-card">
              <img
                src={resolveImageSrc(vehicle.imageUrl)}
                alt={vehicle.modelName}
                className="rp-vehicle-img"
                onError={(e) => { e.currentTarget.src = noImage; }}
              />
              <div className="rp-vehicle-info">
                <h2 className="rp-vehicle-model">{vehicle.modelName}</h2>
                <p className="rp-vehicle-variant">{vehicle.variantName}</p>
                {vehicle.price && (
                  <p className="rp-vehicle-base-price">
                    Ex-Showroom from <strong>{formatLakh(vehicle.price)}</strong>
                  </p>
                )}
                {vehicle.rangeKm && (
                  <span className="rp-vehicle-range">🛣 {vehicle.rangeKm} km range</span>
                )}
                <span className={`rp-stock ${vehicle.stockAvailable ? "in" : "out"}`}>
                  {vehicle.stockAvailable ? "✓ In Stock" : "✕ Out of Stock"}
                </span>
              </div>
            </div>

            {/* RIGHT: price panel */}
            <div className="rp-price-panel">

              {/* City selector */}
              <div className="rp-city-row">
                <div className="rp-city-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  On Road Price in
                </div>
                <button
                  className="rp-city-btn"
                  onClick={() => setShowCityModal(true)}
                >
                  <strong>{selectedCity ? selectedCity.cityName : "Select City"}</strong>
                  <span className="rp-city-change">Change City ›</span>
                </button>
              </div>

              {/* Price breakdown */}
              {!selectedCity && (
                <div className="rp-choose-prompt">
                  <div className="rp-choose-icon">📍</div>
                  <h3>Select your city</h3>
                  <p>Choose a city to see the on-road price including RTO, insurance and other charges.</p>
                  <button className="rp-choose-btn" onClick={() => setShowCityModal(true)}>
                    Choose City
                  </button>
                </div>
              )}

              {selectedCity && loadingPrice && (
                <div className="rp-price-loading">
                  <div className="rp-spinner" />
                  <p>Fetching price for {selectedCity.cityName}…</p>
                </div>
              )}

              {selectedCity && !loadingPrice && priceError && (
                <div className="rp-price-unavailable">
                  <span className="rp-unavail-icon">📭</span>
                  <h3>Price not available</h3>
                  <p>{priceError}</p>
                  <p className="rp-unavail-sub">
                    Contact your nearest BGauss dealer for pricing in {selectedCity.cityName}.
                  </p>
                </div>
              )}

              {selectedCity && !loadingPrice && priceData && (
                <div className="rp-breakdown">

                  <div className="rp-breakdown-header">
                    <h3>
                      {priceData.modelName} {priceData.variantName}
                      <span className="rp-breakdown-city"> — {priceData.cityName}</span>
                    </h3>
                    <span className="rp-onroad-big">{formatLakh(priceData.onRoadPrice)}</span>
                    <span className="rp-onroad-label">On Road Price in {priceData.cityName}</span>
                  </div>

                  <div className="rp-breakdown-rows">
                    <div className="rp-br-row">
                      <span>Ex-Showroom Price</span>
                      <strong>{formatINR(priceData.exShowroomPrice)}</strong>
                    </div>
                    <div className="rp-br-row">
                      <span>RTO + Others</span>
                      <strong>{priceData.rtoCharges > 0 ? formatINR(priceData.rtoCharges) : "NA"}</strong>
                    </div>
                    <div className="rp-br-row">
                      <span>Insurance</span>
                      <strong>{priceData.insuranceAmount > 0 ? formatINR(priceData.insuranceAmount) : "NA"}</strong>
                    </div>
                    {priceData.otherCharges > 0 && (
                      <div className="rp-br-row">
                        <span>Other Charges</span>
                        <strong>{formatINR(priceData.otherCharges)}</strong>
                      </div>
                    )}
                    <div className="rp-br-row rp-br-total">
                      <span>On Road Price in {priceData.cityName}</span>
                      <strong>{formatINR(priceData.onRoadPrice)}</strong>
                    </div>
                  </div>

                  <p className="rp-valid-note">
                    * Price valid as of {new Date(priceData.validFrom).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}. Contact dealer for current offers.
                  </p>

                </div>
              )}

            </div>{/* end price panel */}

          </div>
        )}

      </main>

      {/* CITY MODAL */}
      {showCityModal && (
        <>
          <div className="rp-modal-overlay" onClick={() => setShowCityModal(false)} />
          <div className="rp-modal" ref={modalRef}>

            <div className="rp-modal-header">
              <h3>Choose Your City</h3>
              <button className="rp-modal-close" onClick={() => setShowCityModal(false)}>✕</button>
            </div>

            <div className="rp-modal-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search your city…"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
              />
              {citySearch && (
                <button className="rp-search-clear" onClick={() => setCitySearch("")}>✕</button>
              )}
            </div>

            <div className="rp-modal-body">

              {/* Popular cities grid */}
              {!citySearch && popularCities.length > 0 && (
                <div className="rp-popular-section">
                  <p className="rp-modal-section-title">Popular Cities</p>
                  <div className="rp-popular-grid">
                    {popularCities.map((city) => (
                      <button
                        key={city.id}
                        className={`rp-popular-city${selectedCity?.id === city.id ? " selected" : ""}`}
                        onClick={() => handleCitySelect(city)}
                      >
                        <span className="rp-city-monument">
                          {CITY_ICONS[city.cityName] ?? "🏙️"}
                        </span>
                        <span className="rp-city-name">{city.cityName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Other cities list */}
              {(!citySearch ? otherCities : allCities).length > 0 && (
                <div className="rp-other-section">
                  {!citySearch && <p className="rp-modal-section-title">All Cities</p>}
                  <div className="rp-city-list">
                    {(!citySearch ? otherCities : allCities).map((city) => (
                      <button
                        key={city.id}
                        className={`rp-city-list-item${selectedCity?.id === city.id ? " selected" : ""}`}
                        onClick={() => handleCitySelect(city)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{city.cityName}</span>
                        <span className="rp-city-state">{city.stateName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allCities.length === 0 && citySearch && (
                <div className="rp-city-empty">
                  <span>🔍</span>
                  <p>No cities match "<strong>{citySearch}</strong>"</p>
                </div>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
}