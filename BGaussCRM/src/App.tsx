import { Routes, Route } from "react-router-dom";
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
import Salespage from "./SalesPage"
import MyLikes from "./MyLikes";
import RoadPrice from "./RoadPrice";
import VehicleReviews from "./VehicleReviews";
/* 🔒 AUTH CHECK */
const ProtectedRoute = ({ children }: any) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <LoginPage />;
  }

  return children;
};

/* 🔒 ADMIN CHECK */
const AdminRoute = ({ children }: any) => {
  const role = localStorage.getItem("role");

  if (role !== "admin") {
    return <Dashboard />;
  }

  return children;
};

function App() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<LoginPage />} />

      {/* USER + ADMIN */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vehicle/:id"
        element={
          <ProtectedRoute>
            <VehicleDetails />
          </ProtectedRoute>
        }
      />

      {/* ADMIN ONLY */}
      <Route
        path="/modules"
        element={
          <AdminRoute>
            <Modules />
          </AdminRoute>
        }
      />

      <Route
        path="/b2b-customers"
        element={
          <AdminRoute>
            <B2BCustomer />
          </AdminRoute>
        }
      />

      <Route
        path="/scootyInventory"
        element={
          <AdminRoute>
            <ScootyInventory />
          </AdminRoute>
        }
      />

      <Route
        path="/vehicle-config"
        element={
          <AdminRoute>
            <VehicleConfig />
          </AdminRoute>
        }
      />

      <Route
        path="/vehicle-config/models"
        element={
          <AdminRoute>
            <ModelPage />
          </AdminRoute>
        }
      />

      <Route
        path="/vehicle-config/variants"
        element={
          <AdminRoute>
            <VariantPage />
          </AdminRoute>
        }
      />

      <Route
        path="/vehicle-config/colours"
        element={
          <AdminRoute>
            <ColourPage />
          </AdminRoute>
        }
      />

      <Route
        path="/sales"
        element={
          <AdminRoute>
            <Salespage />
          </AdminRoute>
        }
      />

      <Route path="/my-likes" element={<MyLikes />} />
      <Route path="/road-price/:id" element={<RoadPrice />} />
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reviews/:id" element={<VehicleReviews />} />
      
    </Routes>
  );
}

export default App;
