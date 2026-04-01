// ─────────────────────────────────────────────
// FILE: src/App.tsx
// Added: SplashScreen shown once on first load
// ─────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import SplashScreen from "./SplashScreen";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import VehicleDetails from "./VehicleDetails";
import Modules from "./Modules";
import B2BCustomer from "./B2BCustomer";
import ScootyInventory from "./ScootyInventory";
import VehicleConfig from "./VehicleConfig";
import ModelPage from "./ModelPage";
import VariantPage from "./Variant";
import ColourPage from "./Colour";
import Salespage from "./SalesPage";
import MyLikes from "./MyLikes";
import RoadPrice from "./RoadPrice";
import VehicleReviews from "./VehicleReviews";
import EmiCalculatorWrapper from "./EmiCalculatorWrapper";
import ComparisonList   from "./ComparisonList";
import ComparisonDetail from "./ComparisonDetail";
import ComparisonManage from "./ComparisonManage";

/* ── Auth guards ──────────────────────────── */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) return <LoginPage />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem("role");
  if (role !== "admin") return <Dashboard />;
  return <>{children}</>;
};

/* ── App ───────────────────────────────────── */
function App() {
  // Show splash on first load. Once dismissed → never again in session.
  const [showSplash, setShowSplash] = useState(true);

  // Optional: skip splash if user is navigating back (already saw it)
  useEffect(() => {
    const seen = sessionStorage.getItem("splashSeen");
    if (seen) setShowSplash(false);
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem("splashSeen", "1");
    setShowSplash(false);
  };

  return (
    <>
      {/* Splash screen — shown once per session */}
      {showSplash && <SplashScreen onComplete={handleSplashDone} />}

      <Routes>

        {/* PUBLIC */}
        <Route path="/"      element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* USER + ADMIN */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/vehicle/:id" element={
          <ProtectedRoute><VehicleDetails /></ProtectedRoute>
        } />

        {/* ADMIN ONLY */}
        <Route path="/modules" element={
          <AdminRoute><Modules /></AdminRoute>
        } />

        <Route path="/b2b-customers" element={
          <AdminRoute><B2BCustomer /></AdminRoute>
        } />

        <Route path="/scootyInventory" element={
          <AdminRoute><ScootyInventory /></AdminRoute>
        } />

        <Route path="/vehicle-config" element={
          <AdminRoute><VehicleConfig /></AdminRoute>
        } />

        <Route path="/vehicle-config/models" element={
          <AdminRoute><ModelPage /></AdminRoute>
        } />

        <Route path="/vehicle-config/variants" element={
          <AdminRoute><VariantPage /></AdminRoute>
        } />

        <Route path="/vehicle-config/colours" element={
          <AdminRoute><ColourPage /></AdminRoute>
        } />

        <Route path="/sales" element={
          <AdminRoute><Salespage /></AdminRoute>
        } />

        {/* GENERAL */}
        <Route path="/my-likes"             element={<MyLikes />} />
        <Route path="/road-price/:id"       element={<RoadPrice />} />
        <Route path="/reviews/:id"          element={<VehicleReviews />} />
        <Route path="/emi-calculator/:id"   element={<EmiCalculatorWrapper />} />
        <Route path="/comparison"           element={<ComparisonList />} />
        <Route path="/comparison/:id1/:id2" element={<ComparisonDetail />} />
        <Route path="/comparison/manage"    element={<ComparisonManage />} />

      </Routes>
    </>
  );
}

export default App;