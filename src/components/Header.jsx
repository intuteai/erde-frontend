import React, { useState } from "react";
import { Power, Lock, Database, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import veloConnectLogo from "../assets/VeloConnectwb.png";

function Header({ user, onLogout, hideSidebar = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showMastersModal, setShowMastersModal] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => onLogout && onLogout();
  const toggleSidebar = () => setIsSidebarOpen(s => !s);

  const openPasswordModal = () => {
    setIsSidebarOpen(false);
    setPwd("");
    setPwdError("");
    setShowPwdModal(true);
  };

  const verifyPassword = (e) => {
    e?.preventDefault?.();
    const saved = localStorage.getItem("loginPassword");
    if (!saved) {
      setPwdError("No password saved from login.");
      return;
    }
    if (pwd.trim() === saved) {
      setShowPwdModal(false);
      setShowMastersModal(true);
    } else {
      setPwdError("Incorrect password. Please try again.");
    }
  };

  const masters = [
    { key: "customers", label: "Customer Database", to: "/masters/customers" },
    { key: "vehicle-types", label: "Vehicle Type Master Database", to: "/masters/vehicle-types" },
    { key: "vcu-hmi", label: "VCU / HMI Master Database", to: "/masters/vcu-hmi" },
    { key: "vehicles", label: "Vehicle Master Database", to: "/masters/vehicles" },
  ];

  const goTo = (to) => {
    setShowMastersModal(false);
    navigate(to);
  };

  return (
    <>
      {/* HEADER BAR (no Intute logo, no “secured by” text) */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white shadow-2xl sticky top-0 z-20 border-b-2 border-orange-500/30">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3 p-4 relative">
          {!hideSidebar && (
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

          {/* Centered VeloConnect logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <img src={veloConnectLogo} alt="VeloConnect Logo" className="h-32 opacity-95" />
          </div>

          {user && (
            <div className="ml-auto">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-lg hover:shadow-xl"
              >
                <Power className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* SIDEBAR */}
      {!hideSidebar && (
        <>
          <div
            className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out z-30 shadow-2xl border-r-2 border-orange-500/30`}
          >
            <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
              <div>
                <h2 className="text-lg font-bold">Menu</h2>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-4 space-y-3">
              <button
                onClick={openPasswordModal}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-orange-500/30 bg-gray-900/40 text-white hover:bg-orange-500/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-orange-400 group-hover:text-orange-300" />
                  <span className="font-medium">Edit Master Database</span>
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

      {/* PASSWORD MODAL */}
      {showPwdModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowPwdModal(false)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl border border-orange-500/30 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Confirm Password</h3>
            </div>
            <form onSubmit={verifyPassword} className="space-y-4">
  <div className="relative">
    <input
      type={showPwd ? "text" : "password"}
      value={pwd}
      onChange={(e) => setPwd(e.target.value)}
      placeholder="Password"
      autoComplete="current-password"
      className="w-full pr-12 pl-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
    />

    <button
      type="button"
      onClick={() => setShowPwd((v) => !v)}
      aria-label={showPwd ? "Hide password" : "Show password"}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-orange-500/10 text-orange-300"
    >
      {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  </div>

  {pwdError && (
    <div className="text-sm text-red-300 bg-red-900/20 border border-red-500/30 px-3 py-2 rounded-lg">
      {pwdError}
    </div>
  )}

  <div className="flex justify-end gap-3 pt-2">
    <button
      type="button"
      onClick={() => setShowPwdModal(false)}
      className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-200 hover:bg-orange-500/10"
    >
      Cancel
    </button>
    <button
      type="submit"
      className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white font-medium shadow hover:shadow-lg"
    >
      Continue
    </button>
  </div>
</form>

          </div>
        </div>
      )}

      {/* MASTERS MODAL */}
      {showMastersModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowMastersModal(false)} />
          <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-orange-500/30 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Master Databases</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {masters.map((m) => (
                <button
                  key={m.key}
                  onClick={() => goTo(m.to)}
                  className="text-left px-4 py-4 rounded-xl border border-orange-500/30 bg-gray-800/40 hover:bg-orange-500/10 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{m.label}</span>
                    <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                  </div>
                  <div className="mt-2 text-xs text-orange-200/70">View & edit records</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowMastersModal(false)}
                className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-200 hover:bg-orange-500/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
