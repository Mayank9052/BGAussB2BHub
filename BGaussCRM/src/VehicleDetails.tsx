import "./vehicleDetails.css";
import logo from "./assets/logo.jpg";
import noImage from "./assets/No-Image.jpg";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const IMAGE_BASE = "https://localhost:7181";

interface VehicleDetailsResponse {
  scootyId: number;
  imageUrl: string | null;
  modelName: string;
  variantName: string;
  colourName: string | null;
  price: number | null;
  batterySpecs: string | null;
  rangeKm: number | null;
  stockAvailable: boolean;
}

interface InventoryItem {
  scootyId: number;
  modelId: number;
  modelName: string;
  variantId: number;
  variantName: string;
  colourId: number | null;
  colourName: string | null;
  price: number | null;
  batterySpecs: string | null;
  rangeKm: number | null;
  stockAvailable: boolean;
  imageUrl: string | null;
}

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<VehicleDetailsResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Vehicle not found.");
      setLoading(false);
      return;
    }

    const fetchVehiclePage = async () => {
      setLoading(true);
      setError("");

      try {
        const [detailsRes, inventoryListRes] = await Promise.all([
          axios.get<VehicleDetailsResponse>(`/api/ScootyInventory/details/${id}`),
          axios.get<InventoryItem[]>("/api/ScootyInventory"),
        ]);

        const currentInventory = inventoryListRes.data.find(
          (item) => item.scootyId === Number(id)
        );

        const relatedModels = inventoryListRes.data
          .filter((item) =>
            currentInventory
              ? item.modelId === currentInventory.modelId
              : item.modelName === detailsRes.data.modelName
          )
          .sort((a, b) => {
            if (a.scootyId === detailsRes.data.scootyId) return -1;
            if (b.scootyId === detailsRes.data.scootyId) return 1;
            if (a.stockAvailable !== b.stockAvailable) return a.stockAvailable ? -1 : 1;
            return (b.price ?? 0) - (a.price ?? 0);
          });

        setVehicle(detailsRes.data);
        setAvailableModels(relatedModels);
        window.scrollTo(0, 0);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load vehicle details.");
        setVehicle(null);
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehiclePage();
  }, [id]);

  const getImage = (imageUrl: string | null) =>
    imageUrl ? `${IMAGE_BASE}${imageUrl}` : noImage;

  const formatCurrency = (value: number | null) => {
    if (typeof value !== "number") {
      return "Price on request";
    }

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const specificationItems = vehicle
    ? [
        { label: "Make", value: vehicle.modelName },
        { label: "Model", value: vehicle.variantName },
        { label: "Colour", value: vehicle.colourName ?? "Not specified" },
        { label: "Range", value: vehicle.rangeKm ? `${vehicle.rangeKm} km` : "Not available" },
        { label: "Battery", value: vehicle.batterySpecs ?? "Not available" },
        { label: "Price", value: formatCurrency(vehicle.price) },
      ]
    : [];

  const galleryHighlights = vehicle
    ? [
        {
          label: "Range",
          value: vehicle.rangeKm ? `${vehicle.rangeKm} km` : "Not available",
          detail: "Certified riding distance",
        },
        {
          label: "Battery",
          value: vehicle.batterySpecs ?? "Not available",
          detail: "Current battery specification",
        },
        {
          label: "Colour",
          value: vehicle.colourName ?? "Not specified",
          detail: "Selected vehicle finish",
        },
        {
          label: "Stock",
          value: vehicle.stockAvailable ? "In Stock" : "Out of Stock",
          detail: "Current inventory status",
        },
      ]
    : [];

  return (
    <div className="vehicle-details-page">
      <header className="pro-navbar vehicle-details-pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">Vehicle Details</span>
          </div>
        </div>

        <div className="pro-right">
          <button className="vehicle-details-back-btn" onClick={() => navigate(-1)}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="vehicle-details-main">
        {loading ? (
          <section className="vehicle-details-state-card">
            <h2>Loading vehicle information...</h2>
            <p>Please wait while we fetch specifications and related models.</p>
          </section>
        ) : error ? (
          <section className="vehicle-details-state-card vehicle-details-state-card-error">
            <h2>{error}</h2>
            <p>The selected vehicle could not be loaded from the current inventory.</p>
          </section>
        ) : vehicle ? (
          <>
            <section className="vehicle-details-layout">
              <div className="vehicle-details-gallery-column">
                <p className="vehicle-details-breadcrumbs">
                  Home / Vehicles / BGauss / {vehicle.modelName} / {vehicle.variantName}
                </p>

                <div className="vehicle-details-gallery-grid">
                  <article className="vehicle-details-gallery-card vehicle-details-gallery-card-main">
                    <img
                      src={getImage(vehicle.imageUrl)}
                      alt={`${vehicle.modelName} ${vehicle.variantName}`}
                      onError={(event) => {
                        event.currentTarget.src = noImage;
                      }}
                    />
                  </article>

                  {galleryHighlights.map((item) => (
                    <article className="vehicle-details-gallery-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="vehicle-details-sidebar">
                <div className="vehicle-details-sidebar-scroll">
                  <p className="vehicle-details-sidebar-title">
                    Selected Colour: <strong>{vehicle.colourName ?? "Not specified"}</strong>
                  </p>

                  <section className="vehicle-details-sidebar-block">
                    <h2>{vehicle.modelName}</h2>
                    <p className="vehicle-details-sidebar-subtitle">
                      {vehicle.modelName} {vehicle.variantName}
                    </p>

                    <div className="vehicle-details-sidebar-rating">
                      <span>{vehicle.stockAvailable ? "In Stock" : "Out of Stock"}</span>
                      <span>{vehicle.rangeKm ? `${vehicle.rangeKm} km range` : "Range on request"}</span>
                    </div>

                    <div className="vehicle-details-sidebar-price">
                      <strong>{formatCurrency(vehicle.price)}</strong>
                      <p>{vehicle.batterySpecs ?? "Battery details unavailable"}</p>
                    </div>
                  </section>

                  <section className="vehicle-details-sidebar-block">
                    <div className="vehicle-details-sidebar-head">
                      <h3>Specifications</h3>
                    </div>

                    <div className="vehicle-details-spec-list">
                      {specificationItems.map((item) => (
                        <div className="vehicle-details-spec-row" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}

                      <div className="vehicle-details-spec-row">
                        <span>Availability</span>
                        <strong
                          className={
                            vehicle.stockAvailable
                              ? "vehicle-details-stock-text vehicle-details-stock-text-in"
                              : "vehicle-details-stock-text vehicle-details-stock-text-out"
                          }
                        >
                          {vehicle.stockAvailable ? "Available Now" : "Currently Unavailable"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="vehicle-details-sidebar-block">
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
                            className={
                              isSelected
                                ? "vehicle-details-option-card vehicle-details-option-card-active"
                                : "vehicle-details-option-card"
                            }
                            onClick={() => navigate(`/vehicle/${item.scootyId}`)}
                          >
                            <strong>{item.variantName}</strong>
                            <span>{formatCurrency(item.price)}</span>
                            <small>
                              {item.stockAvailable
                                ? "Available now"
                                : "Currently unavailable"}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
