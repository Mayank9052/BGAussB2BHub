import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import logo from "./assets/logo.jpg";

const LoginPage = () => {
  const navigate = useNavigate();

  // 🔥 STATES
  const [showLogin, setShowLogin] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // 🔥 LOGIN FUNCTION
  const handleLogin = () => {
    if (identifier && password) {
      let role = "user";

      if (identifier.toLowerCase() === "admin") {
        role = "admin";
      }

      localStorage.setItem("token", "session");
      localStorage.setItem("role", role);
      localStorage.setItem("username", identifier);

      setShowLogin(false);

      // 🚀 NAVIGATE
      navigate("/dashboard");
    } else {
      alert("Enter credentials");
    }
  };

  return (
    <div className="page">

      {/* ===== NAVBAR ===== */}
      <header className="pro-navbar">
        <div className="bg-container">

          {/* LEFT */}
          <div className="bg-left">
            <img src={logo} className="bg-logo" />
            <div className="bg-brand-text">
              <span className="bg-title">BGauss EV</span>
              <span className="bg-sub">Electric Mobility</span>
            </div>
          </div>

          {/* CENTER */}
          <nav className="bg-menu">
            <span>Electric Scooters ▾</span>
            <span>Test Ride ▾</span>
            <span>Find Dealers ▾</span>
            <span>Finance ▾</span>
            <span>Support ▾</span>
          </nav>

          {/* RIGHT */}
          <div className="bg-right">
            <div
              className="bg-account"
              onClick={() => setShowLogin(true)}
            >
              <div className="bg-avatar">👤</div>
              <div className="bg-account-text">
                <span className="bg-small">Dealer Portal</span>
                <span className="bg-bold">Login</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ===== LOGIN MODAL (FLEX UI) ===== */}
      {showLogin && (
          <div
            className="login-modal-overlay"
            onClick={() => setShowLogin(false)}
          >
            <div
              className="login-modal"
              onClick={(e) => e.stopPropagation()}
            >

              {/* LEFT IMAGE PANEL */}
              <div className="login-left">
                <img src={logo} alt="BGauss" />
                <h3>BGauss EV</h3>
                <p>Powering Electric Mobility ⚡</p>
              </div>

              {/* RIGHT FORM */}
              <div className="login-right">
                <h2>Dealer Login</h2>

                <input
                  type="text"
                  placeholder="Username or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button className="login-btn" onClick={handleLogin}>
                  Login
                </button>

                <button
                  className="close-btn"
                  onClick={() => setShowLogin(false)}
                >
                  ✕
                </button>
              </div>

            </div>
          </div>
        )}
    </div>
  );
};

export default LoginPage;