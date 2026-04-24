import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─────────────────────────────────────────────────────────────
   Constants — identical to LiveView
───────────────────────────────────────────────────────────── */
const LIVE_THRESHOLD_MS  = 15000;
const WINDOW_MS          = 5 * 60 * 1000;
const MAX_POINTS         = 150;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

/* ─────────────────────────────────────────────────────────────
   Field extractor
───────────────────────────────────────────────────────────── */
function coerceNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const extractFields = (raw) => ({
  output_power_kw: coerceNum(raw.output_power_kw),
  motor_speed_rpm: coerceNum(raw.motor_speed_rpm),
  motor_torque_nm: coerceNum(raw.motor_torque_nm ?? raw.motor_torque_value),
  dc_current_a:    coerceNum(raw.dc_current_a    ?? raw.battery_current_a),
  ac_current_a:    coerceNum(raw.ac_current_a    ?? raw.motor_ac_current_a),
  ac_voltage_v:    coerceNum(raw.ac_voltage_v    ?? raw.motor_ac_voltage_v),
});

/* ─────────────────────────────────────────────────────────────
   Chart configs
───────────────────────────────────────────────────────────── */
const CHARTS = [
  {
    key:   "output_power_kw",
    label: "Output Power",
    sub:   "Electrical power delivered",
    unit:  "kW",
    color: "#f97316",
    glow:  "rgba(249,115,22,0.5)",
    grad:  ["rgba(249,115,22,0.38)", "rgba(249,115,22,0.01)"],
    fixed: 2,
    span:  "",
  },
  {
    key:   "motor_speed_rpm",
    label: "Motor Speed",
    sub:   "Shaft rotational velocity",
    unit:  "RPM",
    color: "#a78bfa",
    glow:  "rgba(167,139,250,0.5)",
    grad:  ["rgba(167,139,250,0.38)", "rgba(167,139,250,0.01)"],
    fixed: 0,
    span:  "",
  },
  {
    key:   "motor_torque_nm",
    label: "Motor Torque",
    sub:   "Rotational force output",
    unit:  "Nm",
    color: "#fbbf24",
    glow:  "rgba(251,191,36,0.5)",
    grad:  ["rgba(251,191,36,0.38)", "rgba(251,191,36,0.01)"],
    fixed: 1,
    span:  "",
  },
  {
    key:   "dc_current_a",
    label: "Battery Current",
    sub:   "DC draw from battery pack",
    unit:  "A",
    color: "#34d399",
    glow:  "rgba(52,211,153,0.5)",
    grad:  ["rgba(52,211,153,0.38)", "rgba(52,211,153,0.01)"],
    fixed: 1,
    span:  "",
  },
  {
    key:   "ac_voltage_v",
    label: "Motor AC Voltage",
    sub:   "Phase voltage to motor windings",
    unit:  "V",
    color: "#818cf8",
    glow:  "rgba(129,140,248,0.5)",
    grad:  ["rgba(129,140,248,0.38)", "rgba(129,140,248,0.01)"],
    fixed: 1,
    span:  "",
  },
  {
    key:   "ac_current_a",
    label: "Motor AC Current",
    sub:   "Phase current to motor windings",
    unit:  "A",
    color: "#38bdf8",
    glow:  "rgba(56,189,248,0.5)",
    grad:  ["rgba(56,189,248,0.38)", "rgba(56,189,248,0.01)"],
    fixed: 1,
    span:  "",
  },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const fmt = (v, fixed) =>
  v == null || !Number.isFinite(Number(v)) ? "–" : Number(v).toFixed(fixed);

const formatTimestamp = (date) =>
  date
    ? date.toLocaleString(undefined, {
        year:   "numeric",
        month:  "short",
        day:    "numeric",
        hour:   "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "–";

const toLabel = (date) =>
  date.toLocaleTimeString(undefined, {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const fmtDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const getYesterdayIST = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const stepDate = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "UTC" });
};

const fmtDateLabel = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
};

/* ─────────────────────────────────────────────────────────────
   Custom Tooltip
───────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, cfg }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl text-xs border"
      style={{
        background:  "rgba(8,8,18,0.98)",
        borderColor: cfg.color + "50",
        boxShadow:   `0 0 24px ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.6)`,
      }}
    >
      <div className="text-gray-500 mb-1 font-mono text-[10px] tracking-widest">{label}</div>
      <div className="text-lg font-black tabular-nums leading-none" style={{ color: cfg.color }}>
        {fmt(val, cfg.fixed)}
        <span className="text-xs font-normal text-gray-500 ml-1">{cfg.unit}</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Stat pill
───────────────────────────────────────────────────────────── */
const Stat = ({ label, val, color }) => (
  <div
    className="flex flex-col items-center px-3 py-1.5 rounded-lg flex-1"
    style={{ background: color + "0c", border: `1px solid ${color}25` }}
  >
    <span className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">{label}</span>
    <span className="text-xs font-bold tabular-nums" style={{ color }}>{val}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Chart Card
───────────────────────────────────────────────────────────── */
function ChartCard({ cfg, data, isLive, isStale }) {
  const vals    = data.map((d) => d[cfg.key]).filter((v) => v != null && Number.isFinite(v));
  const current = vals[vals.length - 1] ?? null;
  const minVal  = vals.length ? Math.min(...vals) : null;
  const maxVal  = vals.length ? Math.max(...vals) : null;
  const avgVal  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  const pad  = maxVal != null && minVal != null ? (maxVal - minVal) * 0.18 || 0.5 : 0.5;
  const yMin = minVal != null ? Math.max(0, minVal - pad) : "auto";
  const yMax = maxVal != null ? maxVal + pad : "auto";

  const gradId    = `grad_${cfg.key}`;
  const filtId    = `filt_${cfg.key}`;
  const cardColor = isStale ? "#6b7280" : cfg.color;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${cfg.span}`}
      style={{
        background: "linear-gradient(150deg,rgba(13,13,22,0.99) 0%,rgba(18,16,28,0.99) 100%)",
        border:     `1px solid ${isLive ? cfg.color + "35" : isStale ? "rgba(107,114,128,0.3)" : "rgba(55,65,81,0.5)"}`,
        boxShadow:  isLive
          ? `0 0 0 1px ${cfg.color}10, 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)`
          : "0 4px 20px rgba(0,0,0,0.45)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-700"
        style={{
          background: `linear-gradient(90deg,transparent 0%,${cfg.color} 50%,transparent 100%)`,
          opacity:    isLive ? 0.7 : 0,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 20%, ${isLive ? cfg.color : "#6b7280"}05 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 relative flex-shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: cardColor,
                  boxShadow:  isLive ? `0 0 10px ${cfg.glow}` : "none",
                }}
              />
              {isLive && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: cfg.color, opacity: 0.3 }}
                />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-100 tracking-wide">{cfg.label}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{cfg.sub}</div>
            </div>
          </div>

          <div className="text-right">
            <div
              className="text-3xl font-black tabular-nums leading-none transition-all duration-200"
              style={{
                color:      cardColor,
                textShadow: isLive ? `0 0 18px ${cfg.glow}` : "none",
              }}
            >
              {fmt(current, cfg.fixed)}
            </div>
            <div className="text-[11px] text-gray-600 mt-1 font-mono">{cfg.unit}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Stat label="Min" val={fmt(minVal, cfg.fixed)} color={cardColor} />
          <Stat label="Avg" val={fmt(avgVal, cfg.fixed)} color={cardColor} />
          <Stat label="Max" val={fmt(maxVal, cfg.fixed)} color={cardColor} />
          <Stat label="Pts" val={data.length}            color={cardColor} />
        </div>

        <div className="h-36 relative">
          {data.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: cfg.color + "30", borderTopColor: cfg.color }}
              />
              <span className="text-[11px] text-gray-600">Awaiting data…</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 2, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={isStale ? "rgba(107,114,128,0.3)" : cfg.grad[0]} />
                    <stop offset="100%" stopColor={cfg.grad[1]} />
                  </linearGradient>
                  <filter id={filtId} x="-10%" y="-30%" width="120%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="2 8"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fill: "#374151", fontSize: 8, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => v.slice(3)}
                />

                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: "#374151", fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                  tickFormatter={(v) => {
                    const abs = Math.abs(v);
                    if (abs >= 10000) return `${(v / 1000).toFixed(0)}k`;
                    if (abs >= 1000)  return `${(v / 1000).toFixed(1)}k`;
                    return Number(v).toFixed(cfg.fixed === 0 ? 0 : 1);
                  }}
                />

                <Tooltip
                  content={(p) => <CustomTooltip {...p} cfg={cfg} />}
                  cursor={{ stroke: cfg.color + "25", strokeWidth: 1, strokeDasharray: "4 4" }}
                />

                <Area
                  type="monotoneX"
                  dataKey={cfg.key}
                  stroke={isStale ? "#6b7280" : cfg.color}
                  strokeWidth={isStale ? 1.5 : 2}
                  fill={`url(#${gradId})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: cfg.color,
                    stroke: "rgba(0,0,0,0.8)",
                    strokeWidth: 2,
                    filter: `url(#${filtId})`,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                  filter={isLive ? `url(#${filtId})` : undefined}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[9px] text-gray-700 font-mono tracking-widest uppercase">
            5 min window · 2 s interval
          </span>
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: isLive ? cfg.color + "90" : "#4b5563" }}
          >
            {isLive ? "◉ streaming" : isStale ? "◎ historical" : "◎ paused"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Activity Timeline
   ─────────────────────────────────────────────────────────────
   4 states, derived per bucket:

   RUNNING     (green)  — hrs_end > hrs_start (odometer moved).
                          battery_status is ignored — odometer always wins.

   CHARGING    (blue)   — odometer frozen AND battery_status = 'Charging'

   DISCHARGING (amber)  — odometer frozen AND battery_status = 'Discharging'

   OFFLINE     (dark)   — no bucket at all
                        OR odometer frozen AND battery_status is anything
                          other than 'Charging' / 'Discharging'
                          (covers 'OFF', NULL, and any future garbage values)
───────────────────────────────────────────────────────────── */

const BUCKET_COUNT       = 288;   // 288 × 5 min = 24 h
const BUCKET_MINS        = 5;

const RUNNING_COLOR      = "#22c55e";   // green-500
const CHARGING_COLOR     = "#3b82f6";   // blue-500
const DISCHARGING_COLOR  = "#f59e0b";   // amber-400
const OFFLINE_COLOR      = "#1f2937";   // gray-800

/* Map state → colour */
const stateColor = (state) => {
  switch (state) {
    case "running":      return RUNNING_COLOR;
    case "charging":     return CHARGING_COLOR;
    case "discharging":  return DISCHARGING_COLOR;
    default:             return OFFLINE_COLOR;   // "offline" + anything unexpected
  }
};

/* Map state → human label */
const stateLabel = (state) => {
  switch (state) {
    case "running":      return "Running";
    case "charging":     return "Charging";
    case "discharging":  return "Discharging";
    default:             return "Offline";
  }
};

/*
  buildSlots
  ──────────
  Returns a full 288-element array (one per 5-min slot in the day).
  Each slot carries the derived state and raw metadata for the tooltip.

  State derivation for buckets that have data (hrs_end / hrs_start):
    1. delta > 0              → "running"       (odometer moved — wins unconditionally)
    2. battery_status = 'Charging'    → "charging"
    3. battery_status = 'Discharging' → "discharging"
    4. anything else (OFF, NULL, …)   → "offline"  (treated as dark / no signal)
*/
function buildSlots(dateStr, buckets) {
  const lookup = new Map();
  for (const b of buckets) {
    const d   = new Date(b.bucket);
    const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const h   = ist.getHours();
    const m   = Math.floor(ist.getMinutes() / 5) * 5;
    lookup.set(h * 60 + m, b);
  }

  const slots = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const minutesSinceMidnight = i * BUCKET_MINS;
    const h   = Math.floor(minutesSinceMidnight / 60);
    const m   = minutesSinceMidnight % 60;
    const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const b = lookup.get(minutesSinceMidnight);

    let state          = "offline";
    let runningSeconds = 0;
    let rowCount       = 0;
    let batteryStatus  = null;

    if (b) {
      rowCount      = b.row_count;
      batteryStatus = b.battery_status ?? null;
      const delta   = b.hrs_end - b.hrs_start;

      if (delta > 0) {
        // Odometer moved — always running regardless of battery_status
        state          = "running";
        runningSeconds = delta;
      } else if (batteryStatus === "Charging") {
        state = "charging";
      } else if (batteryStatus === "Discharging") {
        state = "discharging";
      } else {
        // OFF, NULL, or any unknown value → treat as offline (dark)
        state = "offline";
      }
    }

    slots.push({ index: i, timeLabel, state, runningSeconds, rowCount, batteryStatus });
  }

  return slots;
}

/*
  buildSessions
  ─────────────
  Collapses contiguous same-state slots into sessions.
  "offline" slots break sessions but are not included themselves.
*/
function buildSessions(slots) {
  const sessions = [];
  let current    = null;

  for (const slot of slots) {
    if (slot.state === "offline") {
      if (current) { sessions.push(current); current = null; }
      continue;
    }
    if (!current || current.state !== slot.state) {
      if (current) sessions.push(current);
      current = {
        state:          slot.state,
        startLabel:     slot.timeLabel,
        endLabel:       slot.timeLabel,
        endIndex:       slot.index,
        runningSeconds: slot.runningSeconds,
        slots:          1,
      };
    } else {
      current.endLabel        = slot.timeLabel;
      current.endIndex        = slot.index;
      current.runningSeconds += slot.runningSeconds;
      current.slots++;
    }
  }
  if (current) sessions.push(current);
  return sessions;
}

/* Bucket hover tooltip */
function BucketTooltip({ slot }) {
  if (!slot) return null;
  const color = stateColor(slot.state);
  const label = stateLabel(slot.state);

  return (
    <div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{ minWidth: 128 }}
    >
      <div
        className="rounded-lg px-3 py-2 text-xs shadow-2xl border"
        style={{
          background:  "rgba(8,8,18,0.98)",
          borderColor: color + "50",
          boxShadow:   `0 0 16px ${color}30`,
        }}
      >
        <div className="font-mono text-gray-400 text-[10px] mb-1">{slot.timeLabel}</div>
        <div className="font-bold" style={{ color }}>{label}</div>
        {slot.state === "running" && slot.runningSeconds > 0 && (
          <div className="text-gray-500 text-[10px] mt-0.5">
            +{fmtDuration(slot.runningSeconds)} odometer
          </div>
        )}
        {slot.rowCount > 0 && (
          <div className="text-gray-600 text-[10px] mt-0.5">{slot.rowCount} pts</div>
        )}
      </div>
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft:  "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop:   `5px solid ${color}50`,
        }}
      />
    </div>
  );
}

