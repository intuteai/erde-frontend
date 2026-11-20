import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { TrendChart, ChartCard, Section, Stat, PALETTE } from "./analyticsChartKit";

// Vehicle #1 (EE-R-DC-CETL90-L1) is the oldest unit on the fleet and keeps
// its original Motor Analytics layout — every other vehicle gets the
// redesigned version below. See LegacyMotorAnalytics at the bottom of this
// file for the untouched original component.
export default function MotorAnalytics() {
  const { id } = useParams();
  if (id === "1") return <LegacyMotorAnalytics />;
  return <ModernMotorAnalytics />;
}

/* ========================= MODERN MOTOR ANALYTICS ========================= */
function ModernMotorAnalytics() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ===== FETCH 30-DAY / SINGLE-DAY SUMMARY ROW(S) ===== */
  // Guards against a stale response landing after a newer one — without
  // this, switching vehicles (e.g. via the jump dropdown) before a request
  // resolves could have an older vehicle's slower-to-arrive response
  // overwrite a newer vehicle's already-correct chart data. Previously
  // masked by every vehicle switch fully remounting this component;
  // no longer true now that navigation preserves state.
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = selectedDate
          ? `/api/motor/analytics/${id}?date=${selectedDate}`
          : `/api/motor/analytics/${id}?days=30`;
        const { data: rows } = await axios.get(url);
        if (cancelled) return;
        setData(rows || []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) fetchData();
    return () => { cancelled = true; };
  }, [id, selectedDate]);

  /* ===== FETCH HOUR-BY-HOUR BREAKDOWN FOR THE SELECTED DAY =====
     A single day's daily-rollup row is one data point — not a trend. The
     hourly endpoint queries live_values directly for that one day so a
     past date shows real graphs, not just a summary. */
  useEffect(() => {
    if (!id || !selectedDate) {
      setHourly([]);
      return;
    }
    let cancelled = false;
    const fetchHourly = async () => {
      try {
        setHourlyLoading(true);
        const { data: rows } = await axios.get(
          `/api/motor/analytics/${id}/hourly?date=${selectedDate}`
        );
        if (cancelled) return;
        setHourly(rows || []);
      } catch (err) {
        if (!cancelled) setHourly([]);
      } finally {
        if (!cancelled) setHourlyLoading(false);
      }
    };
    fetchHourly();
    return () => { cancelled = true; };
  }, [id, selectedDate]);

  const odo = useMemo(() => {
    if (!data.length || selectedDate)
      return { maxPower: 0, maxTorque: 0, maxCurrent: 0, maxTemp: 0, maxRpm: 0 };
    return {
      maxPower: Math.max(...data.map(d => Number(d.max_op_power_kw ?? 0))),
      maxTorque: Math.max(...data.map(d => Number(d.max_op_torque_nm ?? 0))),
      maxCurrent: Math.max(...data.map(d => Number(d.max_op_current_a ?? 0))),
      maxTemp: Math.max(...data.map(d => Number(d.max_motor_temp_c ?? 0))),
      maxRpm: Math.max(...data.map(d => Number(d.max_motor_speed_rpm ?? 0))),
    };
  }, [data, selectedDate]);

  const latestTrip = useMemo(() => (data.length ? data[0] : {}), [data]);

  const chartData = useMemo(() => [...data].reverse(), [data]);

  const hourlyChartData = useMemo(() => {
    // Fill every hour 0-23 so the x-axis is a complete day even when some
    // hours have no telemetry (vehicle idle/offline that hour).
    const byHour = new Map(hourly.map(h => [Number(h.hour), h]));
    return Array.from({ length: 24 }, (_, h) => {
      const row = byHour.get(h) || {};
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        power: row.max_op_power_kw != null ? Number(row.max_op_power_kw) : null,
        torque: row.max_op_torque_nm != null ? Number(row.max_op_torque_nm) : null,
        current: row.max_op_current_a != null ? Number(row.max_op_current_a) : null,
        temp: row.max_motor_temp_c != null ? Number(row.max_motor_temp_c) : null,
      };
    });
  }, [hourly]);

  const handleClearDate = () => setSelectedDate("");

  if (loading)
    return <div className="text-center py-16 text-orange-300">Loading motor analytics…</div>;

  if (error)
    return <div className="text-center py-16 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-8 pb-8">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Motor Analytics
      </h2>

      <div className="flex justify-center items-center gap-4 flex-wrap">
        <label className="text-orange-300 text-sm font-medium">View by Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-900/80 border border-orange-500/40 text-orange-200 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none transition"
        />
        {selectedDate && (
          <button
            onClick={handleClearDate}
            className="text-orange-400 hover:text-orange-300 underline text-sm transition"
          >
            Show last 30 days
          </button>
        )}
      </div>

      {!selectedDate && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="ODO Summary (Last 30 Days)">
            <Stat label="Max Output Power" value={odo.maxPower} unit="kW" palette={PALETTE.orange} />
            <Stat label="Max Output Torque" value={odo.maxTorque} unit="Nm" palette={PALETTE.purple} />
            <Stat label="Max AC Current" value={odo.maxCurrent} unit="A" palette={PALETTE.sky} />
            <Stat label="Max Motor Temperature" value={odo.maxTemp} unit="°C" palette={PALETTE.rose} warn={80} danger={95} />
            <Stat label="Max Motor Speed" value={odo.maxRpm} unit="RPM" palette={PALETTE.cyan} />
          </Section>

          <Section title="Last Day">
            <Stat label="Max Output Power" value={latestTrip.max_op_power_kw} unit="kW" palette={PALETTE.orange} />
            <Stat label="Max Output Torque" value={latestTrip.max_op_torque_nm} unit="Nm" palette={PALETTE.purple} />
            <Stat label="Max AC Current" value={latestTrip.max_op_current_a} unit="A" palette={PALETTE.sky} />
            <Stat label="Max Motor Temperature" value={latestTrip.max_motor_temp_c} unit="°C" palette={PALETTE.rose} warn={80} danger={95} />
            <Stat label="Max Motor Speed" value={latestTrip.max_motor_speed_rpm} unit="RPM" palette={PALETTE.cyan} fixed={0} />
          </Section>
        </div>
      )}

      {data.length === 0 && !selectedDate && (
        <div className="text-center py-12 text-orange-300/70">
          No motor analytics data available for the selected period.
        </div>
      )}

      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title={`Trip on ${selectedDate}`}>
            <Stat label="Max Output Power" value={latestTrip.max_op_power_kw} unit="kW" palette={PALETTE.orange} />
            <Stat label="Max Output Torque" value={latestTrip.max_op_torque_nm} unit="Nm" palette={PALETTE.purple} />
            <Stat label="Max AC Current" value={latestTrip.max_op_current_a} unit="A" palette={PALETTE.sky} />
            <Stat label="Max Motor Temperature" value={latestTrip.max_motor_temp_c} unit="°C" palette={PALETTE.rose} warn={80} danger={95} />
            <Stat label="Max Motor Speed" value={latestTrip.max_motor_speed_rpm} unit="RPM" palette={PALETTE.cyan} fixed={0} />
          </Section>

          {!latestTrip.day && (
            <div className="border border-white/10 rounded-2xl p-6 flex items-center justify-center text-gray-500 text-sm">
              No motor data recorded on this date.
            </div>
          )}
        </div>
      )}

      {/* ===== TREND CHARTS ===== */}
      {!selectedDate && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Max Output Power" subtitle="Daily peak over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_op_power_kw ?? 0) }))}
              xKey="day"
              palette={PALETTE.orange}
              unit="kW"
            />
          </ChartCard>

          <ChartCard title="Max Output Torque" subtitle="Daily peak over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_op_torque_nm ?? 0) }))}
              xKey="day"
              palette={PALETTE.purple}
              unit="Nm"
            />
          </ChartCard>

          <ChartCard title="Max AC Current" subtitle="Daily peak over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_op_current_a ?? 0) }))}
              xKey="day"
              palette={PALETTE.sky}
              unit="A"
            />
          </ChartCard>

          <ChartCard title="Max Motor Temperature" subtitle="Daily peak over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_motor_temp_c ?? 0) }))}
              xKey="day"
              palette={PALETTE.rose}
              unit="°C"
              warnLine={80}
              dangerLine={95}
            />
          </ChartCard>
        </div>
      )}

      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Output Power" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="power" palette={PALETTE.orange} unit="kW" />
            )}
          </ChartCard>

          <ChartCard title="Output Torque" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="torque" palette={PALETTE.purple} unit="Nm" />
            )}
          </ChartCard>

          <ChartCard title="AC Current" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="current" palette={PALETTE.sky} unit="A" />
            )}
          </ChartCard>

          <ChartCard title="Motor Temperature" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="temp" palette={PALETTE.rose} unit="°C" warnLine={80} dangerLine={95} />
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

