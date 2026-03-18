import "./dashboard.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_ORIGIN = import.meta.env.VITE_API_BASE ?? "https://localhost:7181";

interface Vehicle {
  scootyId: number;
  modelName: string;
  variantName: string;
  colourName: string;
  price: number;
  rangeKm: number;
  stockAvailable: boolean;
  imageUrl: string | null;
}

type VehicleApi = Vehicle & {
  imagePath?: string | null;
};

const resolveImageSrc = (path: string | null) => {
  if (!path) return noImage;
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("vehicles");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    // 🚀 Load from cache first (instant UI)
    const cached = localStorage.getItem("vehicles");
    if (cached) {
      setVehicles(JSON.parse(cached));
      setLoading(false);
    }

    fetchVehicles();
  }, [navigate]);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get<VehicleApi[]>("/api/ScootyInventory/models-list");

      const normalized = res.data.map((item) => ({
        ...item,
        imageUrl: item.imageUrl ?? item.imagePath ?? null,
      }));

      setVehicles(normalized);

      // 💾 Save to cache
      localStorage.setItem("vehicles", JSON.stringify(normalized));
    } catch {
      setError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">

      {/* ✅ NAVBAR */}
      <header className="pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Dashboard</span>
          </div>
        </div>

        <div className="pro-right">
          <span className="user-name">Welcome, Admin</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="main-content">
        <h1>Vehicle Collection</h1>

        {error && <p className="error">{error}</p>}

        <div className="vehicle-grid">

          {/* 🔄 Skeleton Loader */}
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div className="vehicle-card skeleton" key={i}>
                <div className="skeleton-img"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text small"></div>
              </div>
            ))
          }

          {/* 🚗 Actual Vehicles */}
          {vehicles.map((v) => (
            <div
              className="vehicle-card"
              key={v.scootyId}
              onClick={() => navigate(`/vehicle/${v.scootyId}`)}
            >
              <img
                src={resolveImageSrc(v.imageUrl)}
                className="vehicle-img"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = noImage;
                }}
              />

              <h3>{v.modelName}</h3>
              <p>{v.variantName}</p>
              <p>{v.rangeKm ?? "N/A"} km</p>
              <p>₹ {v.price ?? "N/A"}</p>

              <span className={v.stockAvailable ? "green" : "red"}>
                {v.stockAvailable ? "In Stock" : "Out"}
              </span>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
