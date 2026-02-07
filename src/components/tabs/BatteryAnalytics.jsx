import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ========================= BATTERY ANALYTICS ========================= */
export default function BatteryAnalytics() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ===== FETCH DATA ===== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        const url = selectedDate
          ? `/api/battery/analytics/${id}?date=${selectedDate}`
          : `/api/battery/analytics/${id}?days=30`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load battery analytics");

        const rows = await res.json();
        setData(rows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, selectedDate]);

  /* ===== ODO SUMMARY (ONLY FOR 30 DAYS VIEW) ===== */
  const odo = useMemo(() => {
    if (!data.length || selectedDate)
      return { energyUsed: null, maxCurrent: 0, maxTemp: 0, avgTemp: null };

    const energyUsed = data
      .map(d => Number(d.total_kwh_consumed || 0))
      .reduce((a, b) => a + b, 0);

    const validAvgTemps = data
      .map(d => Number(d.avg_cell_temp_c ?? 0))
      .filter(v => v > 0);
    const avgTemp = validAvgTemps.length
      ? validAvgTemps.reduce((a, b) => a + b, 0) / validAvgTemps.length
      : null;

    return {
      energyUsed: energyUsed || null,
      maxCurrent: Math.max(...data.map(d => Number(d.max_op_dc_current_a ?? 0))),
      maxTemp: Math.max(...data.map(d => Number(d.max_cell_temp_c ?? 0))),
      avgTemp,
    };
  }, [data, selectedDate]);

  /* ===== LATEST / SELECTED DAY ===== */
  const latestTrip = useMemo(() => {
    if (!data.length) return {};
    return data[0];
  }, [data]);

  /* ===== CHART DATA (ASC ORDER) ===== */
  const chartData = useMemo(() => [...data].reverse(), [data]);

  const handleClearDate = () => setSelectedDate("");

  if (loading)
    return (
      <div className="text-center py-16 text-orange-300">
        Loading battery analytics…
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
      {/* ===== CENTERED TITLE ===== */}
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Battery Analytics
      </h2>

      {/* ===== DATE FILTER ===== */}
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

      {/* ===== SUMMARY ===== */}
      {!selectedDate && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="ODO Summary (Last 30 Days)">
            <Stat label="Energy Used" value={odo.energyUsed} unit="kWh" />
            <Stat label="Max DC Current" value={odo.maxCurrent} unit="A" />
            <Stat label="Max Cell Temperature" value={odo.maxTemp} unit="°C" warn={45} danger={55} />
            <Stat label="Avg Cell Temperature" value={odo.avgTemp} unit="°C" warn={42} danger={52} />
          </Section>

          <Section title="Latest Day">
            <Stat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" />
            <Stat
              label="Max DC Current"
              value={latestTrip.max_op_dc_current_a}
              unit="A"
            />
            <Stat
              label="Max Cell Temperature"
              value={latestTrip.max_cell_temp_c}
              unit="°C"
              warn={45}
              danger={55}
            />
            <Stat
              label="Avg Cell Temperature"
              value={latestTrip.avg_cell_temp_c}
              unit="°C"
              warn={42}
              danger={52}
            />
          </Section>
        </div>
      )}

      {/* ===== NO DATA ===== */}
      {data.length === 0 && (
        <div className="text-center py-12 text-orange-300/70">
          No battery analytics data available for the selected period.
        </div>
      )}

      {/* ===== CHARTS ===== */}
      {data.length > 0 && (
        <>
          {!selectedDate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Energy Consumption Trend (kWh)">
                <LineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.total_kwh_consumed ?? 0),
                  }))}
                />
              </ChartCard>

              <ChartCard title="Max Cell Temperature Trend (°C)">
                <LineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.max_cell_temp_c ?? 0),
                  }))}
                  band={{ warn: 45, danger: 55 }}
                />
              </ChartCard>

              <ChartCard title="Avg Cell Temperature Trend (°C)">
                <LineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.avg_cell_temp_c ?? 0),
                  }))}
                  band={{ warn: 42, danger: 52 }}
                />
              </ChartCard>

              <ChartCard title="Max DC Current Trend (A)">
                <LineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.max_op_dc_current_a ?? 0),
                  }))}
                />
              </ChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title={`Data on ${selectedDate}`}>
                <Stat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" />
                <Stat
                  label="Max DC Current"
                  value={latestTrip.max_op_dc_current_a}
                  unit="A"
                />
                <Stat
                  label="Max Cell Temperature"
                  value={latestTrip.max_cell_temp_c}
                  unit="°C"
                  warn={45}
                  danger={55}
                />
                <Stat
                  label="Avg Cell Temperature"
                  value={latestTrip.avg_cell_temp_c}
                  unit="°C"
                  warn={42}
                  danger={52}
                />
              </Section>

              <ChartCard title={`Battery Metrics on ${selectedDate}`}>
                <BarChart
                  data={[
                    { x: "Energy", y: Number(latestTrip.total_kwh_consumed ?? 0) },
                    { x: "DC Current", y: Number(latestTrip.max_op_dc_current_a ?? 0) },
                    { x: "Max Temp", y: Number(latestTrip.max_cell_temp_c ?? 0) },
                    { x: "Avg Temp", y: Number(latestTrip.avg_cell_temp_c ?? 0) },
                  ]}
                  band={{ warn: 45, danger: 55 }}
                />
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========================= UI HELPERS ========================= */

