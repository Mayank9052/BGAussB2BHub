// ─────────────────────────────────────────────────────────────
// FILE: src/LoginPage.tsx
// BGauss B2B Portal — Full landing page
// UPDATED: Role-based routing after login
//   admin → /exchange-admin (Module 2 Admin Panel)
//   dealer/user → /dashboard (then can access /exchange)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";
import logo from "./assets/logo.jpg";
import scootyImg from "./assets/Bg0-scooty.png";

// ── Types ──────────────────────────────────────────────────
interface StoreArea {
  id: number; areaName: string; pincode: string;
  cityId: number; cityName: string; stateName: string;
}

type LoginResponseData = {
  token?: string;   Token?: string;
  username?: string; Username?: string;
  role?: string;    Role?: string;
};

// ── JWT decode ─────────────────────────────────────────────
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4), "="
    );
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch { return null; }
};

const extractRole = (data: LoginResponseData, token: string): string => {
  const directRole = data.role ?? data.Role;
  if (typeof directRole === "string" && directRole.trim())
    return directRole.trim().toLowerCase();

  const payload = decodeJwtPayload(token);
  const claimKeys = [
    "role", "Role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  ];
  for (const key of claimKeys) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim())
      return value.trim().toLowerCase();
  }
  return "user";
};

// ── Component ──────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();

  // Nav state
  const [productsOpen,   setProductsOpen]   = useState(false);
  const [bookOpen,       setBookOpen]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [activeSection,  setActiveSection]  = useState("home");

  // Login modal
  const [showLogin,    setShowLogin]    = useState(false);
  const [identifier,   setIdentifier]   = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError,   setLoginError]   = useState("");

  // Find store
  const [storeQuery,    setStoreQuery]    = useState("");
  const [storeSuggests, setStoreSuggests] = useState<StoreArea[]>([]);
  const [storeDropOpen, setStoreDropOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreArea | null>(null);

  // Products
  const [products, setProducts] = useState<{ id: number; modelName: string }[]>([]);

  const productsRef = useRef<HTMLDivElement>(null);
  const bookRef     = useRef<HTMLDivElement>(null);
  const storeRef    = useRef<HTMLInputElement>(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load products
  useEffect(() => {
    axios.get("/api/ScootyInventory/models")
      .then(r => setProducts(r.data))
      .catch(() => setProducts([
        { id: 1, modelName: "BG RUV 350" },
        { id: 2, modelName: "BG MAX C12" },
        { id: 3, modelName: "BG OoWah"   },
      ]));
  }, []);

  // Outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (productsRef.current && !productsRef.current.contains(e.target as Node))
        setProductsOpen(false);
      if (bookRef.current && !bookRef.current.contains(e.target as Node))
        setBookOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Store search debounce
  useEffect(() => {
    if (storeQuery.length < 2) { setStoreSuggests([]); setStoreDropOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await axios.get<StoreArea[]>(`/api/City/search?q=${encodeURIComponent(storeQuery)}`);
        setStoreSuggests(r.data);
        setStoreDropOpen(r.data.length > 0);
      } catch { setStoreSuggests([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [storeQuery]);

  // Token removal watcher
  useEffect(() => {
    const handleStorageChange = () => {
      if (!localStorage.getItem("token")) {
        setIdentifier(""); setPassword("");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ── LOGIN — role-based routing ──────────────────────────
  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setLoginError("Please enter your credentials.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await axios.post<LoginResponseData>("/api/Auth/login", {
        identifier: identifier.trim(),
        password,
      });

      const token = res.data.token ?? res.data.Token;
      if (!token) throw new Error("No token received.");

      const username = res.data.username ?? res.data.Username ?? identifier.trim();
      const role     = extractRole(res.data, token);

      localStorage.setItem("token",    token);
      localStorage.setItem("username", username);
      localStorage.setItem("role",     role);

      setShowLogin(false);

      // ── Role-based routing per the flow spec ──────────
      // admin  → Module 2 Admin Approval Panel
      // others → Dashboard (can access Exchange Program from there)
      if (role === "admin") {
        navigate("/exchange-admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }

    } catch (err: unknown) {
      console.error("Login Error:", err);
      if (axios.isAxiosError(err)) {
        setLoginError(err.response?.data?.message ?? "Invalid credentials.");
      } else {
        setLoginError("Invalid credentials.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  // ── Dropdowns ──────────────────────────────────────────
  const ProductsDropdown = () => (
    <div className="lp-dropdown" ref={productsRef}>
      <button
        className={`lp-nav-link lp-nav-link-dropdown${productsOpen ? " active" : ""}`}
        onClick={() => setProductsOpen(!productsOpen)}
      >
        Products
        <svg width="10" height="10" viewBox="0 0 10 6" fill="none"
          style={{ transform: productsOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {productsOpen && (
        <div className="lp-dropdown-menu">
          {products.map(p => (
            <button key={p.id} className="lp-dropdown-item"
              onClick={() => { scrollTo("products"); setProductsOpen(false); }}>
              {p.modelName}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const BookDropdown = () => (
    <div className="lp-dropdown" ref={bookRef}>
      <button className="lp-btn-book" onClick={() => setBookOpen(!bookOpen)}>
        Book Now
        <svg width="10" height="10" viewBox="0 0 10 6" fill="none"
          style={{ transform: bookOpen ? "rotate(180deg)" : "none", transition: "0.2s" }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {bookOpen && (
        <div className="lp-dropdown-menu lp-dropdown-menu-right">
          <button className="lp-dropdown-item" onClick={() => { setShowLogin(true); setBookOpen(false); }}>
            Dealer / B2B Login
          </button>
          <button className="lp-dropdown-item" onClick={() => scrollTo("test-ride")}>
            Book Test Ride
          </button>
          <button className="lp-dropdown-item" onClick={() => scrollTo("contact")}>
            Contact a Dealer
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="lp-page">

      {/* ═══ NAVBAR ═══ */}
      <header className={`lp-navbar${scrolled ? " lp-navbar-shadow" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo" onClick={() => scrollTo("home")}>
            <img src={logo} alt="BGauss" className="lp-logo-img" />
            <div className="lp-logo-text">
              <span className="lp-logo-name">BGAUSS</span>
              <span className="lp-logo-sub">Electric Vehicles</span>
            </div>
          </div>

          <nav className="lp-nav-links">
            <button className={`lp-nav-link${activeSection === "home"       ? " lp-nav-active" : ""}`} onClick={() => scrollTo("home")}>Home</button>
            <button className={`lp-nav-link${activeSection === "about"      ? " lp-nav-active" : ""}`} onClick={() => scrollTo("about")}>About Us</button>
            <ProductsDropdown />
            <button className={`lp-nav-link${activeSection === "find-store" ? " lp-nav-active" : ""}`} onClick={() => scrollTo("find-store")}>Find Your Store</button>
            <button className={`lp-nav-link${activeSection === "test-ride"  ? " lp-nav-active" : ""}`} onClick={() => scrollTo("test-ride")}>Test Ride</button>
            <button className={`lp-nav-link${activeSection === "contact"    ? " lp-nav-active" : ""}`} onClick={() => scrollTo("contact")}>Contact</button>
            <a className="lp-nav-link" href="https://www.bgauss.com/blog/" target="_blank" rel="noreferrer">Blog</a>
          </nav>

          <div className="lp-nav-right">
            <button className="lp-btn-login" onClick={() => setShowLogin(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Login
            </button>
            <BookDropdown />
            <button className="lp-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span /><span /><span />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            {["home","about","products","find-store","test-ride","contact"].map(s => (
              <button key={s} className="lp-mobile-link" onClick={() => scrollTo(s)}>
                {s.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
            <a className="lp-mobile-link" href="https://www.bgauss.com/blog/" target="_blank" rel="noreferrer">Blog</a>
            <button className="lp-mobile-link lp-mobile-login"
              onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}>
              Dealer / Admin Login
            </button>
          </div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section id="home" className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">⚡ Official EV Partner of Rajasthan Royals</div>
            <h1 className="lp-hero-h1">
              The Royals Just<br />
              <span className="lp-hero-accent">Got Electrified!</span>
            </h1>
            <p className="lp-hero-sub">
              BGauss — Premium electric scooters engineered for Indian roads.<br />
              Power. Range. Style.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-cta-primary" onClick={() => setShowLogin(true)}>
                Dealer / Admin Login →
              </button>
              <button className="lp-cta-secondary" onClick={() => scrollTo("products")}>
                Explore Models
              </button>
            </div>
            <div className="lp-hero-stats">
              {[
                { val: "150+",  label: "Dealers" },
                { val: "50K+",  label: "Happy Customers" },
                { val: "160km", label: "Max Range" },
              ].map(s => (
                <div key={s.label} className="lp-hero-stat">
                  <span className="lp-stat-val">{s.val}</span>
                  <span className="lp-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-hero-img-wrap">
            <div className="lp-hero-glow" />
            <img src={scootyImg} alt="BGauss Scooty" className="lp-hero-scooty"
              onError={e => { e.currentTarget.style.display = "none"; }} />
          </div>
        </div>
        <div className="lp-scroll-hint"><span>↓</span></div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section id="about" className="lp-section lp-about">
        <div className="lp-section-inner lp-about-inner">
          <div className="lp-about-img-col">
            <div className="lp-about-img-frame">
              <div className="lp-about-img-badge">Since 2020</div>
              <div className="lp-about-scooty-placeholder">
                <img src={scootyImg} alt="About BGauss" className="lp-about-scooty"
                  onError={e => { const el = e.currentTarget.parentElement!; el.innerHTML = '<div style="font-size:80px">🛵</div>'; }} />
              </div>
            </div>
          </div>
          <div className="lp-about-text">
            <div className="lp-section-label">About Us</div>
            <h2 className="lp-section-h2">About BGauss</h2>
            <p className="lp-about-p">
              BGauss offers a range of premium electric vehicles designed for urban and emerging markets, aimed at enhancing everyday lifestyles.
            </p>
            <p className="lp-about-p">
              As a brand of RR Global — one of India's leading electrical companies — BGauss brings decades of manufacturing excellence to the EV revolution.
            </p>
            <div className="lp-about-features">
              {[
                { icon: "⚡", title: "High Performance", desc: "Powerful motors up to 3.8 kW" },
                { icon: "🔋", title: "Long Battery Life", desc: "Certified range up to 160 km" },
                { icon: "🛡️", title: "5-Year Warranty",  desc: "Battery & motor covered" },
                { icon: "🌍", title: "Eco-Friendly",     desc: "Zero emissions, 100% electric" },
              ].map(f => (
                <div key={f.title} className="lp-about-feat">
                  <span className="lp-feat-icon">{f.icon}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCTS ═══ */}
      <section id="products" className="lp-section lp-products-section">
        <div className="lp-section-inner">
          <div className="lp-section-label center">Our Range</div>
          <h2 className="lp-section-h2 center">Electric Scooters</h2>
          <p className="lp-products-sub">Choose from our lineup — built for every kind of rider.</p>
          <div className="lp-products-grid">
            {products.map((p, i) => {
              const specs = [
                { range: "160 km", power: "3.8 kW", charge: "5 hrs" },
                { range: "120 km", power: "2.2 kW", charge: "4 hrs" },
                { range: "100 km", power: "1.8 kW", charge: "3 hrs" },
              ];
              const sp = specs[i % specs.length];
              return (
                <div key={p.id} className="lp-product-card">
                  <div className="lp-product-img-area">
                    <img src={scootyImg} alt={p.modelName} className="lp-product-img"
                      onError={e => { e.currentTarget.style.opacity = "0.3"; }} />
                    <div className="lp-product-tag">New</div>
                  </div>
                  <div className="lp-product-body">
                    <h3 className="lp-product-name">{p.modelName}</h3>
                    <div className="lp-product-specs">
                      <span>🛣 {sp.range}</span>
                      <span>⚡ {sp.power}</span>
                      <span>🔌 {sp.charge}</span>
                    </div>
                    <div className="lp-product-actions">
                      <button className="lp-product-btn-primary" onClick={() => setShowLogin(true)}>View Details</button>
                      <button className="lp-product-btn-ghost" onClick={() => scrollTo("test-ride")}>Test Ride</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FIND YOUR STORE ═══ */}
      <section id="find-store" className="lp-section lp-store-section">
        <div className="lp-section-inner lp-store-inner">
          <div className="lp-store-text">
            <div className="lp-section-label">Dealership Network</div>
            <h2 className="lp-section-h2">Find Your Store</h2>
            <p className="lp-store-sub">Search by city, area or pincode to locate the nearest BGauss dealer.</p>
            <div className="lp-store-search-wrap">
              <div className="lp-store-search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input ref={storeRef} className="lp-store-input" type="text"
                  placeholder="Enter city, area or pincode…"
                  value={storeQuery}
                  onChange={e => setStoreQuery(e.target.value)}
                  onFocus={() => storeSuggests.length > 0 && setStoreDropOpen(true)}
                />
                {storeQuery && (
                  <button className="lp-store-clear"
                    onClick={() => { setStoreQuery(""); setSelectedStore(null); setStoreDropOpen(false); }}>✕</button>
                )}
              </div>
              {storeDropOpen && storeSuggests.length > 0 && (
                <div className="lp-store-dropdown">
                  {storeSuggests.map(a => (
                    <button key={a.id} className="lp-store-suggest"
                      onClick={() => { setSelectedStore(a); setStoreQuery(a.pincode); setStoreDropOpen(false); }}>
                      <div className="lp-store-suggest-main">
                        <strong>{a.areaName}</strong>
                        <span>{a.cityName}, {a.stateName}</span>
                      </div>
                      <span className="lp-store-suggest-pin">{a.pincode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStore && (
              <div className="lp-store-result">
                <div className="lp-store-result-icon">📍</div>
                <div>
                  <p className="lp-store-result-area">{selectedStore.areaName}</p>
                  <p className="lp-store-result-city">{selectedStore.cityName}, {selectedStore.stateName} — {selectedStore.pincode}</p>
                  <button className="lp-store-directions" onClick={() => setShowLogin(true)}>
                    View Inventory for this Area →
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="lp-store-map-col">
            <div className="lp-store-map-frame">
              <div className="lp-map-header"><span>📍 BGauss Dealer Network</span></div>
              <div className="lp-map-body">
                {[
                  { cls: "lp-pin-1", label: "Mumbai" },
                  { cls: "lp-pin-2", label: "Delhi" },
                  { cls: "lp-pin-3", label: "Bengaluru" },
                  { cls: "lp-pin-4", label: "Pune" },
                  { cls: "lp-pin-5", label: "Chennai" },
                ].map(pin => (
                  <div key={pin.label} className={`lp-map-pin ${pin.cls}`}>
                    <div className="lp-pin-dot" />
                    <div className="lp-pin-label">{pin.label}</div>
                  </div>
                ))}
                <div className="lp-map-india">🇮🇳</div>
              </div>
              <div className="lp-map-footer">150+ dealers across India</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TEST RIDE ═══ */}
      <section id="test-ride" className="lp-section lp-testride-section">
        <div className="lp-section-inner lp-testride-inner">
          <div className="lp-section-label center">Experience BGauss</div>
          <h2 className="lp-section-h2 center">Book a Test Ride</h2>
          <p className="lp-testride-sub">Feel the thrill of electric riding. Book a free test ride at your nearest BGauss dealer.</p>
          <div className="lp-testride-steps">
            {[
              { n: "01", t: "Choose a Model",  d: "Pick from our latest lineup" },
              { n: "02", t: "Select Location", d: "Find a dealer near you" },
              { n: "03", t: "Pick a Slot",     d: "Choose date & time" },
              { n: "04", t: "Ride!",           d: "Experience the future" },
            ].map(s => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-line" />
                <div className="lp-step-title">{s.t}</div>
                <div className="lp-step-desc">{s.d}</div>
              </div>
            ))}
          </div>
          <button className="lp-cta-primary lp-testride-cta"
            onClick={() => window.open("https://www.bgauss.com/test-ride/", "_blank")}>
            Book Test Ride on BGauss.com →
          </button>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section id="contact" className="lp-section lp-contact-section">
        <div className="lp-section-inner">
          <div className="lp-section-label center">Get In Touch</div>
          <h2 className="lp-section-h2 center">Contact Us</h2>
          <div className="lp-contact-grid">
            {[
              { icon: "📞", title: "Customer Support", val: "+91 87792 62626", link: "tel:+918779262626" },
              { icon: "✉️", title: "Email",            val: "support@bgauss.com", link: "mailto:support@bgauss.com" },
              { icon: "🌐", title: "Website",          val: "www.bgauss.com",     link: "https://www.bgauss.com" },
              { icon: "💬", title: "WhatsApp",         val: "Chat with us",       link: "https://wa.me/918779262626" },
            ].map(c => (
              <a key={c.title} href={c.link} target="_blank" rel="noreferrer" className="lp-contact-card">
                <span className="lp-contact-icon">{c.icon}</span>
                <div className="lp-contact-title">{c.title}</div>
                <div className="lp-contact-val">{c.val}</div>
              </a>
            ))}
          </div>
          <div className="lp-dealer-cta">
            <h3>Dealer or Admin?</h3>
            <p>Access the B2B portal for inventory, exchange program, pricing and order management.</p>
            <div className="lp-dealer-cta-btns">
              <button className="lp-cta-primary" onClick={() => setShowLogin(true)}>
                Dealer / Admin Login →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logo} alt="BGauss" className="lp-footer-logo" />
            <span>BGAUSS</span>
          </div>
          <div className="lp-footer-links">
            <a href="https://www.bgauss.com/" target="_blank" rel="noreferrer">Home</a>
            <a href="https://www.bgauss.com/about-us/" target="_blank" rel="noreferrer">About Us</a>
            <a href="https://www.bgauss.com/blog/" target="_blank" rel="noreferrer">Blog</a>
            <a href="https://www.bgauss.com/find-your-store/" target="_blank" rel="noreferrer">Find Store</a>
          </div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} BGauss (RR Global). All rights reserved.</div>
        </div>
      </footer>

      {/* ═══ LOGIN MODAL ═══ */}
      {showLogin && (
        <div className="lp-modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>

            {/* Left panel */}
            <div className="lp-modal-left">
              <img src={logo} alt="BGauss" className="lp-modal-logo" />
              <h3>BGauss Portal</h3>
              <p>Dealer · Admin</p>

              {/* Role hint */}
              <div className="lp-modal-role-hints">
                <div className="lp-role-hint dealer">
                  <span className="lp-role-icon">🛵</span>
                  <div>
                    <strong>Dealer</strong>
                    <p>Exchange & Inventory</p>
                  </div>
                </div>
                <div className="lp-role-hint admin">
                  <span className="lp-role-icon">🔐</span>
                  <div>
                    <strong>Admin</strong>
                    <p>Approval Panel</p>
                  </div>
                </div>
              </div>

              <div className="lp-modal-image-wrapper">
                <img src={scootyImg} alt="Scooty" className="lp-product-img"
                  onError={e => { e.currentTarget.style.opacity = "0.3"; }} />
              </div>
            </div>

            {/* Right form */}
            <div className="lp-modal-right">
              <button className="lp-modal-close" onClick={() => setShowLogin(false)}>✕</button>
              <h2 className="lp-modal-title">Sign In</h2>
              <p className="lp-modal-sub">Access your BGauss B2B Portal</p>

              {loginError && (
                <div className="lp-modal-error">⚠ {loginError}</div>
              )}

              <div className="lp-modal-field">
                <label>Employee Code / Email / Username</label>
                <div className="lp-input-wrap">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="e.g. EMP001 or admin@bgauss.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && void handleLogin()}
                    autoFocus
                  />
                </div>
              </div>

              <div className="lp-modal-field">
                <label>Password</label>
                <div className="lp-input-wrap">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && void handleLogin()}
                  />
                  <button className="lp-pw-eye" type="button"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              {/* Role routing info */}
              <div className="lp-modal-routing-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span>Admins are redirected to the <strong>Approval Panel</strong>. Dealers access the <strong>Dealer Dashboard</strong>.</span>
              </div>

              <button
                className="lp-modal-login-btn"
                onClick={() => void handleLogin()}
                disabled={loginLoading}
              >
                {loginLoading
                  ? <><span className="lp-btn-spinner" /> Signing in…</>
                  : "Login →"
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;