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
      {/* TOP INFO */}
      <div className="max-w-6xl mx-auto border-b border-orange-500/20 pb-6 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
          {vehicle.customer}
        </h1>
        <p className="mt-2 text-lg text-orange-200/90">
          {vehicle.vehicleType} • {vehicle.vehicleNo}
        </p>
      </div>

      {/* TABS */}
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

      {/* TAB CONTENT */}
      <div className="max-w-6xl mx-auto mt-10">
        {activeTab === "Live View" && <LiveView />}
        {activeTab === "Motor Analytics" && <MotorAnalytics />}
        {activeTab === "Battery Analytics" && <BatteryAnalytics />}
        {activeTab === "Motor Faults" && <MotorFaults />}
        {activeTab === "Database / Log" && <DatabaseLogs />}
        {activeTab === "Troubleshooting" && <Troubleshooting />}
        {![
          "Live View",
          "Motor Analytics",
          "Battery Analytics",
          "Motor Faults",
          "Database / Log",
          "Troubleshooting",
        ].includes(activeTab) && (
          <p className="text-center text-gray-400 opacity-80">
            {activeTab} screen coming soon...
          </p>
        )}
      </div>
    </div>
  );
}

/* ========================= LIVE VIEW ========================= */

function LiveView() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-orange-300 mb-4 text-center">
        Live Data (Auto refresh every 500ms)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BATTERY / BTMS / CHARGER */}
        <Section title="Battery / BTMS / Charger Live Data">
          <Item name="State of Charge %" value="78%" />
          <Item name="State of Charge (kWh)" value="42 kWh" />
          <Item name="Battery Status" value="Normal" />
          <Item name="BTMS Status" value="Active" />
          <Item
            name="Charger Status (gun connected/disconnected)"
            value="Connected"
          />
          <Item name="Temperature Sensors (Module 1)" value="34°C" />
          <Item name="Temperature Sensors (Module 2)" value="33°C" />
          <Item name="Temperature Sensors (Module 3)" value="35°C" />
          <Item name="Temperature Sensors (Module 4)" value="34°C" />
          <Item name="Temperature Sensors (Module 5)" value="36°C" />
          <Item name="Cell Voltages (Module 1)" value="3.65 V avg" />
          <Item name="Cell Voltages (Module 2)" value="3.64 V avg" />
          <Item name="Cell Voltages (Module 3)" value="3.66 V avg" />
          <Item name="Cell Voltages (Module 4)" value="3.63 V avg" />
          <Item name="Cell Voltages (Module 5)" value="3.65 V avg" />
          <Item name="Output Current (DC)" value="120 A" />
          <Item name="Stack Voltage" value="540 V" />
          <Item name="Output Power" value="65 kW" />
          <Item name="BTMS Temperature" value="38°C" />
          <Item name="Charging Current" value="0 A" />
        </Section>

        {/* MOTOR & MCU */}
        <Section title="Motor & MCU Live Data">
          <Item name="Motor Torque" value="220 Nm" />
          <Item name="Operation Mode" value="Drive" />
          <Item name="Motor Speed (RPM)" value="3100 rpm" />
          <Item name="Motor AC Side Current" value="85 A" />
          <Item name="Motor Torque Limit Value" value="260 Nm" />
          <Item name="Motor Rotation Direction" value="Forward" />
          <Item name="Motor Temperature" value="76°C" />
          <Item name="Motor AC Side Voltage" value="380 V" />
          <Item name="MCU Enable State" value="Enabled" />
          <Item name="MCU Temperature" value="58°C" />
        </Section>

        {/* PERIPHERALS */}
        <Section title="Peripherals Live Data">
          <Item name="Radiator Temperature" value="54°C" />
          <Item name="Hydraulic Oil Temperature" value="48°C" />
          <Item name="Hydraulic Pump RPM" value="1400 rpm" />
          <Item name="Hydraulic Pump Motor Temperature" value="72°C" />
          <Item name="DC/DC Converter Output Current" value="22 A" />
          <Item name="DC/DC Converter Status" value="OK" />
        </Section>

        {/* ODO / TRIP */}
        <Section title="ODO / Trip Details">
          <Item name="Total Running Hours" value="1248 h" />
          <Item name="Last Trip Hours" value="3.4 h" />
          <Item name="Total kWh Consumed" value="5200 kWh" />
          <Item name="kWh Used in Last Trip" value="18 kWh" />
        </Section>

        {/* ALARMS */}
        {/* ALARMS */}
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
  ].map((fault, idx) => {
    // Simulate random on/off (replace with real data later)
    const active = Math.random() < 0.2; // ~20% faults active
    return (
      <div
        key={idx}
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
  const WINDOW = 60;
  const [series, setSeries] = useState(() => ({
    acCurrent: seed(WINDOW, 60, 120),
    outPower: seed(WINDOW, 20, 85),
    torque: seed(WINDOW, 120, 260),
    speed: seed(WINDOW, 900, 4200),
    temp: seed(WINDOW, 55, 95),
  }));

  useEffect(() => {
    const t = setInterval(() => {
      setSeries((p) => ({
        acCurrent: push(
          p.acCurrent,
          jitter(last(p.acCurrent), 60, 120, 3),
          WINDOW
        ),
        outPower: push(
          p.outPower,
          jitter(last(p.outPower), 20, 85, 1.5),
          WINDOW
        ),
        torque: push(p.torque, jitter(last(p.torque), 120, 300, 4), WINDOW),
        speed: push(p.speed, jitter(last(p.speed), 800, 4500, 80), WINDOW),
        temp: push(p.temp, jitter(last(p.temp), 50, 110, 0.6), WINDOW),
      }));
    }, 500);
    return () => clearInterval(t);
  }, []);

  const tripWindow = 24;
  const lastN = (arr, n) => arr.slice(-n);

  const odo = useMemo(
    () => ({
      maxPower: Math.max(...series.outPower),
      maxTorque: Math.max(...series.torque),
      maxInputCurrent: Math.max(...series.acCurrent),
      maxMotorTemp: Math.max(...series.temp),
    }),
    [series]
  );

  const trip = useMemo(
    () => ({
      maxPowerLastTrip: Math.max(...lastN(series.outPower, tripWindow)),
      maxTorqueLastTrip: Math.max(...lastN(series.torque, tripWindow)),
      maxInputCurrentLastTrip: Math.max(...lastN(series.acCurrent, tripWindow)),
      maxMotorTempLastTrip: Math.max(...lastN(series.temp, tripWindow)),
    }),
    [series]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">
        Motor Analytics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="ODO">
          <Stat
            label="Max O/P power delivered"
            value={odo.maxPower}
            unit="kW"
          />
          <Stat
            label="Max O/P torque delivered"
            value={odo.maxTorque}
            unit="Nm"
          />
          <Stat
            label="Max I/P current consumed"
            value={odo.maxInputCurrent}
            unit="A"
          />
          <Stat
            label="Max motor temperature"
            value={odo.maxMotorTemp}
            unit="°C"
            warn={80}
            danger={95}
          />
        </Section>

        <Section title="Trip Details">
          <Stat
            label="Max O/P power delivered in last trip"
            value={trip.maxPowerLastTrip}
            unit="kW"
          />
          <Stat
            label="Max O/P torque delivered in last trip"
            value={trip.maxTorqueLastTrip}
            unit="Nm"
          />
          <Stat
            label="Max I/P current consumed in last trip"
            value={trip.maxInputCurrentLastTrip}
            unit="A"
          />
          <Stat
            label="Max motor temperature in last trip"
            value={trip.maxMotorTempLastTrip}
            unit="°C"
            warn={80}
            danger={95}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Motor AC side current — Live (A)">
          <SimpleLineChart data={series.acCurrent} min={40} max={140} />
        </ChartCard>
        <ChartCard title="Motor Output Power — Live (kW)">
          <SimpleLineChart data={series.outPower} min={10} max={100} />
        </ChartCard>
        <ChartCard title="Motor Output Torque — Live (Nm)">
          <SimpleLineChart data={series.torque} min={80} max={320} />
        </ChartCard>
        <ChartCard title="Motor Output Speed — Live (RPM)">
          <SimpleLineChart data={series.speed} min={500} max={4600} />
        </ChartCard>
        <ChartCard title="Motor Temperature — Live (°C)">
          <SimpleLineChart
            data={series.temp}
            min={40}
            max={110}
            band={{ warn: 80, danger: 95 }}
          />
        </ChartCard>
      </div>
    </div>
  );
}

/* ========================= BATTERY ANALYTICS ========================= */

function BatteryAnalytics() {
  const WINDOW = 60;
  const SAMPLE_SEC = 0.5;
  const [series, setSeries] = useState(() => ({
    dcCurrent: seed(WINDOW, 40, 140),
    power: seed(WINDOW, 15, 90),
    cellMaxTemp: seed(WINDOW, 32, 48),
    cellAvgTemp: seed(WINDOW, 30, 44),
    chargingCurrent: seed(WINDOW, 0, 60),
  }));

  useEffect(() => {
    const t = setInterval(() => {
      setSeries((p) => ({
        dcCurrent: push(
          p.dcCurrent,
          jitter(last(p.dcCurrent), 30, 160, 3),
          WINDOW
        ),
        power: push(p.power, jitter(last(p.power), 10, 100, 1.6), WINDOW),
        cellMaxTemp: push(
          p.cellMaxTemp,
          jitter(last(p.cellMaxTemp), 28, 60, 0.35),
          WINDOW
        ),
        cellAvgTemp: push(
          p.cellAvgTemp,
          jitter(last(p.cellAvgTemp), 26, 55, 0.3),
          WINDOW
        ),
        chargingCurrent: push(
          p.chargingCurrent,
          jitter(last(p.chargingCurrent), 0, 80, 2.5),
          WINDOW
        ),
      }));
    }, 500);
    return () => clearInterval(t);
  }, []);

  // rough energy integration from kW over 0.5s samples
  const kwhWindow = useMemo(() => {
    const kWs = series.power.reduce((sum, kW) => sum + kW * SAMPLE_SEC, 0);
    return kWs / 3600;
  }, [series.power]);

  const tripWindow = 24;
  const lastN = (arr, n) => arr.slice(-n);

  const kwhTrip = useMemo(() => {
    const arr = lastN(series.power, tripWindow);
    const kWs = arr.reduce((sum, kW) => sum + kW * SAMPLE_SEC, 0);
    return kWs / 3600;
  }, [series.power]);

  const odo = useMemo(
    () => ({
      maxPower: Math.max(...series.power),
      totalKwh: kwhWindow,
      maxDcCurrent: Math.max(...series.dcCurrent),
      maxCellTemp: Math.max(...series.cellMaxTemp),
      avgCellTemp: avg(series.cellAvgTemp),
      avgKwhPerTrip: kwhTrip,
    }),
    [series, kwhWindow, kwhTrip]
  );

  const trip = useMemo(
    () => ({
      maxPowerLastTrip: Math.max(...lastN(series.power, tripWindow)),
      kwhLastTrip: kwhTrip,
      maxDcCurrentLastTrip: Math.max(...lastN(series.dcCurrent, tripWindow)),
      maxCellTempLastTrip: Math.max(...lastN(series.cellMaxTemp, tripWindow)),
      avgCellTempLastTrip: avg(lastN(series.cellAvgTemp, tripWindow)),
    }),
    [series, kwhTrip]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">
        Battery Analytics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="ODO">
          <Stat label="Max Power Delivered" value={odo.maxPower} unit="kW" />
          <Stat label="Total kWh Consumed" value={odo.totalKwh} unit="kWh" />
          <Stat
            label="Max O/P DC current Delivered"
            value={odo.maxDcCurrent}
            unit="A"
          />
          <Stat
            label="Max cell Temperature"
            value={odo.maxCellTemp}
            unit="°C"
            warn={45}
            danger={55}
          />
          <Stat
            label="Avg cell Temperature"
            value={odo.avgCellTemp}
            unit="°C"
            warn={42}
            danger={52}
          />
          <Stat
            label="Avg kWh consumed per trip"
            value={odo.avgKwhPerTrip}
            unit="kWh"
          />
        </Section>

        <Section title="Trip Details">
          <Stat
            label="Max power Delivered in last trip"
            value={trip.maxPowerLastTrip}
            unit="kW"
          />
          <Stat
            label="kWh consumed in last trip"
            value={trip.kwhLastTrip}
            unit="kWh"
          />
          <Stat
            label="Max O/P current Delivered in last trip"
            value={trip.maxDcCurrentLastTrip}
            unit="A"
          />
          <Stat
            label="Max cell Temperature in last trip"
            value={trip.maxCellTempLastTrip}
            unit="°C"
            warn={45}
            danger={55}
          />
          <Stat
            label="Avg cell Temperature for last trip"
            value={trip.avgCellTempLastTrip}
            unit="°C"
            warn={42}
            danger={52}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="O/P DC current — Live (A)">
          <SimpleLineChart data={series.dcCurrent} min={0} max={160} />
        </ChartCard>
        <ChartCard title="O/P kWh (power rate) — Live (kW)">
          <SimpleLineChart data={series.power} min={0} max={100} />
        </ChartCard>
        <ChartCard title="Max cell temp — Live (°C)">
          <SimpleLineChart
            data={series.cellMaxTemp}
            min={25}
            max={60}
            band={{ warn: 45, danger: 55 }}
          />
        </ChartCard>
        <ChartCard title="Charging current — Live (A)">
          <SimpleLineChart data={series.chargingCurrent} min={0} max={80} />
        </ChartCard>
      </div>
    </div>
  );
}

/* ========================= MOTOR FAULTS ========================= */

function MotorFaults() {
  const FAULTS = [
    "Hardware Driver Failure",
    "Hardware Overcurrent fault",
    "Zero offset fault",
    "Fan failure",
    "Temperature difference failure",
    "AC Hall failure",
    "Stall failure",
    "Low voltage undervoltage fault",
    "Software overcurrent fault",
    "Hardware overvoltage fault",
    "Total hardware failure",
    "Bus overvoltage fault",
    "Busbar undervoltage fault",
    "Module over temperature fault",
    "Overspeed fault",
    "OverRpmAlarm_Flag (Additional Speed Related Warning)",
    "Motor over temperature warning",
    "Motor over temperature fault",
    "CAN offline failure",
    "Encoder failure",
  ];

  // mock last-30-days logs
  const [logs] = useState(() => {
    const now = Date.now();
    const days30 = 30 * 24 * 3600 * 1000;
    const severities = ["info", "warn", "error"];
    const arr = Array.from({ length: 300 }, () => {
      const type = FAULTS[Math.floor(Math.random() * FAULTS.length)];
      const ts = new Date(now - Math.random() * days30);
      const sev = severities[Math.floor(Math.random() * severities.length)];
      return { type, ts, severity: sev };
    });
    return arr.sort((a, b) => b.ts - a.ts);
  });

  const [selected, setSelected] = useState(new Set());
  const counts = useMemo(() => {
    const map = new Map();
    for (const f of FAULTS) map.set(f, 0);
    for (const l of logs) map.set(l.type, (map.get(l.type) || 0) + 1);
    return map;
  }, [logs]);

  const filtered = useMemo(() => {
    if (!selected.size) return logs;
    return logs.filter((l) => selected.has(l.type));
  }, [logs, selected]);

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const clearSel = () => setSelected(new Set());

  const exportCSV = () => {
    const rows = [
      ["timestamp", "fault", "severity"],
      ...filtered.map((l) => [l.ts.toISOString(), l.type, l.severity]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faults_last_30_days.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">
        Motor, MCU, Battery, BTMS, Charger, DC/DC converter & other peripherals
        <br />
        <span className="text-orange-200/80">
          Faults history & logs for past 30 days
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={clearSel}
          className={`px-4 py-3 rounded-xl border ${
            selected.size === 0
              ? "border-orange-500 bg-orange-500/20 text-orange-300"
              : "border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10"
          }`}
          title="Show all faults"
        >
          All Faults
        </button>

        {FAULTS.map((name) => {
          const active = selected.has(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${
                active
                  ? "border-orange-500 bg-orange-500/20 text-orange-300"
                  : "border-orange-500/30 text-orange-200 bg-black/40 hover:bg-orange-500/10"
              }`}
            >
              <span className="pr-3">{name}</span>
              <span className="ml-3 text-xs px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/40">
                {counts.get(name) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={exportCSV}
          className="px-5 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white rounded-xl font-semibold border border-orange-500/40 shadow-lg hover:shadow-xl hover:scale-[1.02] transition"
        >
          Export as CSV
        </button>
      </div>

      <div className="rounded-xl border border-orange-500/30 bg-black/30 overflow-hidden">
        <div className="px-4 py-3 text-sm text-orange-200/80 border-b border-orange-500/20">
          Showing <b>{filtered.length}</b> log(s)
          {selected.size ? " (filtered)" : ""}.
        </div>
        <div className="max-h-[360px] overflow-auto divide-y divide-orange-500/10">
          {filtered.map((l, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div className="text-orange-200">{l.type}</div>
              <div className="flex items-center gap-4 text-sm">
                <span
                  className={`px-2 py-0.5 rounded ${
                    l.severity === "error"
                      ? "bg-red-600/20 text-red-200 border border-red-600/30"
                      : l.severity === "warn"
                      ? "bg-yellow-600/20 text-yellow-200 border border-yellow-600/30"
                      : "bg-emerald-600/20 text-emerald-200 border border-emerald-600/30"
                  }`}
                >
                  {l.severity}
                </span>
                <span className="text-orange-200/70">
                  {l.ts.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-orange-200/70">
              No logs match the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================= DATABASE / LOGS ========================= */

function DatabaseLogs() {
  // default to last 7 days
  const today = new Date();
  const d7 = new Date(today);
  d7.setDate(today.getDate() - 6);

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
  const [selectedCols, setSelectedCols] = useState(
    new Set(COLUMNS.map((c) => c.key))
  );

  // mock rows per day between start/end
  const rows = useMemo(() => {
    const dates = enumerateDays(new Date(start), new Date(end));
    return dates.map((date) => {
      const batteryKwh = rnd(45, 110, 1);
      const motorKwh = Number((batteryKwh * rnd(0.75, 0.92, 2)).toFixed(2));
      const mkMin = rnd(55, 70, 1);
      const mkMax = mkMin + rnd(10, 28, 1);
      const mcuMin = rnd(40, 55, 1);
      const mcuMax = mcuMin + rnd(8, 22, 1);
      const batMin = rnd(28, 36, 1);
      const batMax = batMin + rnd(4, 14, 1);
      const oilMin = rnd(30, 42, 1);
      const oilMax = oilMin + rnd(8, 18, 1);
      const charges = Math.random() < 0.25 ? 1 : Math.random() < 0.1 ? 2 : 0;

      return {
        date: fmtDate(date),
        batteryKwh,
        motorKwh,
        motorTempRange: `${mkMin}-${mkMax}`,
        mcuTempRange: `${mcuMin}-${mcuMax}`,
        batteryTempRange: `${batMin}-${batMax}`,
        hydOilTempRange: `${oilMin}-${oilMax}`,
        chargingSessions: charges,
      };
    });
  }, [start, end]);

  const toggleCol = (k) =>
    setSelectedCols((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const exportCSV = () => {
    const enabled = COLUMNS.filter((c) => selectedCols.has(c.key));
    const header = ["date", ...enabled.map((c) => c.label)];
    const dataRows = rows.map((r) => [
      r.date,
      ...enabled.map((c) => String(r[c.key] ?? "")),
    ]);
    const csv = [header, ...dataRows]
      .map((line) => line.map(escapeCSV).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `database_logs_${start}_to_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-orange-300 text-center">
        Database / Logs
      </h2>

      {/* Controls (single column, no right-hand text card) */}
      <div className="border border-orange-500/30 rounded-xl bg-black/30 p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Time Range */}
          <div className="w-full">
            <div className="mb-2 text-orange-300 font-medium">
              Select Time Range
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-orange-500/30 text-orange-100 w-full"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-orange-500/30 text-orange-100 w-full"
              />
            </div>
          </div>

          <div className="w-0.5 h-5 bg-orange-400/30" />

          {/* Columns */}
          <div className="w-full">
            <div className="mb-2 text-orange-300 font-medium">
              Select Columns / Parameters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLUMNS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-orange-500/20"
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                  />
                  <span className="text-orange-100 text-sm">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="w-0.5 h-5 bg-orange-400/30" />

          {/* Export */}
          <button
            onClick={exportCSV}
            className="px-5 py-2 bg-orange-600/30 border border-orange-500/40 rounded-md text-orange-200 font-semibold hover:bg-orange-500/40 transition"
          >
            Export as CSV
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-orange-500/30 bg-black/30 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/40">
            <tr>
              <th className="px-4 py-3 text-left text-orange-200/90">Date</th>
              {Array.from(selectedCols).map((key) => {
                const col = COLUMNS.find((c) => c.key === key);
                return (
                  <th
                    key={key}
                    className="px-4 py-3 text-left text-orange-200/90"
                  >
                    {col?.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-500/10">
            {rows.map((r) => (
              <tr key={r.date}>
                <td className="px-4 py-2 text-orange-100">{r.date}</td>
                {Array.from(selectedCols).map((key) => (
                  <td key={key} className="px-4 py-2 text-orange-100">
                    {String(r[key])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={1 + selectedCols.size}
                  className="px-4 py-8 text-center text-orange-200/70"
                >
                  No data for selected range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Troubleshooting() {
  const [items, setItems] = React.useState([
    { id: 1, problem: "Problem #1", solution: "Solution #1" },
    { id: 2, problem: "Problem #2", solution: "Solution #2" },
    { id: 3, problem: "Problem #3", solution: "Solution #3" },
  ]);

  const update = (id, field, value) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        problem: `Problem #${prev.length + 1}`,
        solution: `Solution #${prev.length + 1}`,
      },
    ]);

  const removeRow = (id) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  return (
    <div className="border border-orange-500/30 rounded-2xl bg-black/30 p-6">
      <h2 className="text-2xl font-semibold text-orange-300 text-center mb-6">
        Troubleshooting
      </h2>

      <div className="space-y-5">
        {items.map((it, idx) => (
          <div key={it.id} className="space-y-3">
            {/* Problem box */}
            <div className="rounded-xl border-2 border-orange-500/30 bg-gray-900/40">
              <input
                value={it.problem}
                onChange={(e) => update(it.id, "problem", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-transparent text-white placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* Solution box */}
            <div className="rounded-xl border-2 border-orange-500/30 bg-gray-900/40">
              <textarea
                value={it.solution}
                onChange={(e) => update(it.id, "solution", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-transparent text-white placeholder-gray-400 focus:outline-none resize-y"
              />
            </div>

            {/* Row actions */}
            <div className="flex justify-end">
              <button
                onClick={() => removeRow(it.id)}
                className="text-xs px-3 py-1 rounded-lg border border-orange-500/30 text-orange-200 hover:bg-orange-500/10 transition"
              >
                Remove
              </button>
            </div>

            {/* Divider like in the sketch */}
            {idx < items.length - 1 && (
              <div className="h-px bg-orange-500/20" />
            )}
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={addRow}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white font-medium border border-orange-500/40 shadow hover:shadow-lg hover:scale-[1.01] transition"
        >
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

function Warning({ text }) {
  return (
    <div className="px-3 py-2 bg-red-600/20 border border-red-600/40 text-red-300 rounded-md text-sm">
      {text}
    </div>
  );
}

function Stat({ label, value, unit, warn, danger }) {
  const v = Number(value || 0);
  let color = "text-emerald-300";
  if (typeof warn === "number" && typeof danger === "number") {
    if (v >= danger) color = "text-red-300";
    else if (v >= warn) color = "text-yellow-200";
  }
  return (
    <div className="flex items-center justify-between bg-gray-800/40 px-4 py-3 rounded-md border border-orange-500/20">
      <span className="text-gray-300 text-sm">{label}</span>
      <span className={`font-bold ${color}`}>
        {v.toFixed(2)} <span className="opacity-70 text-sm">{unit}</span>
      </span>
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

/* ========================= PURE SVG LINE CHART ========================= */

function SimpleLineChart({ data, min, max, width = 560, height = 160, band }) {
  const pad = 12;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const clampv = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
  const norm = (v) => (clampv(v, min, max) - min) / (max - min || 1);
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w + pad;
      const y = (1 - norm(v)) * h + pad;
      return `${x},${y}`;
    })
    .join(" ");

  const grid = new Array(4).fill(0).map((_, i) => {
    const y = pad + (i / 3) * h;
    return (
      <line
        key={i}
        x1={pad}
        x2={pad + w}
        y1={y}
        y2={y}
        stroke="rgba(255,255,255,.08)"
        strokeWidth="1"
      />
    );
  });

  let bands = null;
  if (band) {
    const toY = (v) => (1 - norm(v)) * h + pad;
    const warnY = toY(band.warn);
    const dangerY = toY(band.danger);
    bands = (
      <>
        <rect
          x={pad}
          y={pad}
          width={w}
          height={dangerY - pad}
          fill="rgba(239,68,68,0.10)"
        />
        <rect
          x={pad}
          y={dangerY}
          width={w}
          height={warnY - dangerY}
          fill="rgba(234,179,8,0.10)"
        />
      </>
    );
  }

  const latest = data[data.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[160px]">
        {bands}
        {grid}
        <polyline
          points={pts}
          fill="none"
          stroke="rgb(251,146,60)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute right-2 top-2 text-xs text-orange-200/80">
        Last:{" "}
        <span className="font-semibold text-orange-300">
          {latest?.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-[11px] text-orange-200/60 mt-1 px-1">
        <span>min {min}</span>
        <span>max {max}</span>
      </div>
    </div>
  );
}

/* ========================= HELPERS ========================= */

const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

function seed(n, lo, hi) {
  return Array.from({ length: n }, () => Number(rand(lo, hi).toFixed(2)));
}
function last(arr) {
  return arr[arr.length - 1] ?? 0;
}
function push(arr, value, window) {
  const out = [...arr, Number(value.toFixed(2))];
  if (out.length > window) out.shift();
  return out;
}
function jitter(v, lo, hi, step = 1) {
  const nv = v + rand(-step, step);
  return clamp(nv, lo, hi);
}
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function fmtDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function enumerateDays(start, end) {
  const out = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function rnd(lo, hi, fixed = 0) {
  return Number(rand(lo, hi).toFixed(fixed));
}
function escapeCSV(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}
