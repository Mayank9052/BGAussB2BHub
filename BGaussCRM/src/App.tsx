import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import VehicleDetails from "./VehicleDetails";
import Modules from "./Modules";
import B2BCustomer from "./B2BCustomer";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/vehicle/:id" element={<VehicleDetails />} />
      <Route path="/modules" element={<Modules />} />
      <Route path="/b2b-customers" element={<B2BCustomer />} />
    </Routes>
  );
}

export default App;