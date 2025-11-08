/* src/components/VehicleDetails.jsx */
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ========================= PAGE SHELL ========================= */
export default function VehicleDetails() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState("Live View");

  useEffect(() => {
    const data = localStorage.getItem("selectedVehicle");
    if (data) setVehicle(JSON.parse(data));
  }, []);

  if (!vehicle) return null;

  const tabs = [
    "Live View",
    "Motor Analytics",
    "Battery Analytics",
    "Motor Faults",
    "Database / Log",
    "Troubleshooting",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto border-b border-orange-500/20 pb-6 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
          {vehicle.company_name || vehicle.customer}
        </h1>
        <p className="mt-2 text-lg text-orange-200/90">
          {vehicle.vehicleType || `${vehicle.make} ${vehicle.model}`} • {vehicle.vehicle_reg_no || vehicle.vehicleNo}
        </p>
      </div>

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

      <div className="max-w-6xl mx-auto mt-10">
        {activeTab === "Live View" && <LiveView />}
        {activeTab === "Motor Analytics" && <MotorAnalytics />}
        {activeTab === "Battery Analytics" && <BatteryAnalytics />}
        {activeTab === "Motor Faults" && <MotorFaults />}
        {activeTab === "Database / Log" && <DatabaseLogs />}
        {activeTab === "Troubleshooting" && <Troubleshooting />}
      </div>
    </div>
  );
}

