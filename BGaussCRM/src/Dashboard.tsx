import "./dashboard.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const IMAGE_BASE = "https://localhost:7181";

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

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get("/api/ScootyInventory/models-list");
      setVehicles(res.data);
    } catch {
      setError("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const getImage = (url: string | null) =>
    url ? `${IMAGE_BASE}${url}` : noImage;

  return (
    <div className="dashboard">

      {/* ✅ PROFESSIONAL NAVBAR */}
      <header className="pro-navbar">

        {/* LEFT */}
        <div className="pro-left">
          <img src={logo} className="pro-logo" />

          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Dashboard</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="pro-right">
          <span className="user-name">Welcome, Admin</span>
        </div>

      </header>

      {/* CONTENT */}
      <div className="main-content">

        <h1>Vehicle Collection</h1>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        <div className="vehicle-grid">
          {vehicles.map((v) => (
            <div
              className="vehicle-card"
              key={v.scootyId}
              onClick={() => navigate(`/vehicle/${v.scootyId}`)}
            >
              <img
                src={getImage(v.imageUrl)}
                className="vehicle-img"
                onError={(e: any) => (e.target.src = noImage)}
              />

              <h3>{v.modelName}</h3>
              <p>{v.variantName}</p>
              <p>{v.rangeKm} km</p>
              <p>₹ {v.price}</p>

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