function ActivityTimeline({ vehicleId }) {
  const todayIST     = getTodayIST();
  const yesterdayIST = getYesterdayIST();

  const [selectedDate, setSelectedDate] = useState(todayIST);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [hoveredIdx,   setHoveredIdx]   = useState(null);

  /* ── Fetch ── */
  const fetchActivity = useCallback(async (date) => {
    const token = localStorage.getItem("token");
    if (!token || !vehicleId) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/vehicles/${vehicleId}/activity?date=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error("[ActivityTimeline] fetch failed:", err.message);
      setError("Failed to load activity data");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { fetchActivity(selectedDate); }, [selectedDate, fetchActivity]);

  /* ── Derived data ── */
  const slots    = useMemo(() => buildSlots(selectedDate, data?.buckets ?? []), [selectedDate, data]);
  const sessions = useMemo(() => buildSessions(slots), [slots]);
  const summary  = data?.summary;

  /* ── Summary counts derived from slots (client-side, no extra API needed) ── */
  const chargingHours = useMemo(() =>
    slots.filter((s) => s.state === "charging").length * BUCKET_MINS / 60,
  [slots]);

  const dischargingHours = useMemo(() =>
    slots.filter((s) => s.state === "discharging").length * BUCKET_MINS / 60,
  [slots]);

  const longestDischargingSeconds = useMemo(() => {
    let max = 0;
    for (const s of sessions) {
      if (s.state === "discharging") {
        const secs = s.slots * BUCKET_MINS * 60;
        if (secs > max) max = secs;
      }
    }
    return max;
  }, [sessions]);

  const canGoForward = selectedDate < todayIST;
  const hourLabels   = ["00:00","03:00","06:00","09:00","12:00","15:00","18:00","21:00","24:00"];

  return (
    <div
      className="rounded-2xl overflow-hidden mt-8"
      style={{
        background: "linear-gradient(150deg,rgba(13,13,22,0.99) 0%,rgba(18,16,28,0.99) 100%)",
        border:     "1px solid rgba(55,65,81,0.5)",
        boxShadow:  "0 4px 20px rgba(0,0,0,0.45)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-100 tracking-wide">Daily Activity</h2>
            <p className="text-[10px] text-gray-600 mt-0.5 font-mono tracking-widest uppercase">
              Odometer-based · 5-min buckets
            </p>
          </div>

          {/* Date controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedDate(todayIST)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDate === todayIST
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/50"
                  : "text-gray-500 border border-gray-700/50 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayIST)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedDate === yesterdayIST
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/50"
                  : "text-gray-500 border border-gray-700/50 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              Yesterday
            </button>

            <div className="flex items-center gap-1 bg-gray-800/40 rounded-lg border border-gray-700/50 px-1">
              <button
                onClick={() => setSelectedDate((d) => stepDate(d, -1))}
                className="px-2 py-1.5 text-gray-500 hover:text-gray-300 transition text-sm"
              >‹</button>
              <span className="text-xs text-gray-400 font-mono px-1 min-w-[52px] text-center">
                {fmtDateLabel(selectedDate)}
              </span>
              <button
                onClick={() => setSelectedDate((d) => stepDate(d, 1))}
                disabled={!canGoForward}
                className="px-2 py-1.5 text-gray-500 hover:text-gray-300 transition text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >›</button>
            </div>

            <input
              type="date"
              value={selectedDate}
              max={todayIST}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 text-xs focus:outline-none focus:border-orange-500/50 transition"
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-5">

        {/* ── Summary pills ── */}
        {summary && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">

            {/* Running */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: `${RUNNING_COLOR}0d`, border: `1px solid ${RUNNING_COLOR}25` }}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Running</div>
              <div className="text-xl font-black tabular-nums" style={{ color: RUNNING_COLOR }}>
                {summary.running_hours.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 ml-1">hrs</span>
              </div>
            </div>

            {/* Charging */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: `${CHARGING_COLOR}0d`, border: `1px solid ${CHARGING_COLOR}25` }}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Charging</div>
              <div className="text-xl font-black tabular-nums" style={{ color: CHARGING_COLOR }}>
                {chargingHours.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 ml-1">hrs</span>
              </div>
            </div>

            {/* Idle (was: Discharging) */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: `${DISCHARGING_COLOR}0d`, border: `1px solid ${DISCHARGING_COLOR}25` }}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Idle</div>
              <div className="text-xl font-black tabular-nums" style={{ color: DISCHARGING_COLOR }}>
                {dischargingHours.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 ml-1">hrs</span>
              </div>
            </div>

            {/* Sessions */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Sessions</div>
              <div className="text-xl font-black tabular-nums text-violet-400">
                {sessions.filter((s) => s.state === "running").length}
                <span className="text-xs font-normal text-gray-500 ml-1">runs</span>
              </div>
            </div>

            {/* Longest discharging idle */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: "rgba(107,114,128,0.05)", border: "1px solid rgba(107,114,128,0.15)" }}>
              <div className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Longest idle</div>
              <div className="text-xl font-black tabular-nums text-gray-400">
                {longestDischargingSeconds > 0 ? fmtDuration(longestDischargingSeconds) : "–"}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
            <span className="text-xs text-gray-600 font-mono tracking-widest">Loading activity…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4">
            ⚠ {error}
          </div>
        )}

        {/* ── Timeline ── */}
        {!loading && !error && (
          <>
            {/* Hour labels */}
            <div className="flex justify-between mb-1">
              {hourLabels.map((l) => (
                <span key={l} className="text-[9px] text-gray-700 font-mono">{l}</span>
              ))}
            </div>

            {/* 288-bucket strip */}
            <div className="relative">
              <div className="flex gap-[1px] h-10 rounded-lg overflow-hidden">
                {slots.map((slot) => {
                  const color     = stateColor(slot.state);
                  const isHovered = hoveredIdx === slot.index;
                  return (
                    <div
                      key={slot.index}
                      className="relative flex-1 cursor-pointer transition-all duration-75"
                      style={{
                        background:      color,
                        opacity:         slot.state === "offline" ? 1 : isHovered ? 1 : 0.75,
                        transform:       isHovered ? "scaleY(1.15)" : "scaleY(1)",
                        transformOrigin: "center",
                      }}
                      onMouseEnter={() => setHoveredIdx(slot.index)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {isHovered && <BucketTooltip slot={slot} />}
                    </div>
                  );
                })}
              </div>

              {/* Hour grid lines */}
              <div className="absolute inset-0 pointer-events-none flex">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 border-l border-black/20"
                    style={{ borderLeftWidth: i === 0 ? 0 : 1 }}
                  />
                ))}
              </div>
            </div>

            {/* ── Legend — 4 states ── */}
            <div className="flex items-center gap-5 mt-3 flex-wrap">
              {[
                { color: RUNNING_COLOR,     label: "Running (odometer moving)" },
                { color: CHARGING_COLOR,    label: "Charging" },
                { color: DISCHARGING_COLOR, label: "Idle" },
                { color: "#374151",         label: "Offline / Unknown" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>

            {/* ── Session breakdown ── */}
            {sessions.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-widest text-gray-700 mb-3 font-mono">
                  Session Breakdown
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {sessions.map((session, i) => {
                    const color    = stateColor(session.state);
                    const label    = stateLabel(session.state);
                    const durMins  = session.slots * BUCKET_MINS;
                    const endMins  = (session.endIndex + 1) * BUCKET_MINS;
                    const endH     = Math.floor(endMins / 60) % 24;
                    const endM     = endMins % 60;
                    const endLabel = `${String(endH).padStart(2,"0")}:${String(endM).padStart(2,"0")}`;

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{ background: color + "08", border: `1px solid ${color}18` }}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />

                        <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                          {session.startLabel} → {endLabel}
                        </span>

                        <span className="text-xs font-bold tabular-nums" style={{ color }}>
                          {fmtDuration(durMins * 60)}
                        </span>

                        <span className="text-[10px] text-gray-600 ml-auto">{label}</span>

                        {session.state === "running" && session.runningSeconds > 0 && (
                          <span className="text-[10px] text-gray-700 font-mono">
                            +{fmtDuration(session.runningSeconds)} odometer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {data && data.buckets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="text-2xl">◎</div>
                <div className="text-sm text-gray-600">
                  No activity recorded on {fmtDateLabel(selectedDate)}
                </div>
                <div className="text-[10px] text-gray-700">Vehicle was offline the entire day</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main — LiveCharts
───────────────────────────────────────────────────────────── */
export default function LiveCharts() {
  const { id } = useParams();

  const [dataPoints,     setDataPoints]     = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [error,          setError]          = useState(null);
  const [loading,        setLoading]        = useState(true);

  const esRef    = useRef(null);
  const seenTsMs = useRef(new Set());

  const isActivelyLive = lastUpdateTime
    ? Date.now() - lastUpdateTime.getTime() < LIVE_THRESHOLD_MS
    : false;

  const isStaleSession = lastUpdateTime
    ? Date.now() - lastUpdateTime.getTime() > STALE_THRESHOLD_MS
    : false;

  const addPoint = useCallback((raw) => {
    if (!raw?.recorded_at) return;
    const ts   = new Date(raw.recorded_at);
    const tsMs = ts.getTime();
    if (isNaN(tsMs)) return;
    if (seenTsMs.current.has(tsMs)) return;
    seenTsMs.current.add(tsMs);

    const point = { ts: tsMs, label: toLabel(ts), ...extractFields(raw) };

    setDataPoints((prev) => {
      const isOldData = Date.now() - tsMs > STALE_THRESHOLD_MS;
      if (isOldData) return [...prev, point].slice(-MAX_POINTS);
      const cutoff = Date.now() - WINDOW_MS;
      return [...prev.filter((p) => p.ts >= cutoff), point]
        .sort((a, b) => a.ts - b.ts)
        .slice(-MAX_POINTS);
    });
  }, []);

  /* ── Seed ── */
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated"); setLoading(false); return; }

    (async () => {
      try {
        const res = await fetch(`/api/vehicles/${id}/timeseries?minutes=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();

        if (Array.isArray(rows) && rows.length > 0) {
          const sorted = [...rows].sort(
            (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
          );
          const points = [];
          for (const raw of sorted) {
            const ts   = new Date(raw.recorded_at);
            const tsMs = ts.getTime();
            if (isNaN(tsMs)) continue;
            seenTsMs.current.add(tsMs);
            points.push({ ts: tsMs, label: toLabel(ts), ...extractFields(raw) });
          }
          const lastRow = sorted[sorted.length - 1];
          if (lastRow?.recorded_at) setLastUpdateTime(new Date(lastRow.recorded_at));
          setDataPoints(points);
        }
      } catch (err) {
        console.warn("[LiveCharts] seed failed:", err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── SSE ── */
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    if (esRef.current) esRef.current.close();
    const es = new EventSource(`/api/vehicles/${id}/stream?token=${token}`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addPoint(data);
        if (data.recorded_at) setLastUpdateTime(new Date(data.recorded_at));
        setError(null);
      } catch (e) {
        console.error("[LiveCharts] SSE parse error:", e);
      }
    };
    es.onerror = () => setError("Live stream lost – showing last known data");
    es.onopen  = () => setError(null);

    return () => { if (esRef.current) { esRef.current.close(); esRef.current = null; } };
  }, [id, addPoint]);

  /* ── Rolling-window trimmer ── */
  useEffect(() => {
    const timer = setInterval(() => {
      if (isActivelyLive) {
        setDataPoints((prev) => {
          if (!prev.length) return prev;
          const cutoff = Date.now() - WINDOW_MS;
          if (prev[0].ts >= cutoff) return prev;
          return prev.filter((p) => p.ts >= cutoff);
        });
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [isActivelyLive]);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
          <div
            className="absolute inset-1 rounded-full border-2 border-transparent border-b-orange-400/50 animate-spin"
            style={{ animationDuration: "1.4s", animationDirection: "reverse" }}
          />
        </div>
        <p className="text-sm text-orange-300/70 font-medium tracking-wide">Loading historical data…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-5">
          Live Performance Charts
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
            <div className="text-sm text-orange-300 font-medium">{formatTimestamp(lastUpdateTime)}</div>
          </div>
        </div>

        {isStaleSession && !isActivelyLive && (
          <div className="text-xs text-gray-400 bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-2.5 mt-3 flex items-center gap-2">
            <span className="text-gray-500">◎</span>
            Showing last recorded session from{" "}
            <span className="text-orange-300 font-medium">{formatTimestamp(lastUpdateTime)}</span>
            {" "}— charts will update automatically when vehicle comes online
          </div>
        )}

        {error && !isStaleSession && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 mt-3">
            ⚠ {error}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
          <span className="text-[10px] font-mono tracking-widest text-gray-700 uppercase">
            {isStaleSession ? "Last session · 5 min window" : "5-min rolling window · 2 s"} · {dataPoints.length} pts
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
        </div>
      </div>

      {/* Live Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHARTS.map((cfg) => (
          <ChartCard
            key={cfg.key}
            cfg={cfg}
            data={dataPoints}
            isLive={isActivelyLive}
            isStale={isStaleSession && !isActivelyLive}
          />
        ))}
      </div>

      {/* Daily Activity */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
          <span className="text-[10px] font-mono tracking-widest text-gray-700 uppercase">Daily Activity</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
        </div>
        <ActivityTimeline vehicleId={id} />
      </div>

      <p className="mt-5 text-center text-[10px] font-mono text-gray-700 tracking-widest">
        {isActivelyLive
          ? "OLDEST POINTS DROP AUTOMATICALLY AS NEW DATA ARRIVES"
          : "WAITING FOR VEHICLE TO COME ONLINE"}
      </p>
    </div>
  );
}