/* ========================= LIVE VIEW ========================= */
function LiveView() {
  const { id } = useParams();
  const [live, setLive] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    const fetchLive = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in");

        const res = await fetch(`/api/vehicles/${id}/live`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }

        const data = await res.json();
        setLive(data);
        setError(null);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          setError(err.message);
          if (err.message.includes("401")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 500);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [id]);

  const Val = ({ v, unit = "", fixed = 2 }) => (
    <span className="text-orange-300 font-semibold">
      {v == null ? "–" : `${Number(v).toFixed(fixed)}${unit}`}
    </span>
  );

  if (loading && Object.keys(live).length === 0)
    return <div className="text-center py-12 text-orange-200">Loading live data…</div>;
  if (error) return <div className="text-center py-12 text-red-400">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold text-orange-300 mb-4 text-center">
        Live Data (Auto refresh every 500ms)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* === 1. BATTERY / BTMS / CHARGER === */}
        <Section title="Battery / BTMS / Charger Live Data">
          <Item name="State of Charge %" value={<Val v={live.soc_percent} fixed={1} />} />
          <Item name="State of Charge (kWh)" value={<Val v={live.battery_kwh} unit=" kWh" />} />
          <Item name="Battery Status" value={live.battery_status ?? "–"} />
          <Item name="BTMS Status" value={live.btms_status ?? "–"} />
          <Item name="Charger Status (gun connected/disconnected)" value={live.charger_connected ?? "–"} />
          <Item name="Temperature Sensors (Module 1)" value={<Val v={live.max_cell_temp_c} unit="°C" />} />
          <Item name="Temperature Sensors (Module 2)" value={<Val v={live.avg_cell_temp_c} unit="°C" />} />
          <Item name="Temperature Sensors (Module 3)" value={<Val v={live.max_cell_temp_c} unit="°C" />} />
          <Item name="Temperature Sensors (Module 4)" value={<Val v={live.avg_cell_temp_c} unit="°C" />} />
          <Item name="Temperature Sensors (Module 5)" value={<Val v={live.max_cell_temp_c} unit="°C" />} />
          <Item name="Cell Voltages (Module 1)" value={<Val v={live.stack_voltage_v} unit=" V" fixed={2} />} />
          <Item name="Cell Voltages (Module 2)" value={<Val v={live.stack_voltage_v} unit=" V" fixed={2} />} />
          <Item name="Cell Voltages (Module 3)" value={<Val v={live.stack_voltage_v} unit=" V" fixed={2} />} />
          <Item name="Cell Voltages (Module 4)" value={<Val v={live.stack_voltage_v} unit=" V" fixed={2} />} />
          <Item name="Cell Voltages (Module 5)" value={<Val v={live.stack_voltage_v} unit=" V" fixed={2} />} />
          <Item name="Output Current (DC)" value={<Val v={live.dc_current_a} unit=" A" />} />
          <Item name="Stack Voltage" value={<Val v={live.stack_voltage_v} unit=" V" />} />
          <Item name="Output Power" value={<Val v={live.output_power_kw} unit=" kW" />} />
          <Item name="BTMS Temperature" value={<Val v={live.hyd_oil_temp_c} unit="°C" />} />
          <Item name="Charging Current" value={<Val v={live.charging_current_a} unit=" A" />} />
        </Section>

        {/* === 2. MOTOR & MCU === */}
        <Section title="Motor & MCU Live Data">
          <Item name="Motor Torque" value={<Val v={live.motor_torque_nm} unit=" Nm" />} />
          <Item name="Operation Mode" value="Drive" />
          <Item name="Motor Speed (RPM)" value={<Val v={live.motor_speed_rpm} unit=" rpm" fixed={0} />} />
          <Item name="Motor AC Side Current" value={<Val v={live.ac_current_a} unit=" A" />} />
          <Item name="Motor Torque Limit Value" value="256 Nm" />
          <Item name="Motor Rotation Direction" value="Forward" />
          <Item name="Motor Temperature" value={<Val v={live.motor_temp_c} unit="°C" />} />
          <Item name="Motor AC Side Voltage" value={<Val v={live.motor_ac_voltage_v} unit=" V" />} />
          <Item name="MCU Enable State" value="Enabled" />
          <Item name="MCU Temperature" value={<Val v={live.mcu_temp_c} unit="°C" />} />
        </Section>

        {/* === 3. PERIPHERALS === */}
        <Section title="Peripherals Live Data">
          <Item name="Radiator Temperature" value={<Val v={live.hyd_oil_temp_c} unit="°C" />} />
          <Item name="Hydraulic Oil Temperature" value={<Val v={live.hyd_oil_temp_c} unit="°C" />} />
          <Item name="Hydraulic Pump RPM" value={<Val v={live.hyd_pump_rpm} unit=" rpm" fixed={0} />} />
          <Item name="Hydraulic Pump Motor Temperature" value={<Val v={live.motor_temp_c} unit="°C" />} />
          <Item name="DC/DC Converter Output Current" value={<Val v={live.dc_dc_current_a} unit=" A" fixed={1} />} />
          <Item name="DC/DC Converter Status" value="OK" />
        </Section>

        {/* === 4. ODO / TRIP === */}
        <Section title="ODO / Trip Details">
          <Item name="Total Running Hours" value={<Val v={live.total_hours} unit=" h" fixed={0} />} />
          <Item name="Last Trip Hours" value={<Val v={live.last_trip_hrs} unit=" h" fixed={1} />} />
          <Item name="Total kWh Consumed" value={<Val v={live.total_kwh} unit=" kWh" />} />
          <Item name="kWh Used in Last Trip" value={<Val v={live.last_trip_kwh} unit=" kWh" />} />
        </Section>

        {/* === 5. ALARMS === */}
        <Section title="Alarms & Warnings">
          {[
            "Hardware driver failure",
            "Bus overvoltage fault",
            "CAN offline failure",
            "Hardware overcurrent fault",
            "Software overcurrent fault",
            "Module over-temperature fault",
            "Module over-temperature warning",
            "Hardware overvoltage fault",
            "Total hardware failure",
            "Fan failure",
            "Stall failure",
            "Overspeed fault",
            "Motor over-temperature warning",
            "Low-voltage undervoltage fault",
            "Busbar undervoltage fault",
            "Encoder failure",
            "Motor over-temperature fault",
          ].map((fault) => {
            const key = fault.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const active = live[`alarms_${key}`] === true;
            return (
              <div
                key={fault}
                className="flex justify-between items-center bg-gray-800/40 px-3 py-2 rounded-md text-sm border border-orange-500/20"
              >
                <span className="text-gray-300">{fault}</span>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${
                    active
                      ? "bg-red-600/20 text-red-300 border border-red-500/40"
                      : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {active ? "YES" : "NO"}
                </span>
              </div>
            );
          })}
        </Section>
      </div>
    </div>
  );
}