/* ========================= LEGACY MOTOR ANALYTICS (VEHICLE #1 ONLY) =========================
   Untouched original implementation — kept exactly as it was so vehicle #1
   (EE-R-DC-CETL90-L1) keeps its existing format while every other vehicle
   gets ModernMotorAnalytics above. */
function LegacyMotorAnalytics() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const url = selectedDate
          ? `/api/motor/analytics/${id}?date=${selectedDate}`
          : `/api/motor/analytics/${id}?days=30`;

        const { data: rows } = await axios.get(url);
        setData(rows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, selectedDate]);

  const odo = useMemo(() => {
    if (!data.length || selectedDate)
      return { maxPower: 0, maxTorque: 0, maxTemp: 0, maxRpm: 0 };

    return {
      maxPower: Math.max(...data.map(d => Number(d.max_op_power_kw ?? 0))),
      maxTorque: Math.max(...data.map(d => Number(d.max_op_torque_nm ?? 0))),
      maxTemp: Math.max(...data.map(d => Number(d.max_motor_temp_c ?? 0))),
      maxRpm: Math.max(...data.map(d => Number(d.max_motor_speed_rpm ?? 0))),
    };
  }, [data, selectedDate]);

  const latestTrip = useMemo(() => {
    if (!data.length) return {};
    return data[0];
  }, [data]);

  const chartData = useMemo(() => [...data].reverse(), [data]);

  const handleClearDate = () => {
    setSelectedDate("");
  };

  if (loading)
    return (
      <div className="text-center py-16 text-orange-300">
        Loading motor analytics…
      </div>
    );

  if (error)
    return (
      <div className="text-center py-16 text-red-400">
        Error: {error}
      </div>
    );

  return (
    <div className="space-y-8 pb-8">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Motor Analytics
      </h2>

      <div className="flex justify-center items-center gap-4 flex-wrap">
        <label className="text-orange-300 text-sm font-medium">View by Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-900/80 border border-orange-500/40 text-orange-200 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none transition"
        />
        {selectedDate && (
          <button
            onClick={handleClearDate}
            className="text-orange-400 hover:text-orange-300 underline text-sm transition"
          >
            Show last 30 days
          </button>
        )}
      </div>

      {!selectedDate && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LegacySection title="ODO Summary (Last 30 Days)">
            <LegacyStat label="Max Output Power" value={odo.maxPower} unit="kW" />
            <LegacyStat label="Max Output Torque" value={odo.maxTorque} unit="Nm" />
            <LegacyStat
              label="Max Motor Temperature"
              value={odo.maxTemp}
              unit="°C"
              warn={80}
              danger={95}
            />
            <LegacyStat label="Max Motor Speed" value={odo.maxRpm} unit="RPM" />
          </LegacySection>

          <LegacySection title="Last Day">
            <LegacyStat
              label="Max Output Power"
              value={latestTrip.max_op_power_kw ?? latestTrip.max_op_power_last_trip ?? 0}
              unit="kW"
            />
            <LegacyStat
              label="Max Output Torque"
              value={latestTrip.max_op_torque_nm ?? latestTrip.max_op_torque_last_trip ?? 0}
              unit="Nm"
            />
            <LegacyStat
              label="Max Motor Temperature"
              value={latestTrip.max_motor_temp_c ?? latestTrip.max_motor_temp_last_trip ?? 0}
              unit="°C"
              warn={80}
              danger={95}
            />
            <LegacyStat
              label="Max Motor Speed"
              value={
                latestTrip.max_motor_speed_rpm ??
                latestTrip.max_motor_speed_last_trip_rpm ??
                0
              }
              unit="RPM"
            />
          </LegacySection>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-12 text-orange-300/70">
          No motor analytics data available for the selected period.
        </div>
      )}

      {data.length > 0 && (
        <>
          {!selectedDate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LegacyChartCard title="Max Output Power Trend (kW)">
                <LegacyLineChart
                  data={chartData.map(d => ({ x: d.day, y: Number(d.max_op_power_kw ?? 0) }))}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Max Output Torque Trend (Nm)">
                <LegacyLineChart
                  data={chartData.map(d => ({ x: d.day, y: Number(d.max_op_torque_nm ?? 0) }))}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Max Motor Temperature Trend (°C)">
                <LegacyLineChart
                  data={chartData.map(d => ({ x: d.day, y: Number(d.max_motor_temp_c ?? 0) }))}
                  band={{ warn: 80, danger: 95 }}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Max Motor Speed Trend (RPM)">
                <LegacyLineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.max_motor_speed_rpm ?? 0),
                  }))}
                />
              </LegacyChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LegacySection title={`Trip on ${selectedDate}`}>
                <LegacyStat
                  label="Max Output Power"
                  value={latestTrip.max_op_power_kw ?? latestTrip.max_op_power_last_trip ?? 0}
                  unit="kW"
                />
                <LegacyStat
                  label="Max Output Torque"
                  value={latestTrip.max_op_torque_nm ?? latestTrip.max_op_torque_last_trip ?? 0}
                  unit="Nm"
                />
                <LegacyStat
                  label="Max Motor Temperature"
                  value={latestTrip.max_motor_temp_c ?? latestTrip.max_motor_temp_last_trip ?? 0}
                  unit="°C"
                  warn={80}
                  danger={95}
                />
                <LegacyStat
                  label="Max Motor Speed"
                  value={
                    latestTrip.max_motor_speed_rpm ??
                    latestTrip.max_motor_speed_last_trip_rpm ??
                    0
                  }
                  unit="RPM"
                />
              </LegacySection>

              <LegacyChartCard title={`Motor Performance on ${selectedDate}`}>
                <LegacyBarChart
                  data={[
                    { x: "Power", y: Number(latestTrip.max_op_power_kw ?? 0) },
                    { x: "Torque", y: Number(latestTrip.max_op_torque_nm ?? 0) },
                    { x: "RPM", y: Number(latestTrip.max_motor_speed_rpm ?? 0) },
                    { x: "Temp", y: Number(latestTrip.max_motor_temp_c ?? 0) },
                  ]}
                  band={{ warn: 80, danger: 95 }}
                />
              </LegacyChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========================= LEGACY UI HELPERS ========================= */

