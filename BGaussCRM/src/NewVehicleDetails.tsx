import "./vehicleDetails.css";
import logo from "./assets/logo.jpg";
import Tooltip from "./Tooltip";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface DropdownOption {
  id: number;
  modelName?: string;
  variantName?: string;
  colourName?: string;
}

export default function NewVehicleDetails() {
  const navigate = useNavigate();
  const [models, setModels] = useState<DropdownOption[]>([]);
  const [variants, setVariants] = useState<DropdownOption[]>([]);
  const [colours, setColours] = useState<DropdownOption[]>([]);

  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectedColour, setSelectedColour] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [rangeKm, setRangeKm] = useState<string>("");
  const [stockAvailable, setStockAvailable] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const username = localStorage.getItem("username") ?? "";
  const role = localStorage.getItem("role") ?? "";
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  const variantFetchController = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>("/api/ScootyInventory/models");
        setModels(res.data);
        if (res.data.length > 0) {
          setSelectedModel(res.data[0].id);
        }
      } catch (err) {
        setError("Failed to load vehicle models.");
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel === null) {
      setVariants([]);
      setSelectedVariant(null);
      return;
    }

    variantFetchController.current?.abort();
    const controller = new AbortController();
    variantFetchController.current = controller;

    const loadVariants = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>(`/api/ScootyInventory/variants/${selectedModel}`, {
          signal: controller.signal,
        });
        setVariants(res.data);
        setSelectedVariant(res.data.length > 0 ? res.data[0].id : null);
      } catch (err) {
        if ((err as any)?.name !== "CanceledError") {
          setError("Failed to load vehicle variants.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadVariants();

    return () => controller.abort();
  }, [selectedModel]);

  useEffect(() => {
    if (selectedModel === null || selectedVariant === null) {
      setColours([]);
      setSelectedColour(null);
      return;
    }

    const loadColours = async () => {
      setLoading(true);
      try {
        const res = await axios.get<DropdownOption[]>(
          `/api/ScootyInventory/colours?modelId=${selectedModel}&variantId=${selectedVariant}`
        );
        setColours(res.data);
        setSelectedColour(res.data.length > 0 ? res.data[0].id : null);
      } catch {
        setError("Failed to load colours for the selected variant.");
      } finally {
        setLoading(false);
      }
    };

    loadColours();
  }, [selectedModel, selectedVariant]);

  const handleSubmit = async () => {
    if (!selectedModel || !selectedVariant) {
      setError("Please choose a model and variant before submitting.");
      setMessage("");
      return;
    }

    const formData = new FormData();
    formData.append("modelId", String(selectedModel));
    formData.append("variantId", String(selectedVariant));
    if (selectedColour !== null) formData.append("colourId", String(selectedColour));
    if (price.trim()) formData.append("price", price.trim());
    if (rangeKm.trim()) formData.append("rangeKm", rangeKm.trim());
    formData.append("stockAvailable", String(stockAvailable));
    if (imageFile) formData.append("image", imageFile);

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post("/api/ScootyInventory/add-item", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const createdId = res.data?.data?.scootyId ?? res.data?.data?.scootyId;
      if (!createdId) {
        setError("Vehicle item was created but no ID was returned.");
        return;
      }

      setMessage("Vehicle created successfully. Opening details...");
      window.setTimeout(() => navigate(`/vehicle/${createdId}`), 500);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data
        ? String(err.response.data)
        : "Failed to save new vehicle details.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const modelOptions = models.map((model) => (
    <option key={model.id} value={model.id}>{model.modelName ?? `Model ${model.id}`}</option>
  ));

  const variantOptions = variants.map((variant) => (
    <option key={variant.id} value={variant.id}>{variant.variantName ?? `Variant ${variant.id}`}</option>
  ));

  const colourOptions = colours.length > 0 ? colours.map((colour) => (
    <option key={colour.id} value={colour.id}>{colour.colourName ?? `Colour ${colour.id}`}</option>
  )) : [
    <option key="none" value="">No colour assigned</option>
  ];

  return (
    <div className="vehicle-details-page">
      <header className="pro-navbar vehicle-details-pro-navbar">
        <div className="pro-left">
          <img src={logo} className="pro-logo" alt="BGauss logo" />
          <div className="pro-text">
            <span className="pro-brand">BGauss Portal</span>
            <span className="pro-page">New Vehicle Details</span>
          </div>
        </div>

        <div className="pro-right vehicle-details-nav-buttons">
          <Tooltip text="Dashboard">
            <button className="vd-icon-btn vd-btn-dashboard" onClick={() => navigate("/dashboard")}> 
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
              </svg>
            </button>
          </Tooltip>
          <div className="vd-user-pill">
            <div className="desktop-avatar">{initial}</div>
            <div className="desktop-user-info">
              <span className="desktop-user-name">{username}</span>
              <span className="desktop-user-role">{role}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="vehicle-details-main">
        <section className="vehicle-details-state-card" style={{ maxWidth: 900, width: "100%" }}>
          <div className="vehicle-details-form-header">
            <h2>New Vehicle Entry</h2>
            <p>Fill in the required fields to add a vehicle record, then view details on the created item.</p>
          </div>

          {loading && <p>Loading form options…</p>}
          {error && <div className="vehicle-details-state-card vehicle-details-state-card-error"><p>{error}</p></div>}
          {message && <div className="vehicle-details-state-card vehicle-details-state-card-success"><p>{message}</p></div>}

          <div className="vd-form-grid">
            <div className="vd-form-group">
              <label>Model</label>
              <select value={selectedModel ?? ""} onChange={(e) => setSelectedModel(Number(e.target.value) || null)}>
                <option value="">Select model</option>
                {modelOptions}
              </select>
            </div>
            <div className="vd-form-group">
              <label>Variant</label>
              <select value={selectedVariant ?? ""} onChange={(e) => setSelectedVariant(Number(e.target.value) || null)}>
                <option value="">Select variant</option>
                {variantOptions}
              </select>
            </div>
            <div className="vd-form-group">
              <label>Colour</label>
              <select value={selectedColour ?? ""} onChange={(e) => setSelectedColour(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Select colour</option>
                {colourOptions}
              </select>
            </div>
            <div className="vd-form-group">
              <label>Price</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter price" />
            </div>
            <div className="vd-form-group">
              <label>Range (km)</label>
              <input type="number" value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} placeholder="Enter range" />
            </div>
            <div className="vd-form-group vd-checkbox-group">
              <label>Stock Available</label>
              <input
                type="checkbox"
                checked={stockAvailable}
                onChange={(e) => setStockAvailable(e.target.checked)}
              />
            </div>
            <div className="vd-form-group vd-file-group">
              <label>Image</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="veh-form-actions">
            <button className="vd-secondary-btn" onClick={() => navigate("/vehicle-entry")}>Back to Request</button>
            <button className="vd-primary-btn" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : "Save and View Details"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
