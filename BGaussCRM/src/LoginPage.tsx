import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

/* ================= TYPES ================= */
type VehicleModel = {
  scootyId: number;
  modelId: number;
  modelName: string;
  variantName: string;
  price: number | null;
  imageUrl: string | null;
};

type EnquiryPayload = {
  modelId: number;
  name: string;
  phone: string;
  city: string;
};

type LoginPayload = {
  username: string;
  password: string;
};

type LoginResponse = {
  token: string;
  role: string;
  username: string;
};

/* ================= API HELPERS ================= */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchVehiclesInBackground = async (
  setVehicles: (v: VehicleModel[]) => void
) => {
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/LoginVehicle/models");
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data: VehicleModel[] = await res.json();

      sessionStorage.setItem("vehicles", JSON.stringify(data));
      setVehicles(data);
      return;
    } catch {
      if (attempt < maxRetries) {
        await sleep(2000 * attempt);
      }
    }
  }
};

const postEnquiry = async (payload: EnquiryPayload): Promise<void> => {
  const res = await fetch("/api/Enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(errorText || `Server responded ${res.status}`);
  }
};

const postLogin = async (payload: LoginPayload): Promise<LoginResponse> => {
  const res = await fetch("/api/Auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Invalid credentials");
    throw new Error(errorText || `Login failed with status ${res.status}`);
  }

  return res.json();
};