function LegacySection({ title, children }) {
  return (
    <div className="border border-orange-500/30 p-6 rounded-xl bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-lg">
      <h3 className="font-bold text-orange-400 mb-5 text-lg border-b border-orange-500/20 pb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function LegacyStat({ label, value, unit, warn, danger }) {
  const v = Number(value ?? 0).toFixed(2);
  let color = "text-emerald-400";
  let bgColor = "bg-emerald-500/10";

  if (warn && danger) {
    const num = parseFloat(v);
    if (num >= danger) {
      color = "text-red-400";
      bgColor = "bg-red-500/10";
    } else if (num >= warn) {
      color = "text-yellow-400";
      bgColor = "bg-yellow-500/10";
    }
  }

  if (label === "Max Motor Speed") {
    color = "text-cyan-400";
    bgColor = "bg-cyan-500/10";
  }

  return (
    <div className="flex justify-between items-center bg-gray-800/50 px-5 py-4 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all">
      <span className="text-gray-300 font-medium">{label}</span>
      <div className={`${bgColor} px-3 py-1 rounded-md`}>
        <span className={`font-bold text-lg ${color}`}>
          {v} <span className="text-sm opacity-70 font-normal">{unit}</span>
        </span>
      </div>
    </div>
  );
}

function LegacyChartCard({ title, children }) {
  return (
    <div className="border border-orange-500/30 rounded-xl p-5 bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-lg">
      <h3 className="text-orange-400 font-bold mb-4 text-center text-base">{title}</h3>
      <div className="flex justify-center bg-black/30 rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}

function LegacyLineChart({ data, band }) {
  if (!data || data.length === 0)
    return <div className="h-48 flex items-center justify-center text-gray-500">No data</div>;

  const width = 600;
  const height = 220;
  const pad = 40;

  const values = data.map(d => d.y);
  const maxY = Math.max(...values, band?.danger || 100, 10);
  const minY = Math.min(...values, 0);

  const points = data.map((d, i) => {
    const val = d.y;
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((val - minY) / (maxY - minY)) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(251,146,60)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(251,146,60)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = height - pad - ratio * (height - pad * 2);
        const gridValue = (minY + ratio * (maxY - minY)).toFixed(1);
        return (
          <g key={ratio}>
            <line
              x1={pad}
              y1={y}
              x2={width - pad}
              y2={y}
              stroke="rgba(251,146,60,0.15)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text
              x={pad - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="rgb(156,163,175)"
            >
              {gridValue}
            </text>
          </g>
        );
      })}

      <polygon
        fill="url(#lineGradient)"
        points={areaPoints}
      />

      <polyline
        fill="none"
        stroke="rgb(251,146,60)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {data.map((d, i) => {
        const val = d.y;
        const x = pad + (i / (data.length - 1)) * (width - pad * 2);
        const y = height - pad - ((val - minY) / (maxY - minY)) * (height - pad * 2);

        let fill = "rgb(251,146,60)";
        if (band) {
          if (val >= band.danger) fill = "rgb(239,68,68)";
          else if (val >= band.warn) fill = "rgb(234,179,8)";
        }

        return (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="rgba(0,0,0,0.6)" />
            <circle cx={x} cy={y} r="4" fill={fill} />
            <title>{`${d.x}: ${val.toFixed(2)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function LegacyBarChart({ data, band }) {
  if (!data || data.length === 0)
    return <div className="h-48 flex items-center justify-center text-gray-500">No data</div>;

  const width = 560;
  const height = 220;
  const pad = 50;

  const values = data.map(d => d.y);
  const maxY = Math.max(...values, band?.danger || 100, 10);

  const barWidth = (width - pad * 2) / data.length - 20;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        {data.map((d, i) => {
          let color1 = "rgb(251,146,60)";
          let color2 = "rgb(251,191,36)";

          if (d.x === "Temp" && band) {
            if (d.y >= band.danger) {
              color1 = "rgb(239,68,68)";
              color2 = "rgb(220,38,38)";
            } else if (d.y >= band.warn) {
              color1 = "rgb(234,179,8)";
              color2 = "rgb(202,138,4)";
            }
          } else if (d.x === "RPM") {
            color1 = "rgb(34,211,238)";
            color2 = "rgb(6,182,212)";
          }

          return (
            <linearGradient key={i} id={`barGradient${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          );
        })}
      </defs>

      {[0.25, 0.5, 0.75].map(ratio => (
        <line
          key={ratio}
          x1={pad}
          y1={height - pad - ratio * (height - pad * 2)}
          x2={width - pad}
          y2={height - pad - ratio * (height - pad * 2)}
          stroke="rgba(251,146,60,0.1)"
          strokeDasharray="4,4"
        />
      ))}

      {data.map((d, i) => {
        const val = d.y;
        const barHeight = (val / maxY) * (height - pad * 2);
        const y = height - pad - barHeight;
        const x = pad + i * (barWidth + 20) + 10;

        return (
          <g key={i}>
            <rect
              x={x + 2}
              y={y + 2}
              width={barWidth}
              height={barHeight}
              rx="8"
              fill="rgba(0,0,0,0.3)"
            />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="8"
              fill={`url(#barGradient${i})`}
            />
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize="13"
              fill="rgb(209,213,219)"
              fontWeight="600"
            >
              {d.x}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 10}
              textAnchor="middle"
              fontSize="15"
              fill={d.x === "RPM" ? "rgb(34,211,238)" : "rgb(251,146,60)"}
              fontWeight="bold"
            >
              {val.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
