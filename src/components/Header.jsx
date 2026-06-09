// src/components/Header.jsx
import React, { useState } from "react";
import {
  Power,
  Database,
  ArrowRight,
  LayoutDashboard,
  User,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import erdeLogo from "../assets/ERDE_HorizontalLogo_PNG.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Header({ user, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMastersModal, setShowMastersModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer";
  const showSidebar = isAdmin || isCustomer;

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/", { replace: true });
  };

  const toggleSidebar = () => setIsSidebarOpen((s) => !s);

  const masters = [
    { key: "customers", label: "Customer Database", to: "/masters/customers" },
    { key: "vehicle-types", label: "Vehicle Type Master Database", to: "/masters/vehicle-types" },
    { key: "vcu", label: "VCU Master Database", to: "/masters/vcu" },
    { key: "hmi", label: "HMI Master Database", to: "/masters/hmi" },
    { key: "vehicles", label: "Vehicle Master Database", to: "/masters/vehicles" },
  ];

  const goTo = (to) => {
    setShowMastersModal(false);
    navigate(to);
  };

  const goToDashboard = () => {
    setIsSidebarOpen(false);
    if (isAdmin) {
      navigate("/admin");
    } else if (isCustomer) {
      navigate("/dashboard");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: "New password must be at least 8 characters", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Password changed successfully!", type: "success" });
        setTimeout(() => {
          setShowProfileModal(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setMessage({ text: "", type: "" });
        }, 2000);
      } else {
        setMessage({ text: data.error || "Failed to change password", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* HEADER BAR */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white shadow-2xl sticky top-0 z-20 border-b-2 border-orange-500/30">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between p-4 relative">
          {showSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-3 rounded-xl bg-gray-800/50 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 transition-all border border-orange-500/20"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          )}

          <div className="absolute left-1/2 -translate-x-1/2">
            <img src={erdeLogo} alt="ERDE Logo" className="h-11 opacity-95" />
          </div>

          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-orange-300">{user.name}</p>
              <p className="text-xs text-orange-200/70">{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl text-white font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <Power className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      {showSidebar && (
        <>
          <div
            className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out z-30 shadow-2xl border-r-2 border-orange-500/30`}
          >
            <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
              <h2 className="text-lg font-bold">Menu</h2>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-4 space-y-3">
              {isAdmin && (
                <button
                  onClick={() => setShowMastersModal(true)}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-orange-500/30 bg-gray-900/40 text-white hover:bg-orange-500/10 transition group"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                    <span className="font-medium">Edit Master Database</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                </button>
              )}

              <button
                onClick={goToDashboard}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-orange-500/30 bg-gray-900/40 text-white hover:bg-orange-500/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                  <span className="font-medium">Go to Dashboard</span>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-orange-500/30 bg-gray-900/40 text-white hover:bg-orange-500/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                  <span className="font-medium">Edit Profile</span>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
              </button>
            </nav>
          </div>

          {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-20" onClick={toggleSidebar} />
          )}
        </>
      )}

      {/* MASTERS MODAL - FULLY FIXED & WORKING */}
      {isAdmin && showMastersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowMastersModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-gray-900 rounded-2xl border border-orange-500/40 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Database className="w-8 h-8 text-orange-400" />
                <h3 className="text-2xl font-bold text-white">Master Databases</h3>
              </div>
              <button
                onClick={() => setShowMastersModal(false)}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {masters.map((master) => (
                <button
                  key={master.key}
                  onClick={() => goTo(master.to)}
                  className="w-full flex items-center gap-4 px-6 py-5 rounded-xl bg-gray-800/50 border border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-400 transition-all group"
                >
                  <Settings className="w-6 h-6 text-orange-400 group-hover:text-orange-300" />
                  <span className="text-left text-white font-medium flex-1">
                    {master.label}
                  </span>
                  <ArrowRight className="w-5 h-5 text-orange-400 group-hover:text-orange-300 group-hover:translate-x-1 transition" />
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowMastersModal(false)}
                className="px-8 py-3 bg-gray-800 border border-orange-500/30 rounded-xl text-orange-200 hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL - CHANGE PASSWORD */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProfileModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-gray-900 rounded-2xl border border-orange-500/30 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-orange-400" />
              <h3 className="text-2xl font-bold text-white">Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-orange-200 mb-2">
                  Current Password
                </label>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-orange-500/30 rounded-lg text-white focus:border-orange-400 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-10 text-orange-400 hover:text-orange-300 transition"
                >
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-orange-200 mb-2">
                  New Password
                </label>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="8"
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-orange-500/30 rounded-lg text-white focus:border-orange-400 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-10 text-orange-400 hover:text-orange-300 transition"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-orange-200 mb-2">
                  Confirm New Password
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-orange-500/30 rounded-lg text-white focus:border-orange-400 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-10 text-orange-400 hover:text-orange-300 transition"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {message.text && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-500/20 text-green-300 border border-green-500/40"
                      : "bg-red-500/20 text-red-300 border border-red-500/40"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-xl font-bold text-white disabled:opacity-60 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-6 py-3 bg-gray-800 border border-orange-500/30 rounded-xl text-orange-200 hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;