function Section({ title, children }) {
  return (
    <div className="border border-orange-500/30 p-6 rounded-xl bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-lg">
      <h3 className="font-bold text-orange-400 mb-5 text-lg border-b border-orange-500/20 pb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, unit, warn, danger }) {
  if (value == null || isNaN(value))
    return (
      <div className="flex justify-between items-center bg-gray-800/50 px-5 py-4 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400">–</span>
      </div>
    );

  const v = Number(value).toFixed(2);
  let color = "text-emerald-400";
  let bgColor = "bg-emerald-500/10";

  if (warn && danger) {
    const n = Number(v);
    if (n >= danger) {
      color = "text-red-400";
      bgColor = "bg-red-500/10";
    } else if (n >= warn) {
      color = "text-yellow-400";
      bgColor = "bg-yellow-500/10";
    }
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

function ChartCard({ title, children }) {
  return (
    <div className="border border-orange-500/30 rounded-xl p-5 bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-lg">
      <h3 className="text-orange-400 font-bold mb-4 text-center text-base">{title}</h3>
      <div className="flex justify-center bg-black/30 rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}

/* ========================= IMPROVED CHARTS ========================= */

function LineChart({ data, band }) {
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

      {/* Grid lines */}
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

      {/* Area fill */}
      <polygon fill="url(#lineGradient)" points={areaPoints} />

      {/* Trend line */}
      <polyline
        fill="none"
        stroke="rgb(251,146,60)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {/* Data points */}
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

function BarChart({ data, band }) {
  if (!data || data.length === 0)
    return <div className="h-48 flex items-center justify-center text-gray-500">No data</div>;

  const width = 560;
  const height = 220;
  const pad = 50;

  const values = data.map(d => d.y);
  const maxY = Math.max(...values, band?.danger || 100, 10);

  const barWidth = (width - pad * 2) / data.length - 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        {data.map((d, i) => {
          let color1 = "rgb(251,146,60)";
          let color2 = "rgb(251,191,36)";

          if (band && (d.x.includes("Temp") || d.x === "Max Temp" || d.x === "Avg Temp")) {
            if (d.y >= band.danger) {
              color1 = "rgb(239,68,68)";
              color2 = "rgb(220,38,38)";
            } else if (d.y >= band.warn) {
              color1 = "rgb(234,179,8)";
              color2 = "rgb(202,138,4)";
            }
          }

          return (
            <linearGradient key={i} id={`barGradient${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Grid lines */}
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
        const x = pad + i * (barWidth + 30) + 15;

        return (
          <g key={i}>
            {/* Shadow */}
            <rect
              x={x + 2}
              y={y + 2}
              width={barWidth}
              height={barHeight}
              rx="8"
              fill="rgba(0,0,0,0.3)"
            />
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="8"
              fill={`url(#barGradient${i})`}
            />
            {/* Label */}
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
            {/* Value */}
            <text
              x={x + barWidth / 2}
              y={y - 10}
              textAnchor="middle"
              fontSize="15"
              fill="rgb(251,146,60)"
              fontWeight="bold"
            >
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}