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


/* ================= API ================= */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ================= COMPONENT ================= */
const LoginPage = () => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryModel, setEnquiryModel] = useState<number | "">("");
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryCity, setEnquiryCity] = useState("");

  /* ================= LOGIN ================= */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (identifier && password) {
      let role = "user";

      if (identifier.toLowerCase() === "admin") {
        role = "admin";
      }

      localStorage.setItem("token", "session");
      localStorage.setItem("role", role);
      localStorage.setItem("username", identifier);

      navigate("/dashboard");
    } else {
      alert("Enter credentials");
    }
  };

  /* ================= MODEL OPTIONS ================= */
  const modelOptions = Array.from(
    new Map(vehicles.map((v) => [v.modelId, v.modelName])).entries()
  ).map(([id, name]) => ({ id, name }));

  /* ================= ENQUIRY ================= */
  const openEnquiry = (modelId?: number) => {
    setEnquiryModel(modelId ?? "");
    setShowEnquiry(true);
  };

  const submitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!enquiryName || !enquiryPhone || enquiryModel === "") {
      alert("Please fill model, name and phone.");
      return;
    }

    alert("Enquiry submitted. We will contact you soon.");
    setShowEnquiry(false);
  };

  /* ================= LOAD VEHICLES ================= */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFetchError("");

      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(("/api/LoginVehicle/models"));

          if (!res.ok) {
            throw new Error(`Server responded ${res.status}`);
          }

          const data: VehicleModel[] = await res.json();
          setVehicles(data);
          setFetchError("");
          break;
        } catch (err) {
          if (attempt === maxRetries) {
            setFetchError(
              err instanceof Error
                ? err.message
                : "Failed to load vehicles"
            );
          } else {
            await sleep(400 * attempt);
          }
        } finally {
          if (attempt === maxRetries) setLoading(false);
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  /* ================= UI ================= */
  return (
    <div className="page">
      {/* ===== NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} alt="BGauss" className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Dashboard</span>
          </div>
        </div>

        <div className="pro-right">
          <button
            className="nav-login-circle"
            onClick={() => setShowModal((v) => !v)}
          >
            ↪
          </button>
        </div>
      </header>

      {/* ===== VEHICLE SECTION ===== */}
      <section className="vehicle-section">
        <div className="vehicle-header">
          <h3>Available Models</h3>

          {loading && <span className="pill pill-muted">Loading...</span>}
          {fetchError && <span className="pill pill-error">{fetchError}</span>}

          {!loading && !fetchError && (
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
          )}
        </div>

        {!loading && !fetchError && (
          <div className="dash-card-grid">
            {vehicles.map((v) => (
              <div className="dash-card" key={v.scootyId}>
                <div className="dash-card-img-wrap">
                  {v.imageUrl ? (
                    <img
                      src={
                        v.imageUrl.startsWith("http")
                          ? v.imageUrl
                          :v.imageUrl
                      }
                      alt={v.modelName}
                      className="dash-card-img"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = noImage;
                      }}
                    />
                  ) : (
                    <div className="dash-card-img placeholder">
                      No image
                    </div>
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
              <div className="pill pill-muted">
                No vehicles found.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== ENQUIRY MODAL ===== */}
      {showEnquiry && (
        <div
          className="enquiry-modal"
          onClick={() => setShowEnquiry(false)}
        >
          <div
            className="enquiry-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Vehicle Enquiry</h3>

            <form className="enquiry-form" onSubmit={submitEnquiry}>
              <label>
                Select Scooter
                <select
                  value={enquiryModel}
                  onChange={(e) =>
                    setEnquiryModel(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  required
                >
                  <option value="">Choose a model</option>
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Name
                <input
                  value={enquiryName}
                  onChange={(e) => setEnquiryName(e.target.value)}
                  required
                />
              </label>

              <label>
                Phone
                <input
                  value={enquiryPhone}
                  onChange={(e) => setEnquiryPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </label>

              <label>
                City
                <input
                  value={enquiryCity}
                  onChange={(e) => setEnquiryCity(e.target.value)}
                />
              </label>

              <div className="enquiry-actions">
                <button
                  type="button"
                  onClick={() => setShowEnquiry(false)}
                  className="dash-chip"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="dash-chip dash-chip-cta"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOGIN MODAL ===== */}
      {showModal && (
        <div
          className="login-modal"
          onClick={() => setShowModal(false)}
        >
          <div
            className="login-container"
            onClick={(e) => e.stopPropagation()}
          >
            <form className="login-card" onSubmit={handleLogin}>
              <h2>Dealer Login</h2>

              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="login-btn">Login</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
