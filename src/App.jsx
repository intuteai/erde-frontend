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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

axios.defaults.withCredentials = true;

// Module-level so the queue survives re-renders and isn't reset between interceptor calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  failedQueue = [];
};

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // On mount: check session, silently refresh if access_token is missing/expired
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, { _retry: true });
        setUser(res.data.user);
      } catch (err) {
        if (err.response?.status === 401) {
          try {
            await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
              withCredentials: true,
              _retry: true,
            });
            const res = await axios.get(`${API_BASE_URL}/api/auth/me`, { _retry: true });
            setUser(res.data.user);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Listen for login events dispatched by LoginModal
  useEffect(() => {
    const handleAuthLogin = (e) => {
      setUser(e.detail.user);
    };
    window.addEventListener("auth:login", handleAuthLogin);
    return () => window.removeEventListener("auth:login", handleAuthLogin);
  }, []);

  // Navigate based on user state changes
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      setShowLogin(false);
      const isLoginPage =
        location.pathname === "/" || location.pathname === "/login";
      if (isLoginPage) {
        const redirectTo =
          user.role === "admin" ? "/admin/splash" : "/customer/splash";
        navigate(redirectTo, { replace: true });
      }
    } else {
      setShowLogin(true);
      if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    }
  }, [user, authLoading, location.pathname, navigate]);

  // Axios 401 interceptor — silently refresh then retry
  useEffect(() => {
    isRefreshing = false;
    failedQueue = [];

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => axios(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true, _retry: true }
          );
          processQueue(null);
          return axios(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr);
          setUser(null);
          navigate("/", { replace: true });
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.warn("Logout request failed:", err.message);
    }
    setUser(null);
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
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f17]">
          <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : (
        <Routes>
          {/* Root / Login */}
          <Route
            path="/"
            element={
              showLogin || !user ? (
                <LoginModal setShowLogin={setShowLogin} />
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
      )}
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
