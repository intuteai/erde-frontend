// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import axios from "axios";

// Only importing files that exist
import LoginModal from "./components/LoginModal";
import Header from "./components/Header";
import FooterFixed from "./components/FooterFixed";
import AdminDashboard from "./components/AdminDashboard";
import VehicleDetails from "./components/VehicleDetails";
import CustomerMaster from "./components/masters/CustomerMaster";
import VehicleTypeMaster from "./components/masters/VehicleTypeMaster";
import VcuHmiMaster from "./components/masters/VcuHmiMaster";
import VehicleMaster from "./components/masters/VehicleMaster";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (err) {
      console.error("Error parsing user from localStorage:", err.message);
      return null;
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      setShowLogin(false);
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
      if (location.pathname === "/" || location.pathname === "/login") {
        navigate("/admin", { replace: true });
      }
    } else {
      setShowLogin(true);
      delete axios.defaults.headers.common["Authorization"];
      if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  const handleLogin = (role, name, token, email) => {
    const newUser = { role, name, token, email };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    setShowLogin(false);
    navigate("/admin", { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setShowLogin(true);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen">
      <Routes>
        {/* Login / root */}
        <Route
          path="/"
          element={
            showLogin || !user ? (
              <LoginModal setShowLogin={setShowLogin} onSubmit={handleLogin} />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <AdminDashboard user={user} />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Vehicle details */}
        <Route
          path="/vehicle/:id"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <VehicleDetails user={user} />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Masters */}
        <Route
          path="/masters/customers"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <CustomerMaster />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/masters/vehicle-types"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <VehicleTypeMaster />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/masters/vcu-hmi"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <VcuHmiMaster />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/masters/vehicles"
          element={
            user ? (
              <div className="min-h-screen flex flex-col bg-[#0b0f17]">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-grow">
                  <VehicleMaster />
                </main>
                <FooterFixed />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to={user ? "/admin" : "/"} replace />}
        />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
