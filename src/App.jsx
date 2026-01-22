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

// Layout & Auth
import LoginModal from "./components/LoginModal";
import Header from "./components/Header";
import FooterFixed from "./components/FooterFixed";

// Dashboards
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminSplash from "./components/AdminSplash";
import CustomerSplash from "./components/CustomerSplash";

// Vehicle
import VehicleDetails from "./components/VehicleDetails";
import VehicleLiveTrack from "./components/VehicleLiveTrack"; // ✅ NEW

// Masters
import CustomerMaster from "./components/masters/CustomerMaster";
import VehicleTypeMaster from "./components/masters/VehicleTypeMaster";
import VCUMaster from "./components/masters/VCUMaster";
import HMIMaster from "./components/masters/HMIMaster";
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

      const isLoginPage =
        location.pathname === "/" || location.pathname === "/login";

      if (isLoginPage) {
        const redirectTo =
          user.role === "admin" ? "/admin/splash" : "/customer/splash";
        navigate(redirectTo, { replace: true });
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

    const redirectTo = role === "admin" ? "/admin/splash" : "/customer/splash";
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setShowLogin(true);
    navigate("/", { replace: true });
  };

  /* =========================
     PROTECTED LAYOUT
  ========================= */
  const ProtectedLayout = ({ children, requiredRole }) => {
    if (!user) return <Navigate to="/" replace />;

    if (requiredRole && user.role !== requiredRole) {
      return (
        <Navigate
          to={user.role === "admin" ? "/admin" : "/dashboard"}
          replace
        />
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f17]">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-grow">{children}</main>
        <FooterFixed />
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Routes>
        {/* Root / Login */}
        <Route
          path="/"
          element={
            showLogin || !user ? (
              <LoginModal setShowLogin={setShowLogin} onSubmit={handleLogin} />
            ) : (
              <Navigate
                to={user.role === "admin" ? "/admin/splash" : "/dashboard"}
                replace
              />
            )
          }
        />

        {/* Splash Screens */}
        <Route
          path="/admin/splash"
          element={
            user && user.role === "admin" ? (
              <AdminSplash />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/customer/splash"
          element={
            user && user.role === "customer" ? (
              <CustomerSplash />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Dashboards */}
        <Route
          path="/admin"
          element={
            <ProtectedLayout requiredRole="admin">
              <AdminDashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedLayout requiredRole="customer">
              <CustomerDashboard />
            </ProtectedLayout>
          }
        />

        {/* Vehicle Details */}
        <Route
          path="/vehicle/:id"
          element={
            <ProtectedLayout>
              <VehicleDetails />
            </ProtectedLayout>
          }
        />

        {/* ✅ LIVE TRACKING (NEW) */}
        <Route
          path="/vehicle/:id/track"
          element={
            <ProtectedLayout>
              <VehicleLiveTrack />
            </ProtectedLayout>
          }
        />

        {/* Masters — Admin Only */}
        <Route
          path="/masters/customers"
          element={
            <ProtectedLayout requiredRole="admin">
              <CustomerMaster />
            </ProtectedLayout>
          }
        />

        <Route
          path="/masters/vehicle-types"
          element={
            <ProtectedLayout requiredRole="admin">
              <VehicleTypeMaster />
            </ProtectedLayout>
          }
        />

        <Route
          path="/masters/vcu"
          element={
            <ProtectedLayout requiredRole="admin">
              <VCUMaster />
            </ProtectedLayout>
          }
        />

        <Route
          path="/masters/hmi"
          element={
            <ProtectedLayout requiredRole="admin">
              <HMIMaster />
            </ProtectedLayout>
          }
        />

        <Route
          path="/masters/vehicles"
          element={
            <ProtectedLayout requiredRole="admin">
              <VehicleMaster />
            </ProtectedLayout>
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"
              }
              replace
            />
          }
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