/* ================= COMPONENT ================= */
const LoginPage = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleModel[]>(() => {
    const cached = sessionStorage.getItem("vehicles");
    return cached ? JSON.parse(cached) : [];
  });

  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryModel, setEnquiryModel] = useState<number | "">("");
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryCity, setEnquiryCity] = useState("");
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");

  /* ================= SILENT BACKGROUND FETCH ================= */
  useEffect(() => {
    fetchVehiclesInBackground(setVehicles);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchVehiclesInBackground(setVehicles);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  /* ================= LOGIN ================= */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!identifier || !password) {
      setLoginError("Please enter your username and password.");
      return;
    }

    setLoginLoading(true);
    try {
      const data = await postLogin({ username: identifier, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      navigate("/dashboard");
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  /* ================= MODEL OPTIONS ================= */
  const modelOptions = Array.from(
    new Map(vehicles.map((v) => [v.modelId, v.modelName])).entries()
  ).map(([id, name]) => ({ id, name }));

  /* ================= ENQUIRY ================= */
  const openEnquiry = (modelId?: number) => {
    setEnquiryModel(modelId ?? "");
    setEnquiryError("");
    setShowEnquiry(true);
  };

  const resetEnquiryForm = () => {
    setEnquiryModel("");
    setEnquiryName("");
    setEnquiryPhone("");
    setEnquiryCity("");
    setEnquiryError("");
  };

  const submitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryError("");

    if (!enquiryName || !enquiryPhone || enquiryModel === "") {
      setEnquiryError("Please fill in model, name, and phone.");
      return;
    }

    if (!/^\d{10}$/.test(enquiryPhone)) {
      setEnquiryError("Phone must be exactly 10 digits.");
      return;
    }

    setEnquiryLoading(true);
    try {
      await postEnquiry({
        modelId: enquiryModel as number,
        name: enquiryName.trim(),
        phone: enquiryPhone.trim(),
        city: enquiryCity.trim(),
      });

      alert("Enquiry submitted successfully! We will contact you soon.");
      resetEnquiryForm();
      setShowEnquiry(false);
    } catch (err: unknown) {
      setEnquiryError(
        err instanceof Error
          ? err.message
          : "Failed to submit enquiry. Please try again."
      );
    } finally {
      setEnquiryLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="page">

      {/* ===== NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} alt="BGauss" className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Login</span>
          </div>
        </div>
        <div className="pro-right">
          <button
            className="nav-login-circle"
            onClick={() => {
              setShowModal((v) => !v);
              setLoginError("");
            }}
            aria-label="Login"
            title="Login"
          >
            ↪
          </button>
        </div>
      </header>

      {/* ===== VEHICLE SECTION ===== */}
      <section className="vehicle-section">
        <div className="vehicle-header">
          <h3>Available Models</h3>
          <div className="enquiry-controls">
            <button
              className="enquiry-icon-btn"
              onClick={() => openEnquiry()}
              aria-label="Enquire"
              title="Enquire"
            >
              ?
            </button>
          </div>
        </div>

        <div className="dash-card-grid">
          {vehicles.map((v) => (
            <div className="dash-card" key={v.scootyId}>
              <div className="dash-card-img-wrap">
                {v.imageUrl ? (
                  <img
                    src={
                      v.imageUrl.startsWith("http")
                        ? v.imageUrl
                        : `http://localhost:5181${v.imageUrl}`
                    }
                    alt={v.modelName}
                    className="dash-card-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = noImage;
                    }}
                  />
                ) : (
                  <div className="dash-card-img placeholder">No image</div>
                )}
              </div>

              <div className="dash-card-body">
                <h3 className="dash-card-model">{v.modelName}</h3>
                <p className="dash-card-variant">{v.variantName}</p>
                <div className="dash-card-chips">
                  <span className="dash-chip dash-chip-price">
                    {v.price != null
                      ? `₹${Number(v.price).toLocaleString("en-IN")}`
                      : "Price on request"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {vehicles.length === 0 && (
            <div className="pill pill-muted">No vehicles found.</div>
          )}
        </div>
      </section>

      {/* ===== ENQUIRY MODAL ===== */}
      {showEnquiry && (
        <div className="enquiry-modal" onClick={() => { setShowEnquiry(false); resetEnquiryForm(); }}>
          <div className="enquiry-card" onClick={(e) => e.stopPropagation()}>
            <h3>Vehicle Enquiry</h3>

            {enquiryError && (
              <div className="form-error">{enquiryError}</div>
            )}

            <form className="enquiry-form" onSubmit={submitEnquiry}>
              <label>
                Select Scooter
                <select
                  value={enquiryModel}
                  onChange={(e) =>
                    setEnquiryModel(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                  disabled={enquiryLoading}
                >
                  <option value="">Choose a model</option>
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Name
                <input
                  value={enquiryName}
                  onChange={(e) => setEnquiryName(e.target.value)}
                  required
                  disabled={enquiryLoading}
                />
              </label>

              <label>
                Phone
                <input
                  value={enquiryPhone}
                  onChange={(e) =>
                    setEnquiryPhone(e.target.value.replace(/\D/g, ""))
                  }
                  maxLength={10}
                  required
                  disabled={enquiryLoading}
                  inputMode="numeric"
                  placeholder="10-digit number"
                />
              </label>

              <label>
                City
                <input
                  value={enquiryCity}
                  onChange={(e) => setEnquiryCity(e.target.value)}
                  disabled={enquiryLoading}
                />
              </label>

              <div className="enquiry-actions">
                <button
                  type="button"
                  onClick={() => { setShowEnquiry(false); resetEnquiryForm(); }}
                  className="dash-chip"
                  disabled={enquiryLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-chip dash-chip-cta"
                  disabled={enquiryLoading}
                >
                  {enquiryLoading ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOGIN MODAL ===== */}
      {showModal && (
        <div className="login-modal" onClick={() => setShowModal(false)}>
          <div className="login-container" onClick={(e) => e.stopPropagation()}>
            <form className="login-card" onSubmit={handleLogin}>
              <h2>Dealer Login</h2>

              {loginError && (
                <div className="form-error">{loginError}</div>
              )}

              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loginLoading}
                  autoComplete="username"
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginLoading}
                  autoComplete="current-password"
                />
              </div>

              <button className="login-btn" disabled={loginLoading}>
                {loginLoading ? "Logging in…" : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;