import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

import logo from "./assets/logo.jpg";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (identifier && password) {
      navigate("/dashboard");
    } else {
      alert("Enter credentials");
    }
  };

  return (
    <div className="page">
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} alt="BGauss" className="pro-logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Login</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">Dealer Access</span>
        </div>
      </header>

      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Dealer Login</h2>

          <div className="input-group">
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <label>Email</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label>Password</label>
          </div>

          <button className="login-btn">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
