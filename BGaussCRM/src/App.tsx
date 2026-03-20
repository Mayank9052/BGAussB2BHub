import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import VehicleDetails from "./VehicleDetails";
import Modules from "./Modules";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/vehicle/:id" element={<VehicleDetails />} />
      <Route path="/modules" element={<Modules />} />
    </Routes>
  );
}

export default App;