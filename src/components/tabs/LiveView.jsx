import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const LIVE_THRESHOLD_MS = 15000;

// Color helpers (matching mobile app exactly)
const tempColor = (t) => {
  if (t == null || !Number.isFinite(t)) return "#94a3b8";
  if (t <= 45) return "#22c55e"; // green
  if (t <= 55) return "#facc15"; // yellow
  return "#ef4444"; // red
};

const cellBoxColor = (v, avg) => {
  if (v == null || avg == null) return "#94a3b8";
  const delta = v - avg;
  if (delta > 0.10) return "#ef4444";
  if (delta > 0.05) return "#f59e0b";
  if (delta < -0.10) return "#3b82f6";
  if (delta < -0.05) return "#22c55e";
  return "#94a3b8";
};

// Format helpers
const fmt1 = (n) => (n == null || !Number.isFinite(n) ? "–" : n.toFixed(1));
const fmt3 = (n) => (n == null || !Number.isFinite(n) ? "–" : n.toFixed(3));

export default function LiveView() {
  const { id } = useParams();
  const [live, setLive] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [showTempModal, setShowTempModal] = useState(false);
  const [showVoltageModal, setShowVoltageModal] = useState(false);

  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid vehicle ID");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view live data");
      setLoading(false);
      return;
    }

    const fetchSnapshot = async () => {
      try {
        const res = await fetch(`/api/vehicles/${id}/live`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed: ${res.status} ${text || res.statusText}`);
        }
        const data = await res.json();
        setLive(data);
        if (data.recorded_at) {
          setLastUpdateTime(new Date(data.recorded_at));
        }
        setError(null);
      } catch (err) {
        console.error("Snapshot error:", err);
        setError("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/vehicles/${id}/stream?token=${token}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLive(data);
        if (data.recorded_at) {
          const newTime = new Date(data.recorded_at);
          setLastUpdateTime(newTime);
        }
        setError(null);
      } catch (e) {
        console.error("Parse error:", e);
      }
    };

    es.onerror = () => {
      console.warn("SSE disconnected – will auto-reconnect");
      setError("Live stream lost – showing last known data");
    };

    es.onopen = () => {
      console.log("SSE connected");
      setError(null);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [id]);

  const isActivelyLive = lastUpdateTime
    ? Date.now() - lastUpdateTime.getTime() < LIVE_THRESHOLD_MS
    : false;

  const formatTimestamp = (date) =>
    date
      ? date.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      : "–";

  const HoursToHrMin = ({ hours }) => {
    if (hours == null || hours === 0) {
      return <span className="text-orange-300 font-semibold">0 hr 0 mins</span>;
    }
    const totalMinutes = Math.round(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return <span className="text-orange-300 font-semibold">{mins} mins</span>;
    return (
      <span className="text-orange-300 font-semibold">
        {hrs} hr{mins > 0 ? ` ${mins} mins` : ""}
      </span>
    );
  };

  const Val = ({ v, unit = "", fixed = 2 }) => (
    <span className="text-orange-300 font-semibold">
      {v == null ? "–" : `${Number(v).toFixed(fixed)}${unit}`}
    </span>
  );

  const Section = ({ title, children }) => (
    <div className="bg-gray-900/60 rounded-lg p-5 border border-orange-500/30">
      <h3 className="text-lg font-medium text-orange-400 mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Item = ({ name, value }) => (
    <div className="flex justify-between items-center bg-gray-800/30 px-4 py-2 rounded-md">
      <span className="text-gray-300">{name}</span>
      <span className="text-orange-300 font-medium">{value ?? "–"}</span>
    </div>
  );

  const Divider = ({ label }) => (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="flex-1 h-px bg-orange-500/20" />
      {label && <span className="text-[11px] text-orange-500/60 uppercase tracking-widest">{label}</span>}
      <div className="flex-1 h-px bg-orange-500/20" />
    </div>
  );

  // ────────────────────────────────────────────────
  const tempPackStats = live.temp_pack_stats ?? {};
  const voltagePackStats = live.cell_pack_stats ?? {};

  if (loading && !Object.keys(live).length) {
    return <div className="text-center py-12 text-orange-200">Loading live data…</div>;
  }

  if (error && !Object.keys(live).length) {
    return <div className="text-center py-12 text-red-400">Error: {error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
          Live Vehicle Data
        </h1>
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${
              isActivelyLive
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/80"
                : "bg-gray-700/40 text-gray-400 border border-gray-600/60"
            }`}
          >
            <span className={isActivelyLive ? "animate-pulse" : ""}>●</span>
            {isActivelyLive ? "LIVE" : "Last Known"}
          </span>
          <div className="text-right">
            <div className="text-xs text-gray-500">Updated</div>
            <div className="text-sm text-orange-300 font-medium">
              {formatTimestamp(lastUpdateTime)}
            </div>
          </div>
        </div>
        {error && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 mt-3">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Battery / BMS / Charger ── */}
        <Section title="Battery / BMS / Charger">
          <Item name="State of Charge" value={<Val v={live.soc_percent} unit="%" fixed={1} />} />
          <Item name="Battery Status" value={live.battery_status ?? "–"} />
          <Item name="Stack Voltage" value={<Val v={live.stack_voltage_v} unit="V" />} />
          <Item name="DC Output Current" value={<Val v={live.dc_current_a} unit="A" />} />
          <Item name="Output Power" value={<Val v={live.output_power_kw} unit="kW" />} />
          <Item name="Charging Current" value={<Val v={live.charging_current_a} unit="A" />} />
          <Item
            name="Temperature Sensors"
            value={
              <button
                onClick={() => setShowTempModal(true)}
                className="text-orange-400 font-semibold underline hover:text-orange-300 transition"
              >
                View All → Modules
              </button>
            }
          />
          <Item
            name="Cell Voltages"
            value={
              <button
                onClick={() => setShowVoltageModal(true)}
                className="text-emerald-400 font-semibold underline hover:text-emerald-300 transition"
              >
                View All → Modules
              </button>
            }
          />

          {/* BMS-reported pack voltage stats */}
          <Divider label="Pack Voltage (BMS)" />
          <Item name="Max Cell Voltage" value={<Val v={live.max_voltage_v} unit="V" fixed={3} />} />
          <Item name="Min Cell Voltage" value={<Val v={live.min_voltage_v} unit="V" fixed={3} />} />
          <Item name="Avg Cell Voltage" value={<Val v={live.avg_voltage_v} unit="V" fixed={3} />} />

          {/* BMS-reported pack temperature stats */}
          <Divider label="Pack Temperature (BMS)" />
          <Item name="Max Temperature" value={<Val v={live.max_temp_c} unit="°C" fixed={1} />} />
          <Item name="Min Temperature" value={<Val v={live.min_temp_c} unit="°C" fixed={1} />} />
          <Item name="Avg Temperature" value={<Val v={live.avg_temp_c} unit="°C" fixed={1} />} />
        </Section>

        {/* ── Motor & MCU ── */}
        <Section title="Motor & MCU">
          <Item name="Torque" value={<Val v={live.motor_torque_nm} unit="Nm" />} />
          <Item name="Operation Mode" value={live.motor_operation_mode ?? "–"} />
          <Item name="Speed" value={<Val v={live.motor_speed_rpm} fixed={0} unit=" RPM" />} />
          <Item name="AC Current" value={<Val v={live.ac_current_a} unit="A" />} />
          <Item name="Torque Limit" value={<Val v={live.motor_torque_limit} unit="Nm" />} />
          <Item name="Rotation Direction" value={live.motor_rotation_dir ?? "–"} />
          <Item name="Motor Temperature" value={<Val v={live.motor_temp_c} unit="°C" />} />
          <Item name="AC Voltage" value={<Val v={live.motor_ac_voltage_v} unit="V" />} />
          <Item name="MCU Enable State" value={live.mcu_enable_state ?? "–"} />
          <Item name="MCU Temperature" value={<Val v={live.mcu_temp_c} unit="°C" />} />
          <Item name="DC Side Voltage" value={<Val v={live.dc_side_voltage_v} unit="V" />} />
          <Item name="Status Word" value={live.motor_status_word ?? "–"} />
          <Item name="Frequency Raw" value={live.motor_freq_raw ?? "–"} />
          <Item name="Total Wattage" value={<Val v={live.motor_total_wattage_w} unit="W" fixed={0} />} />
        </Section>

        {/* ── Peripherals ── */}
        <Section title="Peripherals Live Data">
          <Item
            name="Radiator Temperature"
            value={<Val v={live.radiator_temp_c} unit="°C" fixed={1} />}
          />
          <Item name="Hydraulic Oil Temperature" value="–" />
          <Item name="Hydraulic Pump RPM" value="–" />
        </Section>

        {/* ── ODO / Trip ── */}
        <Section title="ODO / Trip Details">
          <Item name="Total Running Hours" value={<HoursToHrMin hours={live.total_hours} />} />
          <Item name="Last Trip Hours" value={<HoursToHrMin hours={live.last_trip_hrs} />} />
          <Item
            name="Total kWh Consumed"
            value={<Val v={live.total_kwh} fixed={1} unit=" kWh" />}
          />
          <Item
            name="kWh Used in Last Trip"
            value={<Val v={live.last_trip_kwh} fixed={1} unit=" kWh" />}
          />
        </Section>

        {/* ── DC-DC Converter ── */}
        <Section title="DC-DC Converter">
          <Item name="Input Voltage" value={<Val v={live.dcdc_input_voltage_v} unit="V" />} />
          <Item name="Input Current" value={<Val v={live.dcdc_input_current_a} unit="A" />} />
          <Item
            name="Input Power"
            value={
              live.dcdc_input_voltage_v != null && live.dcdc_input_current_a != null
                ? <Val v={(live.dcdc_input_voltage_v * live.dcdc_input_current_a) / 1000} unit="kW" />
                : "–"
            }
          />
          <Item name="Output Voltage" value={<Val v={live.dcdc_output_voltage_v} unit="V" />} />
          <Item name="Output Current" value={<Val v={live.dcdc_output_current_a} unit="A" />} />
          <Item name="Max Temperature" value={<Val v={live.dcdc_max_temp_c} unit="°C" />} />
          <Item name="Pri A MOSFET Temp" value={<Val v={live.dcdc_pri_a_mosfet_temp_c} unit="°C" />} />
          <Item name="Pri C MOSFET Temp" value={<Val v={live.dcdc_pri_c_mosfet_temp_c} unit="°C" />} />
          <Item name="Sec LS MOSFET Temp" value={<Val v={live.dcdc_sec_ls_mosfet_temp_c} unit="°C" />} />
          <Item name="Sec HS MOSFET Temp" value={<Val v={live.dcdc_sec_hs_mosfet_temp_c} unit="°C" />} />
          <Item name="Overcurrent Fault Count" value={live.dcdc_occurrence_count ?? "–"} />
        </Section>

        {/* ── BTMS ── */}
        <Section title="BTMS (Thermal Management)">
          <Item name="Command Mode" value={live.btms_command_mode ?? "–"} />
          <Item
            name="Status Mode"
            value={live.btms_status_mode != null ? live.btms_status_mode : "–"}
          />
          <Item
            name="HV Request"
            value={
              live.btms_hv_request === 0
                ? "ON"
                : live.btms_hv_request === 1
                ? "OFF"
                : "–"
            }
          />
          <Item name="Charge Status" value={live.btms_charge_status ?? "–"} />
          <Item
            name="HV Relay State (BMS)"
            value={
              live.bms_hv_relay_state === 1
                ? "CLOSED"
                : live.bms_hv_relay_state === 0
                ? "OPEN"
                : "–"
            }
          />
          <Item
            name="HV Relay State (BTMS)"
            value={
              live.btms_hv_relay_state === 1
                ? "CLOSED"
                : live.btms_hv_relay_state === 0
                ? "OPEN"
                : "–"
            }
          />
          <Item name="Target Temp" value={<Val v={live.btms_target_temp_c} unit="°C" />} />
          <Item name="Inlet Temp" value={<Val v={live.btms_inlet_temp_c} unit="°C" />} />
          <Item name="Outlet Temp" value={<Val v={live.btms_outlet_temp_c} unit="°C" />} />
          <Item
            name="Demand Power"
            value={<Val v={live.btms_demand_power_kw} unit="kW" fixed={1} />}
          />
          <Item name="Pack Voltage (BMS)" value={<Val v={live.bms_pack_voltage_v} unit="V" />} />
          <Item name="BMS Life Counter" value={live.bms_life_counter ?? "–"} />
        </Section>

        {/* ── Air Compressor ── */}
        <Section title="Air Compressor">
          <Item
            name="Input Voltage"
            value={<Val v={live.compressor_input_voltage_v} unit="V" />}
          />
          <Item
            name="Input Current"
            value={<Val v={live.compressor_input_current_a} unit="A" />}
          />
          <Item
            name="Input Power"
            value={
              live.compressor_input_voltage_v != null && live.compressor_input_current_a != null
                ? <Val v={(live.compressor_input_voltage_v * live.compressor_input_current_a) / 1000} unit="kW" />
                : "–"
            }
          />
          <Item
            name="Output Voltage"
            value={<Val v={live.compressor_output_voltage_v} unit="V" />}
          />
          <Item
            name="Output Current"
            value={<Val v={live.compressor_output_current_a} unit="A" />}
          />
          <Item
            name="Output Power"
            value={
              live.compressor_output_voltage_v != null && live.compressor_output_current_a != null
                ? <Val v={(live.compressor_output_voltage_v * live.compressor_output_current_a) / 1000} unit="kW" />
                : "–"
            }
          />
        </Section>

        {/* ── Alarms ── */}
        <div className="md:col-span-2">
          <Section title="Alarms & Warnings">
            {Object.entries(live)
              .filter(([key]) => key.startsWith("alarms_"))
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center bg-gray-800/40 px-3 py-2 rounded-md text-sm border border-orange-500/20"
                >
                  <span className="text-gray-300 capitalize">
                    {key.replace("alarms_", "").replace(/_/g, " ")}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      value
                        ? "bg-red-600/20 text-red-300"
                        : "bg-emerald-600/20 text-emerald-300"
                    }`}
                  >
                    {value ? "ACTIVE" : "OK"}
                  </span>
                </div>
              ))}
            {Object.keys(live).filter((k) => k.startsWith("alarms_")).length === 0 && (
              <div className="text-gray-500 text-center py-4">No alarm data available</div>
            )}
          </Section>
        </div>
      </div>

      {/* ================= TEMPERATURE SENSORS MODAL ================= */}
      {showTempModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTempModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-gray-900 to-orange-950/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-orange-500/40 shadow-2xl shadow-orange-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 bg-gradient-to-r from-orange-900/40 via-gray-800/70 to-amber-900/40 border-b border-orange-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-300 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                    Temperature Sensors
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                    {(live.temp_modules?.length ?? 0)} Modules
                  </p>
                </div>
                <button
                  onClick={() => setShowTempModal(false)}
                  className="text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300 text-3xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pack stats */}
            <div className="p-4 bg-gradient-to-b from-gray-800/60 to-gray-800/30 border-b border-orange-500/20">
              <div className="flex flex-wrap gap-3 justify-center mb-3">
                <div
                  className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner"
                  style={{ borderColor: tempColor(tempPackStats.max_c) }}
                >
                  <div className="text-xs text-gray-400">Max</div>
                  <div className="text-lg font-bold" style={{ color: tempColor(tempPackStats.max_c) }}>
                    {fmt1(tempPackStats.max_c)}°C
                  </div>
                </div>
                <div
                  className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner"
                  style={{ borderColor: tempColor(tempPackStats.avg_c) }}
                >
                  <div className="text-xs text-gray-400">Avg</div>
                  <div className="text-lg font-bold" style={{ color: tempColor(tempPackStats.avg_c) }}>
                    {fmt1(tempPackStats.avg_c)}°C
                  </div>
                </div>
                <div
                  className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner"
                  style={{ borderColor: tempColor(tempPackStats.min_c) }}
                >
                  <div className="text-xs text-gray-400">Min</div>
                  <div className="text-lg font-bold" style={{ color: tempColor(tempPackStats.min_c) }}>
                    {fmt1(tempPackStats.min_c)}°C
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                <div className="px-3 py-1.5 rounded border border-green-500 bg-green-500/10 text-green-400">
                  ≤45°C Optimal
                </div>
                <div className="px-3 py-1.5 rounded border border-yellow-400 bg-yellow-400/10 text-yellow-400">
                  45–55°C Elevated
                </div>
                <div className="px-3 py-1.5 rounded border border-red-500 bg-red-500/10 text-red-400">
                  ≥55°C Critical
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="overflow-y-auto max-h-[58vh] p-4">
              {(live.temp_modules ?? []).map((moduleValues, i) => {
                const moduleStats = live.temp_module_stats?.[i] ?? {};
                const moduleBorder =
                  moduleStats.status === "CRITICAL" ? "border-red-500" :
                  moduleStats.status === "WARN"     ? "border-yellow-500/70" :
                  "border-green-500/60";

                return (
                  <div
                    key={i}
                    className={`mb-5 bg-gray-800/40 rounded-lg p-4 border-2 ${moduleBorder}`}
                  >
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                      <h3 className="text-base font-bold text-orange-300">Module {i + 1}</h3>
                      <div className="flex gap-2 text-xs flex-wrap">
                        <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30">
                          Min: {fmt1(moduleStats.min_c)}°C
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                          Max: {fmt1(moduleStats.max_c)}°C
                        </span>
                        {moduleStats.status && (
                          <span
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              moduleStats.status === "CRITICAL" ? "bg-red-600/30 text-red-300 border border-red-500/40" :
                              moduleStats.status === "WARN"     ? "bg-yellow-600/30 text-yellow-300 border border-yellow-500/40" :
                              "bg-green-600/30 text-green-300 border border-green-500/40"
                            }`}
                          >
                            {moduleStats.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                      {moduleValues.map((t, j) => (
                        <div
                          key={j}
                          className="bg-gray-900/60 border-2 rounded-md px-1.5 py-1.5 text-center hover:scale-105 transition-all"
                          style={{ borderColor: tempColor(t) }}
                        >
                          <div className="text-[9px] text-gray-500">#{j + 1}</div>
                          <div className="text-xs font-bold" style={{ color: tempColor(t) }}>
                            {fmt1(t)}
                          </div>
                          <div className="text-[8px] text-gray-500">°C</div>
                        </div>
                      ))}
                      {moduleValues.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-8">
                          No temperature data for this module
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(live.temp_modules ?? []).length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No temperature module data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CELL VOLTAGES MODAL ================= */}
      {showVoltageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowVoltageModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-emerald-500/40 shadow-2xl shadow-emerald-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-900/40 via-gray-800/70 to-teal-900/40 border-b border-emerald-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Cell Voltages
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    {(live.cell_modules?.length ?? 0)} Modules
                  </p>
                </div>
                <button
                  onClick={() => setShowVoltageModal(false)}
                  className="text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300 text-3xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pack stats */}
            <div className="p-4 bg-gradient-to-b from-gray-800/60 to-gray-800/30 border-b border-emerald-500/20">
              <div className="flex flex-wrap gap-3 justify-center mb-3">
                <div className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner border-red-500">
                  <div className="text-xs text-gray-400">Max</div>
                  <div className="text-lg font-bold text-red-400">{fmt3(voltagePackStats.max_v)}V</div>
                </div>
                <div className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner border-yellow-400">
                  <div className="text-xs text-gray-400">Avg</div>
                  <div className="text-lg font-bold text-yellow-400">{fmt3(voltagePackStats.avg_v)}V</div>
                </div>
                <div className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner border-green-500">
                  <div className="text-xs text-gray-400">Min</div>
                  <div className="text-lg font-bold text-green-400">{fmt3(voltagePackStats.min_v)}V</div>
                </div>
                <div className="px-4 py-2 rounded-lg border-2 bg-gray-800/80 shadow-inner border-red-500">
                  <div className="text-xs text-gray-400">Outliers</div>
                  <div className="text-lg font-bold text-red-400">
                    ±0.10V: {voltagePackStats.outliers ?? 0}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                <div className="px-3 py-1.5 rounded border border-red-500 bg-red-500/10 text-red-400">
                  ≥ +0.10V Critical High
                </div>
                <div className="px-3 py-1.5 rounded border border-amber-500 bg-amber-500/10 text-amber-400">
                  +0.05 to +0.10V High
                </div>
                <div className="px-3 py-1.5 rounded border border-green-500 bg-green-500/10 text-green-400">
                  -0.05 to -0.10V Low
                </div>
                <div className="px-3 py-1.5 rounded border border-blue-500 bg-blue-500/10 text-blue-400">
                  ≤ -0.10V Critical Low
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="overflow-y-auto max-h-[58vh] p-4">
              {(live.cell_modules ?? []).map((moduleValues, i) => {
                const moduleStats = live.cell_module_stats?.[i] ?? {};
                return (
                  <div
                    key={i}
                    className="mb-5 bg-gray-800/40 rounded-lg p-4 border border-emerald-500/20"
                  >
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                      <h3 className="text-base font-bold text-emerald-300">Module {i + 1}</h3>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30">
                          Min: {fmt3(moduleStats.min_v)}V
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                          Max: {fmt3(moduleStats.max_v)}V
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                      {moduleValues.map((v, j) => (
                        <div
                          key={j}
                          className="bg-gray-900/60 border-2 rounded-md px-1.5 py-1.5 text-center hover:scale-105 transition-all"
                          style={{ borderColor: cellBoxColor(v, voltagePackStats.avg_v) }}
                        >
                          <div className="text-[9px] text-gray-500">#{j + 1}</div>
                          <div
                            className="text-xs font-bold"
                            style={{ color: cellBoxColor(v, voltagePackStats.avg_v) }}
                          >
                            {fmt3(v)}
                          </div>
                          <div className="text-[8px] text-gray-500">V</div>
                        </div>
                      ))}
                      {moduleValues.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-8">
                          No voltage data for this module
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(live.cell_modules ?? []).length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No cell voltage module data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}