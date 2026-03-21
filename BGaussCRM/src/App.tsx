import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import VehicleDetails from "./VehicleDetails";
import Modules from "./Modules";
import B2BCustomer from "./B2BCustomer";
import ScootyInventory from "./ScootyInventory"
import VehicleConfig from "./VehicleConfig";
import ModelPage from "./ModelPage";
import VariantPage from "./Variant";
import ColourPage from "./Colour";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/vehicle/:id" element={<VehicleDetails />} />
      <Route path="/modules" element={<Modules />} />
      <Route path="/b2b-customers" element={<B2BCustomer />} />
      <Route path ="/scootyInventory" element={<ScootyInventory/>}/>
      <Route path ="/vehicle-config" element={<VehicleConfig/>}/>
      <Route path="/vehicle-config/models" element={<ModelPage />} />
      <Route path="/vehicle-config/variants" element={<VariantPage />} />
      <Route path="/vehicle-config/colours" element={<ColourPage />} />
    </Routes>
  );
}

export default App;