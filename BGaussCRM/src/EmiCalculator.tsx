import { useState, useEffect, useCallback } from "react";
import "./EmiCalculator.css";
import axios from "axios";

// ── Types ──────────────────────────────────────────────────────
interface CityOption {
  id:        number;
  cityName:  string;
  stateName: string;
  isPopular: boolean;
}

interface RoadPriceData {
  exShowroomPrice: number;
  rtoCharges:      number;
  insuranceAmount: number;
  otherCharges:    number;
  onRoadPrice:     number;
  cityName:        string;
}

interface Props {
  scootyId:   number;
  modelName:  string;
  variantName: string;
  basePrice:  number | null;   // ex-showroom from inventory
}

// ── EMI formula ────────────────────────────────────────────────
function calcEmi(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(val);

const DURATIONS = [1, 2, 3, 4, 5, 6, 7];
const MIN_RATE = 8;
const MAX_RATE = 20;
const MIN_DOWN_PCT = 0.1; // 10% minimum down payment

export default function EmiCalculator({ scootyId, modelName, variantName, basePrice }: Props) {

  // ── City & road price ─────────────────────────────────────
  const [cities,       setCities]       = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [roadPrice,    setRoadPrice]    = useState<RoadPriceData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [showCityDrop, setShowCityDrop] = useState(false);
  const [citySearch,   setCitySearch]   = useState("");

  // ── Calculator state ──────────────────────────────────────
  const onRoadTotal = roadPrice?.onRoadPrice ?? basePrice ?? 0;
  const minDown     = Math.round(onRoadTotal * MIN_DOWN_PCT);
  const maxDown     = Math.round(onRoadTotal * 0.9);

  const [downPayment,   setDownPayment]   = useState(minDown);
  const [duration,      setDuration]      = useState(3);
  const [interestRate,  setInterestRate]  = useState(10);
  const [showBreakup,   setShowBreakup]   = useState(false);

  // Reset down payment when price changes
  useEffect(() => {
    setDownPayment(Math.round(onRoadTotal * 0.2));
  }, [onRoadTotal]);

  // ── Fetch cities ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get<CityOption[]>("/api/RoadPrice/cities");
        setCities(res.data);
      } catch { /* silent */ }
    };
    void load();
  }, []);

  // ── Fetch road price for city ─────────────────────────────
  const fetchRoadPrice = useCallback(async (cityId: number) => {
    setLoadingPrice(true);
    setRoadPrice(null);
    try {
      const res = await axios.get<RoadPriceData>(`/api/RoadPrice/${scootyId}/city/${cityId}`);
      setRoadPrice(res.data);
    } catch { setRoadPrice(null); }
    finally { setLoadingPrice(false); }
  }, [scootyId]);

  const handleCitySelect = (city: CityOption) => {
    setSelectedCity(city);
    setShowCityDrop(false);
    setCitySearch("");
    void fetchRoadPrice(city.id);
  };

  // ── EMI calculation ───────────────────────────────────────
  const loanAmount  = Math.max(0, onRoadTotal - downPayment);
  const emi         = calcEmi(loanAmount, interestRate, duration);
  const totalAmount = emi * duration * 12;
  const totalInterest = totalAmount - loanAmount;

  const filteredCities = citySearch
    ? cities.filter((c) => c.cityName.toLowerCase().includes(citySearch.toLowerCase()))
    : cities;

  const popularCities = filteredCities.filter((c) => c.isPopular);
  const otherCities   = filteredCities.filter((c) => !c.isPopular);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="emi-calc">

      {/* Header */}
      <div className="emi-calc-header">
        <div className="emi-calc-title-row">
          <h3 className="emi-calc-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            EMI Calculator
          </h3>

          {/* City selector */}
          <div className="emi-city-wrap">
            <button className="emi-city-btn" onClick={() => setShowCityDrop((p) => !p)}>
              {loadingPrice ? (
                <span className="emi-city-loading">Loading…</span>
              ) : selectedCity ? (
                <span>{selectedCity.cityName}</span>
              ) : (
                <span className="emi-city-placeholder">Select City</span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showCityDrop && (
              <div className="emi-city-dropdown">
                <div className="emi-city-search-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    autoFocus
                    placeholder="Search city…"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                </div>
                <div className="emi-city-list">
                  {popularCities.length > 0 && (
                    <>
                      <div className="emi-city-group-label">Popular</div>
                      {popularCities.map((c) => (
                        <button key={c.id} className={`emi-city-item${selectedCity?.id === c.id ? " active" : ""}`} onClick={() => handleCitySelect(c)}>
                          📍 {c.cityName}
                        </button>
                      ))}
                    </>
                  )}
                  {otherCities.length > 0 && (
                    <>
                      {popularCities.length > 0 && <div className="emi-city-group-label">All Cities</div>}
                      {otherCities.map((c) => (
                        <button key={c.id} className={`emi-city-item${selectedCity?.id === c.id ? " active" : ""}`} onClick={() => handleCitySelect(c)}>
                          {c.cityName}
                        </button>
                      ))}
                    </>
                  )}
                  {filteredCities.length === 0 && (
                    <div className="emi-city-empty">No cities found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle + price tag */}
        <div className="emi-vehicle-tag">
          <span className="emi-vehicle-name">{modelName} {variantName}</span>
          {roadPrice ? (
            <span className="emi-price-tag">On Road: ₹ {formatINR(onRoadTotal)}</span>
          ) : (
            <span className="emi-price-tag base">Ex-Showroom: {basePrice ? `₹ ${formatINR(basePrice)}` : "—"}</span>
          )}
        </div>

        {/* Road price breakdown (if city selected) */}
        {roadPrice && (
          <div className="emi-road-breakdown">
            <div className="emi-rdb-row"><span>Ex-Showroom</span><span>₹ {formatINR(roadPrice.exShowroomPrice)}</span></div>
            <div className="emi-rdb-row"><span>RTO + Others</span><span>{roadPrice.rtoCharges > 0 ? `₹ ${formatINR(roadPrice.rtoCharges)}` : "NA"}</span></div>
            <div className="emi-rdb-row"><span>Insurance</span><span>{roadPrice.insuranceAmount > 0 ? `₹ ${formatINR(roadPrice.insuranceAmount)}` : "NA"}</span></div>
            {roadPrice.otherCharges > 0 && <div className="emi-rdb-row"><span>Other</span><span>₹ {formatINR(roadPrice.otherCharges)}</span></div>}
            <div className="emi-rdb-row total"><span>On Road Price ({roadPrice.cityName})</span><span>₹ {formatINR(roadPrice.onRoadPrice)}</span></div>
          </div>
        )}

        {selectedCity && !roadPrice && !loadingPrice && (
          <div className="emi-no-road-price">
            Road price not available for {selectedCity.cityName}. Using ex-showroom price.
          </div>
        )}
      </div>

      {/* Calculator body */}
      <div className="emi-calc-body">

        {/* Down Payment */}
        <div className="emi-field">
          <div className="emi-field-header">
            <label className="emi-label">Down Payment</label>
            <div className="emi-value-box">₹ {formatINR(downPayment)}</div>
          </div>
          <input
            type="range"
            className="emi-slider"
            min={minDown}
            max={maxDown}
            step={1000}
            value={Math.min(downPayment, maxDown)}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            style={{ '--pct': `${((downPayment - minDown) / (maxDown - minDown)) * 100}%` } as React.CSSProperties}
          />
          <div className="emi-slider-labels">
            <span>₹ {formatINR(minDown)}</span>
            <span>₹ {formatINR(maxDown)}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="emi-field">
          <label className="emi-label">Duration <span className="emi-label-sub">in years</span></label>
          <div className="emi-duration-pills">
            {DURATIONS.map((y) => (
              <button
                key={y}
                className={`emi-duration-pill${duration === y ? " active" : ""}`}
                onClick={() => setDuration(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Interest Rate */}
        <div className="emi-field">
          <div className="emi-field-header">
            <label className="emi-label">Interest Rate <span className="emi-label-sub">(Per Annum)</span></label>
            <div className="emi-value-box">{interestRate}%</div>
          </div>
          <input
            type="range"
            className="emi-slider"
            min={MIN_RATE}
            max={MAX_RATE}
            step={0.5}
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            style={{ '--pct': `${((interestRate - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100}%` } as React.CSSProperties}
          />
          <div className="emi-slider-labels">
            <span>{MIN_RATE}</span>
            <span>{MAX_RATE}</span>
          </div>
        </div>

        {/* EMI result */}
        <div className="emi-result-card">
          <div className="emi-result-left">
            <span className="emi-result-label">Your Monthly EMI</span>
            <span className="emi-result-amount">₹ {formatINR(emi)}</span>
          </div>
          <button className="emi-breakup-btn" onClick={() => setShowBreakup((p) => !p)}>
            {showBreakup ? "Hide Breakup" : "View Breakup"} ›
          </button>
        </div>

        {/* Breakup */}
        {showBreakup && (
          <div className="emi-breakup">
            <div className="emi-breakup-row">
              <span>On Road Price</span>
              <strong>₹ {formatINR(onRoadTotal)}</strong>
            </div>
            <div className="emi-breakup-row">
              <span>Down Payment</span>
              <strong>₹ {formatINR(downPayment)}</strong>
            </div>
            <div className="emi-breakup-row">
              <span>Loan Amount</span>
              <strong>₹ {formatINR(loanAmount)}</strong>
            </div>
            <div className="emi-breakup-row">
              <span>Interest Rate</span>
              <strong>{interestRate}% p.a.</strong>
            </div>
            <div className="emi-breakup-row">
              <span>Loan Tenure</span>
              <strong>{duration} year{duration > 1 ? "s" : ""} ({duration * 12} months)</strong>
            </div>
            <div className="emi-breakup-row">
              <span>Total Interest</span>
              <strong>₹ {formatINR(totalInterest)}</strong>
            </div>
            <div className="emi-breakup-row total">
              <span>Total Amount Payable</span>
              <strong>₹ {formatINR(downPayment + totalAmount)}</strong>
            </div>

            {/* Donut-style pie */}
            <div className="emi-pie-wrap">
              <svg viewBox="0 0 120 120" className="emi-pie">
                {/* Principal arc */}
                <circle
                  cx="60" cy="60" r="46"
                  fill="none" stroke="#2563eb" strokeWidth="18"
                  strokeDasharray={`${(loanAmount / (loanAmount + totalInterest)) * 289} 289`}
                  strokeDashoffset="72"
                />
                {/* Interest arc */}
                <circle
                  cx="60" cy="60" r="46"
                  fill="none" stroke="#f43f5e" strokeWidth="18"
                  strokeDasharray={`${(totalInterest / (loanAmount + totalInterest)) * 289} 289`}
                  strokeDashoffset={`${72 - (loanAmount / (loanAmount + totalInterest)) * 289}`}
                />
                <text x="60" y="56" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">EMI</text>
                <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#64748b">₹{formatINR(emi)}/mo</text>
              </svg>
              <div className="emi-pie-legend">
                <div className="emi-legend-item">
                  <span className="emi-legend-dot blue" />
                  <div>
                    <p>Principal</p>
                    <strong>₹ {formatINR(loanAmount)}</strong>
                  </div>
                </div>
                <div className="emi-legend-item">
                  <span className="emi-legend-dot red" />
                  <div>
                    <p>Total Interest</p>
                    <strong>₹ {formatINR(totalInterest)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="emi-disclaimer">*Interest rate and loan amount offered may vary by lender.</p>
      </div>
    </div>
  );
}