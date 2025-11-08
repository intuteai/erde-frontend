// src/components/LoginModal.jsx
import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, LogIn, AlertCircle } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import veloConnectLogo from "../assets/VeloConnectwb.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * @typedef {Object} LoginModalProps
 * @property {() => void} [onClose] - Optional close handler
 * @property {(payload: { token: string, user: any }) => void} [onAuth] - Optional callback to push auth state up
 */

/** @param {LoginModalProps} props */
export default function LoginModal({ onClose, onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Both email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const { token, user } = data;

      // SAVE JWT TOKEN (CRITICAL FOR LIVE DATA)
      localStorage.setItem("token", token);

      // Save user info + token
      const authPayload = {
        token,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      localStorage.setItem("user", JSON.stringify(authPayload));

      // SAVE PASSWORD FOR MASTER DB ACCESS (as you already do)
      localStorage.setItem("loginPassword", password);

      // Notify parent component
      if (typeof onAuth === "function") {
        try { onAuth({ token, user }); } catch (e) { console.error(e); }
      }

      // Fire global event
      try {
        window.dispatchEvent(new CustomEvent("auth:login", { detail: { token, user } }));
      } catch (e) { console.error(e); }

      // Navigate based on role
      const target = user.role === "admin" ? "/admin/dashboard" : "/dashboard";
      navigate(target, { replace: true, state: { fromLogin: true, ts: Date.now() } });

      // Fallback redirect
      setTimeout(() => {
        if (window.location.pathname !== target) {
          window.location.replace(target);
        }
      }, 50);

      onClose?.();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Invalid credentials. Please try again.";
      setError(message);
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) handleLogin();
  };

  const handleReset = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("loginPassword");
    setEmail("");
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
            animation: "grid-move 20s linear infinite",
          }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border-2 border-orange-500/20 animate-spin-slow" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr from-orange-500/10 to-red-500/10 animate-pulse-slow" />
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>

      <div className="relative w-full max-w-md">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-3xl border-2 border-orange-500/30 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />

          {loading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-3xl z-50">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <span className="text-white font-medium text-lg">
                  Authenticating...
                </span>
              </div>
            </div>
          )}

          <div className="p-8">
            <div className="text-center mb-6">
              <img
                src={veloConnectLogo}
                alt="VeloConnect"
                className="h-48 mx-auto opacity-95"
              />
              <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
                VELO CONNECT
              </h1>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div className="mb-6">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-orange-500/30 rounded-xl focus:border-orange-400 text-white placeholder-gray-400"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full pl-12 pr-14 py-4 bg-black/40 border border-orange-500/30 rounded-xl focus:border-orange-400 text-white placeholder-gray-400"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              onClick={handleReset}
              className="w-full mt-4 py-3 text-orange-300 border border-orange-500/30 rounded-xl hover:bg-orange-500/10 transition-colors"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}