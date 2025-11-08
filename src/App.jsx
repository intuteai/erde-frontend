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

// Dashboards (Correct Paths)
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/CustomerDashboard";

// Other Components
import VehicleDetails from "./components/VehicleDetails";

// Masters
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

      const isLoginPage = location.pathname === "/" || location.pathname === "/login";
      if (isLoginPage) {
        const redirectTo = user.role === "admin" ? "/admin" : "/dashboard";
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

    const redirectTo = role === "admin" ? "/admin" : "/dashboard";
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setShowLogin(true);
    navigate("/", { replace: true });
  };

  // Protected Layout with Role Check
  const ProtectedLayout = ({ children, requiredRole }) => {
    if (!user) return <Navigate to="/" replace />;
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
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
              <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
            )
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedLayout requiredRole="admin">
              <AdminDashboard />
            </ProtectedLayout>
          }
        />

        {/* Customer Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout requiredRole="customer">
              <CustomerDashboard />
            </ProtectedLayout>
          }
        />

        {/* Vehicle Details (both roles) */}
        <Route
          path="/vehicle/:id"
          element={
            <ProtectedLayout>
              <VehicleDetails />
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
          path="/masters/vcu-hmi"
          element={
            <ProtectedLayout requiredRole="admin">
              <VcuHmiMaster />
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
              to={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}
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