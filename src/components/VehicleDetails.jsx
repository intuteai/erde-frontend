import React, { useEffect, useState } from "react";

/* ===== TAB IMPORTS ===== */
import LiveView from "./tabs/LiveView";
import MotorAnalytics from "./tabs/MotorAnalytics";
import BatteryAnalytics from "./tabs/BatteryAnalytics";
import MotorFaults from "./tabs/MotorFaults";
import DatabaseLogs from "./tabs/DatabaseLogs";
import DatabaseModuleExport from "./tabs/DatabaseModuleExport";
import LiveCharts from "./tabs/LiveCharts"; // ✅ NEW

/* ========================= PAGE SHELL ========================= */
export default function VehicleDetails() {
  const [vehicle, setVehicle] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Live View");

  useEffect(() => {
    const vehicleData = localStorage.getItem("selectedVehicle");
    if (vehicleData) setVehicle(JSON.parse(vehicleData));

    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
    }
  }, []);

  if (!vehicle) return null;

  const isCustomer = user?.role === "customer";

  /* ========================= CUSTOMER VIEW ========================= */
  if (isCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <div className="px-6 pt-10 pb-6 border-b border-orange-500/20">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
              {vehicle.company_name || vehicle.customer || "My Vehicle"}
            </h1>
            <p className="mt-2 text-lg text-orange-200/90">
              {vehicle.vehicleType || `${vehicle.make} ${vehicle.model}`} •{" "}
              {vehicle.vehicle_reg_no || vehicle.vehicleNo}
            </p>
            <p className="mt-4 text-sm text-orange-300/70 font-medium">
              Live Vehicle Monitoring
            </p>
          </div>
        </div>
        <div className="px-6 py-10">
          <div className="max-w-6xl mx-auto">
            <LiveView />
          </div>
        </div>
      </div>
    );
  }

  /* ========================= ADMIN VIEW ========================= */
  const tabs = [
    "Live View",
    "Live Charts",      // ✅ NEW TAB
    "Motor Analytics",
    "Battery Analytics",
    "Faults",
    "Database / Log",
    "Module Export",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* ===== HEADER ===== */}
      <div className="px-6 pt-10 pb-6 border-b border-orange-500/20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
            {vehicle.company_name || vehicle.customer || "Vehicle Details"}
          </h1>
          <p className="mt-2 text-lg text-orange-200/90">
            {vehicle.vehicleType || `${vehicle.make} ${vehicle.model}`} •{" "}
            {vehicle.vehicle_reg_no || vehicle.vehicleNo}
          </p>
        </div>
      </div>

      {/* ===== STICKY TABS ===== */}
      <div className="sticky top-[73px] z-10 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm border-b border-orange-500/20 shadow-lg">
        <div className="px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg border transition font-medium shadow ${
                  activeTab === tab
                    ? "border-orange-500 bg-orange-500/20 text-orange-300"
                    : "border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="px-6 py-10">
        <div className="max-w-6xl mx-auto">
          {activeTab === "Live View"         && <LiveView />}
          {activeTab === "Live Charts"       && <LiveCharts />}  {/* ✅ */}
          {activeTab === "Motor Analytics"   && <MotorAnalytics />}
          {activeTab === "Battery Analytics" && <BatteryAnalytics />}
          {activeTab === "Faults"      && <MotorFaults />}
          {activeTab === "Database / Log"    && <DatabaseLogs />}
          {activeTab === "Module Export"     && <DatabaseModuleExport />}
        </div>
      </div>
    </div>
  );
}