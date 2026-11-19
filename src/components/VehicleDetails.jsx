import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

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
  // The URL's :id is the source of truth for which vehicle is shown — not
  // just localStorage's cached selection, which only updated on a row
  // click and never reacted to the URL changing (e.g. the vehicle-jump
  // dropdown below, or a bookmarked link to a different vehicle).
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Live View");
  // Every vehicle this user can see, sorted by vehicle_master_id — fetched
  // once (role-scoped: admin sees the whole fleet, customer sees only
  // their own, same as their respective dashboards), reused both to
  // display the header and to populate the vehicle-jump dropdown.
  const [navList, setNavList] = useState([]);
  // Blocks a second vehicle selection from firing while the previous
  // one's navigate() hasn't landed yet — see goToVehicle and the urlId
  // effect below.
  const navigatingRef = useRef(false);

  // Re-syncs `vehicle` to the URL's :id on every navigation, including
  // the vehicle-jump dropdown below (which only changes the URL, not a
  // fresh localStorage write before the component would otherwise
  // re-check it).
  useEffect(() => {
    const vehicleData = localStorage.getItem("selectedVehicle");
    if (vehicleData) {
      const parsed = JSON.parse(vehicleData);
      if (String(parsed.id) === String(urlId)) setVehicle(parsed);
    }
    // The URL has now genuinely caught up to the last selection — safe to
    // accept another one. See goToVehicle below.
    navigatingRef.current = false;
  }, [urlId]);

  useEffect(() => {
    axios.get("/api/auth/me")
      .then((res) => { if (res.data?.user) setUser(res.data.user); })
      .catch(() => {});
  }, []);

  // Fetch the nav list once we know the role — it doesn't change per
  // vehicle, only per user, so this doesn't re-run on Previous/Next.
  useEffect(() => {
    if (!user?.role) return;
    const isCust = user.role === "customer";
    const url = isCust ? "/api/vehicle-master/my" : "/api/vehicle-master/admin-summary";

    axios.get(url)
      .then(({ data }) => {
        const list = (data || [])
          .map((row) => isCust
            ? {
                id: row.vehicle_master_id,
                vehicleNo: row.vehicle_reg_no || "—",
                vehicleType: `${row.vehicle_make || ""} ${row.vehicle_model || ""}`.trim() || "—",
              }
            : {
                id: row.vehicle_master_id,
                vehicleNo: row.vehicle_no || "—",
                vehicleType: row.vehicle_type || "—",
                customer: row.customer || "—",
              }
          )
          .sort((a, b) => a.id - b.id);
        setNavList(list);

        // Correct `vehicle` from the authoritative fetch once it lands —
        // the localStorage read above is just a fast first paint, and is
        // the only source at all for a direct/bookmarked URL.
        const match = list.find((v) => String(v.id) === String(urlId));
        if (match) setVehicle((prev) => prev ?? match);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const goToVehicle = (target) => {
    if (!target || navigatingRef.current) return;
    navigatingRef.current = true;
    localStorage.setItem("selectedVehicle", JSON.stringify(target));
    setVehicle(target);
    navigate(`/vehicle/${target.id}`);
    // activeTab is intentionally left as-is — staying on, say, Battery
    // Analytics while paging through vehicles is the point.
  };

  if (!vehicle) return null;

  const isCustomer = user?.role === "customer";

  // Jump straight to any vehicle in one selection instead of paging through
  // Previous/Next — the client specifically asked not to need many clicks
  // to reach a distant vehicle (e.g. the 8th one).
  const handleVehicleSelect = (e) => {
    const target = navList.find((v) => String(v.id) === e.target.value);
    goToVehicle(target);
  };

  const VehicleSelect = ({ className = "" }) => (
    <select
      value={urlId ?? ""}
      onChange={handleVehicleSelect}
      disabled={navList.length === 0}
      aria-label="Jump to vehicle"
      className={`px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      {navList.map((v) => (
        <option key={v.id} value={String(v.id)} className="bg-gray-900 text-orange-200">
          {v.vehicleNo}{(isCustomer ? v.vehicleType : v.customer) ? ` — ${isCustomer ? v.vehicleType : v.customer}` : ""}
        </option>
      ))}
    </select>
  );

  /* ========================= CUSTOMER VIEW ========================= */
  if (isCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <div className="px-6 pt-10 pb-6 border-b border-orange-500/20">
          <div className="max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
            <div>
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
            <VehicleSelect />
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
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
              {vehicle.company_name || vehicle.customer || "Vehicle Details"}
            </h1>
            <p className="mt-2 text-lg text-orange-200/90">
              {vehicle.vehicleType || `${vehicle.make} ${vehicle.model}`} •{" "}
              {vehicle.vehicle_reg_no || vehicle.vehicleNo}
            </p>
          </div>
          <VehicleSelect />
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