/* ========================= MOTOR ANALYTICS ========================= */
function MotorAnalytics() {
  const { id } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/motor/analytics/${id}?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load motor analytics");
        const rows = await res.json();
        setData(rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const odo = useMemo(() => {
    const maxPower = Math.max(...data.map(d => d.max_op_power_kw || 0), 0);
    const maxTorque = Math.max(...data.map(d => d.max_op_torque_nm || 0), 0);
    const maxTemp = Math.max(...data.map(d => d.max_motor_temp_c || 0), 0);
    const totalEnergy = data.reduce((s, d) => s + (d.total_kwh_consumed || 0), 0);
    const avgPower = data.length ? totalEnergy / data.length : 0;
    return { maxPower, maxTorque, maxTemp, totalEnergy, avgPower };
  }, [data]);

  const trip = useMemo(() => {
    const last7 = data.slice(-7);
    const maxPower = Math.max(...last7.map(d => d.max_op_power_kw || 0), 0);
    const maxTorque = Math.max(...last7.map(d => d.max_op_torque_nm || 0), 0);
    const maxTemp = Math.max(...last7.map(d => d.max_motor_temp_c || 0), 0);
    const kwh = last7.reduce((s, d) => s + (d.total_kwh_consumed || 0), 0);
    return { maxPower, maxTorque, maxTemp, kwh };
  }, [data]);

  if (loading) return <div className="text-center py-12 text-orange-200">Loading motor analytics…</div>;
  if (error) return <div className="text-center py-12 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">Motor Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="ODO">
          <Stat label="Max O/P power delivered" value={odo.maxPower} unit="kW" />
          <Stat label="Max O/P torque delivered" value={odo.maxTorque} unit="Nm" />
          <Stat label="Max motor temperature" value={odo.maxTemp} unit="°C" warn={80} danger={95} />
          <Stat label="Total kWh Consumed (30 days)" value={odo.totalEnergy.toFixed(1)} unit="kWh" />
          <Stat label="Avg Power per Day" value={odo.avgPower.toFixed(1)} unit="kW" />
        </Section>

        <Section title="Trip Details (Last 7 Days)">
          <Stat label="Max O/P power delivered in last trip" value={trip.maxPower} unit="kW" />
          <Stat label="Max O/P torque delivered in last trip" value={trip.maxTorque} unit="Nm" />
          <Stat label="Max motor temperature in last trip" value={trip.maxTemp} unit="°C" warn={80} danger={95} />
          <Stat label="kWh consumed in last trip" value={trip.kwh.toFixed(1)} unit="kWh" />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Max Power (kW) — Last 30 Days">
          <BarChart data={data.map(d => ({ x: d.day, y: d.max_op_power_kw }))} />
        </ChartCard>
        <ChartCard title="Max Torque (Nm) — Last 30 Days">
          <BarChart data={data.map(d => ({ x: d.day, y: d.max_op_torque_nm }))} />
        </ChartCard>
        <ChartCard title="Max Motor Temp (°C) — Last 30 Days">
          <BarChart data={data.map(d => ({ x: d.day, y: d.max_motor_temp_c }))} band={{ warn: 80, danger: 95 }} />
        </ChartCard>
      </div>
    </div>
  );
}

/* ========================= BATTERY ANALYTICS ========================= */
function BatteryAnalytics() {
  const { id } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/battery/analytics/${id}?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load battery analytics");
        const rows = await res.json();
        setData(rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const odo = useMemo(() => {
    const totalKwh = data.reduce((s, d) => s + (d.total_kwh_consumed || 0), 0);
    const maxTemp = Math.max(...data.map(d => d.max_cell_temp_c || 0), 0);
    const avgTemp = data.length ? data.reduce((s, d) => s + (d.avg_cell_temp_c || 0), 0) / data.length : 0;
    const maxCurrent = Math.max(...data.map(d => d.max_dc_current_a || 0), 0);
    const avgCurrent = data.length ? data.reduce((s, d) => s + (d.avg_dc_current_a || 0), 0) / data.length : 0;
    return { totalKwh, maxTemp, avgTemp, maxCurrent, avgCurrent };
  }, [data]);

  const trip = useMemo(() => {
    const last7 = data.slice(-7);
    const kwh = last7.reduce((s, d) => s + (d.total_kwh_consumed || 0), 0);
    const maxTemp = Math.max(...last7.map(d => d.max_cell_temp_c || 0), 0);
    const avgTemp = last7.length ? last7.reduce((s, d) => s + (d.avg_cell_temp_c || 0), 0) / last7.length : 0;
    return { kwh, maxTemp, avgTemp };
  }, [data]);

  if (loading) return <div className="text-center py-12 text-orange-200">Loading battery analytics…</div>;
  if (error) return <div className="text-center py-12 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">Battery Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="ODO">
          <Stat label="Total kWh Consumed" value={odo.totalKwh.toFixed(1)} unit="kWh" />
          <Stat label="Max O/P DC current Delivered" value={odo.maxCurrent} unit="A" />
          <Stat label="Max cell Temperature" value={odo.maxTemp} unit="°C" warn={45} danger={55} />
          <Stat label="Avg cell Temperature" value={odo.avgTemp.toFixed(1)} unit="°C" warn={42} danger={52} />
          <Stat label="Avg DC Current" value={odo.avgCurrent.toFixed(1)} unit="A" />
        </Section>

        <Section title="Trip Details (Last 7 Days)">
          <Stat label="kWh consumed in last trip" value={trip.kwh.toFixed(1)} unit="kWh" />
          <Stat label="Max cell Temperature in last trip" value={trip.maxTemp} unit="°C" warn={45} danger={55} />
          <Stat label="Avg cell Temperature for last trip" value={trip.avgTemp.toFixed(1)} unit="°C" warn={42} danger={52} />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Daily kWh Consumed">
          <BarChart data={data.map(d => ({ x: d.day, y: d.total_kwh_consumed }))} />
        </ChartCard>
        <ChartCard title="Max Cell Temp (°C)">
          <BarChart data={data.map(d => ({ x: d.day, y: d.max_cell_temp_c }))} band={{ warn: 45, danger: 55 }} />
        </ChartCard>
        <ChartCard title="Avg Cell Temp (°C)">
          <BarChart data={data.map(d => ({ x: d.day, y: d.avg_cell_temp_c }))} band={{ warn: 42, danger: 52 }} />
        </ChartCard>
      </div>
    </div>
  );
}

