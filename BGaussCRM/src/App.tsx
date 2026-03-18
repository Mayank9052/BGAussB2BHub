import { Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import VehicleDetails from "./VehicleDetails";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/vehicle/:id" element={<VehicleDetails />} />
    </Routes>
  );
}

export default App;