/* ========================= MOTOR FAULTS ========================= */
function MotorFaults() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const fetchFaults = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/faults/${id}?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load faults");
        const rows = await res.json();
        setLogs(rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFaults();
  }, [id]);

  const counts = useMemo(() => {
    const map = new Map();
    logs.forEach(l => map.set(l.description, (map.get(l.description) || 0) + 1));
    return map;
  }, [logs]);

  const filtered = useMemo(() => {
    if (!selected.size) return logs;
    return logs.filter(l => selected.has(l.description));
  }, [logs, selected]);

  const toggle = (name) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const exportCSV = () => {
    const rows = [["timestamp", "code", "description", "status"], ...filtered.map(l => [l.recorded_at, l.code, l.description, l.status])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "faults.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-12 text-orange-200">Loading faults…</div>;
  if (error) return <div className="text-center py-12 text-red-400">Error: {error}</div>;

  const uniqueFaults = [...new Set(logs.map(l => l.description))];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">
        Faults History (Last 30 Days)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <button onClick={() => setSelected(new Set())} className={`px-4 py-3 rounded-xl border ${selected.size === 0 ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10"}`}>All Faults</button>
        {uniqueFaults.map(name => (
          <button key={name} onClick={() => toggle(name)} className={`flex justify-between px-4 py-3 rounded-xl border ${selected.has(name) ? "border-orange-500 bg-orange-500/20 text-orange-300" : "border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10"}`}>
            <span>{name}</span>
            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/40">{counts.get(name)}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={exportCSV} className="px-5 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white rounded-xl font-semibold border border-orange-500/40 shadow-lg hover:shadow-xl hover:scale-[1.02] transition">
          Export as CSV
        </button>
      </div>
      <div className="rounded-xl border border-orange-500/30 bg-black/30 overflow-hidden">
        <div className="px-4 py-3 text-sm text-orange-200/80 border-b border-orange-500/20">
          Showing <b>{filtered.length}</b> log(s){selected.size ? " (filtered)" : ""}
        </div>
        <div className="max-h-[360px] overflow-auto divide-y divide-orange-500/10">
          {filtered.map((l, i) => (
            <div key={i} className="px-4 py-3 flex justify-between items-center">
              <div className="text-orange-200">{l.description}</div>
              <div className="flex gap-4 text-sm">
                <span className={`px-2 py-0.5 rounded ${l.status === 'active' ? 'bg-red-600/20 text-red-200 border border-red-600/30' : 'bg-emerald-600/20 text-emerald-200 border border-emerald-600/30'}`}>
                  {l.status.toUpperCase()}
                </span>
                <span className="text-orange-200/70">{new Date(l.recorded_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="px-4 py-10 text-center text-orange-200/70">No logs match filter.</div>}
        </div>
      </div>
    </div>
  );
}

/* ========================= DATABASE / LOGS (MOCK) ========================= */
function DatabaseLogs() {
  const today = new Date();
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const [start, setStart] = useState(fmtDate(d7));
  const [end, setEnd] = useState(fmtDate(today));
  const COLUMNS = [
    { key: "batteryKwh", label: "Battery kWh (daily)" },
    { key: "motorKwh", label: "Motor kWh (derived)" },
    { key: "motorTempRange", label: "Motor Temp Range (°C)" },
    { key: "mcuTempRange", label: "MCU Temp Range (°C)" },
    { key: "batteryTempRange", label: "Battery Temp Range (°C)" },
    { key: "hydOilTempRange", label: "Hydraulic Oil Temp Range (°C)" },
    { key: "chargingSessions", label: "Charging Sessions" },
  ];
  const [selectedCols, setSelectedCols] = useState(new Set(COLUMNS.map(c => c.key)));

  const rows = useMemo(() => {
    const dates = enumerateDays(new Date(start), new Date(end));
    return dates.map(date => {
      const batteryKwh = rnd(45, 110, 1);
      const motorKwh = Number((batteryKwh * rnd(0.75, 0.92, 2)).toFixed(2));
      const mkMin = rnd(55, 70, 1), mkMax = mkMin + rnd(10, 28, 1);
      const mcuMin = rnd(40, 55, 1), mcuMax = mcuMin + rnd(8, 22, 1);
      const batMin = rnd(28, 36, 1), batMax = batMin + rnd(4, 14, 1);
      const oilMin = rnd(30, 42, 1), oilMax = oilMin + rnd(8, 18, 1);
      const charges = Math.random() < 0.25 ? 1 : Math.random() < 0.1 ? 2 : 0;
      return {
        date: fmtDate(date),
        batteryKwh, motorKwh,
        motorTempRange: `${mkMin}-${mkMax}`,
        mcuTempRange: `${mcuMin}-${mcuMax}`,
        batteryTempRange: `${batMin}-${batMax}`,
        hydOilTempRange: `${oilMin}-${oilMax}`,
        chargingSessions: charges,
      };
    });
  }, [start, end]);

  const toggleCol = k => setSelectedCols(prev => {
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });

  const exportCSV = () => {
    const enabled = COLUMNS.filter(c => selectedCols.has(c.key));
    const header = ["date", ...enabled.map(c => c.label)];
    const dataRows = rows.map(r => [r.date, ...enabled.map(c => String(r[c.key] ?? ""))]);
    const csv = [header, ...dataRows].map(line => line.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `logs_${start}_to_${end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">Database / Logs</h2>
      <div className="border border-orange-500/30 rounded-xl bg-black/30 p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full">
            <div className="mb-2 text-orange-300 font-medium">Select Time Range</div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2 rounded-lg bg-black/40 border border-orange-500/30 text-orange-100 w-full" />
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-3 py-2 rounded-lg bg-black/40 border border-orange-500/30 text-orange-100 w-full" />
            </div>
          </div>
          <div className="w-full">
            <div className="mb-2 text-orange-300 font-medium">Select Columns</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLUMNS.map(c => (
                <label key={c.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-orange-500/20">
                  <input type="checkbox" checked={selectedCols.has(c.key)} onChange={() => toggleCol(c.key)} />
                  <span className="text-orange-100 text-sm">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={exportCSV} className="px-5 py-2 bg-orange-600/30 border border-orange-500/40 rounded-md text-orange-200 font-semibold hover:bg-orange-500/40 transition">
            Export as CSV
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-orange-500/30 bg-black/30 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/40">
            <tr>
              <th className="px-4 py-3 text-left text-orange-200/90">Date</th>
              {Array.from(selectedCols).map(key => {
                const col = COLUMNS.find(c => c.key === key);
                return <th key={key} className="px-4 py-3 text-left text-orange-200/90">{col?.label}</th>;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-500/10">
            {rows.map(r => (
              <tr key={r.date}>
                <td className="px-4 py-2 text-orange-100">{r.date}</td>
                {Array.from(selectedCols).map(key => (
                  <td key={key} className="px-4 py-2 text-orange-100">{String(r[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========================= TROUBLESHOOTING ========================= */
function Troubleshooting() {
  const [items, setItems] = useState([
    { id: 1, problem: "Problem #1", solution: "Solution #1" },
    { id: 2, problem: "Problem #2", solution: "Solution #2" },
    { id: 3, problem: "Problem #3", solution: "Solution #3" },
  ]);

  const update = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  const addRow = () => setItems(prev => [...prev, { id: Date.now(), problem: `Problem #${prev.length + 1}`, solution: `Solution #${prev.length + 1}` }]);
  const removeRow = id => setItems(prev => prev.filter(it => it.id !== id));

  return (
    <div className="border border-orange-500/30 rounded-2xl bg-black/30 p-6">
      <h2 className="text-2xl font-semibold text-orange-300 text-center mb-6">Troubleshooting</h2>
      <div className="space-y-5">
        {items.map((it, idx) => (
          <div key={it.id} className="space-y-3">
            <div className="rounded-xl border-2 border-orange-500/30 bg-gray-900/40">
              <input value={it.problem} onChange={e => update(it.id, "problem", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-transparent text-white placeholder-gray-400 focus:outline-none" />
            </div>
            <div className="rounded-xl border-2 border-orange-500/30 bg-gray-900/40">
              <textarea value={it.solution} onChange={e => update(it.id, "solution", e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl bg-transparent text-white placeholder-gray-400 focus:outline-none resize-y" />
            </div>
            <div className="flex justify-end">
              <button onClick={() => removeRow(it.id)} className="text-xs px-3 py-1 rounded-lg border border-orange-500/30 text-orange-200 hover:bg-orange-500/10 transition">Remove</button>
            </div>
            {idx < items.length - 1 && <div className="h-px bg-orange-500/20" />}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button onClick={addRow} className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white font-medium border border-orange-500/40 shadow hover:shadow-lg hover:scale-[1.01] transition">
          + Add Problem
        </button>
      </div>
    </div>
  );
}

/* ========================= UI PRIMITIVES ========================= */
function Section({ title, children }) {
  return (
    <div className="border border-orange-500/30 p-4 rounded-xl bg-black/30">
      <h3 className="font-semibold text-orange-300 mb-3">{title}</h3>
      <div className="grid grid-cols-1 gap-2">{children}</div>
    </div>
  );
}

function Item({ name, value }) {
  return (
    <div className="flex justify-between bg-gray-800/40 px-3 py-2 rounded-md text-sm border border-orange-500/20">
      <span className="text-gray-300">{name}</span>
      <span className="text-orange-300 font-semibold">{value}</span>
    </div>
  );
}

function Stat({ label, value, unit, warn, danger }) {
  const v = Number(value || 0);
  let color = "text-emerald-300";
  if (warn && danger) { if (v >= danger) color = "text-red-300"; else if (v >= warn) color = "text-yellow-200"; }
  return (
    <div className="flex items-center justify-between bg-gray-800/40 px-4 py-3 rounded-md border border-orange-500/20">
      <span className="text-gray-300 text-sm">{label}</span>
      <span className={`font-bold ${color}`}>{v.toFixed(2)} <span className="opacity-70 text-sm">{unit}</span></span>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="border border-orange-500/30 rounded-xl p-3 bg-black/30">
      <div className="text-orange-300 font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

/* ========================= BAR CHART ========================= */
function BarChart({ data, band }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-orange-200/60">No data</div>;
  const width = 560, height = 160, pad = 12;
  const w = width - pad * 2, h = height - pad * 2;
  const maxY = Math.max(...data.map(d => d.y || 0), 1);
  const barWidth = w / data.length * 0.8;
  const gap = w / data.length * 0.2;

  const bars = data.map((d, i) => {
    const x = pad + i * (barWidth + gap);
    const y = pad + h - (d.y / maxY) * h;
    const barH = (d.y / maxY) * h;
    let fill = "rgb(251,146,60)";
    if (band) {
      if (d.y >= band.danger) fill = "rgb(239,68,68)";
      else if (d.y >= band.warn) fill = "rgb(234,179,8)";
    }
    return <rect key={i} x={x} y={y} width={barWidth} height={barH} fill={fill} rx="4" />;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[160px]">
      {bars}
      <text x={width / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-orange-200/60">Date</text>
    </svg>
  );
}

/* ========================= HELPERS ========================= */
const rand = (a, b) => Math.random() * (b - a) + a;
const rnd = (lo, hi, fixed = 0) => Number(rand(lo, hi).toFixed(fixed));
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const enumerateDays = (start, end) => {
  const out = []; const d = new Date(start); d.setHours(0,0,0,0);
  const e = new Date(end); e.setHours(0,0,0,0);
  while (d <= e) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
};
const escapeCSV = v => `"${String(v).replace(/"/g, '""')}"`;