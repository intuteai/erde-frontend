import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { TrendChart, ChartCard, Section, Stat, PALETTE } from "./analyticsChartKit";

// Vehicle #1 (EE-R-DC-CETL90-L1) keeps its original Battery Analytics
// layout — every other vehicle gets the redesigned version below. See
// LegacyBatteryAnalytics at the bottom of this file for the untouched
// original component.
export default function BatteryAnalytics() {
  const { id } = useParams();
  if (id === "1") return <LegacyBatteryAnalytics />;
  return <ModernBatteryAnalytics />;
}

/* ========================= MODERN BATTERY ANALYTICS ========================= */
function ModernBatteryAnalytics() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [error, setError] = useState(null);

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
          ? `/api/battery/analytics/${id}?date=${selectedDate}`
          : `/api/battery/analytics/${id}?days=30`;
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
          `/api/battery/analytics/${id}/hourly?date=${selectedDate}`
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
      return { energyUsed: null, maxCurrent: 0, maxCellTemp: 0, minCellTemp: null, maxPackTemp: 0, minPackTemp: null, maxSoc: null, minSoc: null };

    const energyUsed = data.map(d => Number(d.total_kwh_consumed || 0)).reduce((a, b) => a + b, 0);

    const minCellTemps = data.map(d => d.min_cell_temp_c).filter(v => v != null).map(Number);
    const minPackTemps = data.map(d => d.min_pack_temp_c).filter(v => v != null).map(Number);
    const maxSocs = data.map(d => d.max_soc_percent).filter(v => v != null).map(Number);
    const minSocs = data.map(d => d.min_soc_percent).filter(v => v != null).map(Number);

    return {
      energyUsed: energyUsed || null,
      maxCurrent: Math.max(...data.map(d => Number(d.max_op_dc_current_a ?? 0))),
      maxCellTemp: Math.max(...data.map(d => Number(d.max_cell_temp_c ?? 0))),
      minCellTemp: minCellTemps.length ? Math.min(...minCellTemps) : null,
      maxPackTemp: Math.max(...data.map(d => Number(d.max_pack_temp_c ?? 0))),
      minPackTemp: minPackTemps.length ? Math.min(...minPackTemps) : null,
      maxSoc: maxSocs.length ? Math.max(...maxSocs) : null,
      minSoc: minSocs.length ? Math.min(...minSocs) : null,
    };
  }, [data, selectedDate]);

  const latestTrip = useMemo(() => (data.length ? data[0] : {}), [data]);

  const chartData = useMemo(() => [...data].reverse(), [data]);

  const hourlyChartData = useMemo(() => {
    const byHour = new Map(hourly.map(h => [Number(h.hour), h]));
    return Array.from({ length: 24 }, (_, h) => {
      const row = byHour.get(h) || {};
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        current: row.max_op_dc_current_a != null ? Number(row.max_op_dc_current_a) : null,
        maxCellTemp: row.max_cell_temp_c != null ? Number(row.max_cell_temp_c) : null,
        minCellTemp: row.min_cell_temp_c != null ? Number(row.min_cell_temp_c) : null,
        maxPackTemp: row.max_pack_temp_c != null ? Number(row.max_pack_temp_c) : null,
        minPackTemp: row.min_pack_temp_c != null ? Number(row.min_pack_temp_c) : null,
        soc: row.max_soc_percent != null ? Number(row.max_soc_percent) : null,
        minSoc: row.min_soc_percent != null ? Number(row.min_soc_percent) : null,
      };
    });
  }, [hourly]);

  const handleClearDate = () => setSelectedDate("");

  if (loading)
    return <div className="text-center py-16 text-orange-300">Loading battery analytics…</div>;

  if (error)
    return <div className="text-center py-16 text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-8 pb-8">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Battery Analytics
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
            <Stat label="Energy Used" value={odo.energyUsed} unit="kWh" palette={PALETTE.amber} />
            <Stat label="Max DC Current" value={odo.maxCurrent} unit="A" palette={PALETTE.sky} />
            <Stat label="Max SOC" value={odo.maxSoc} unit="%" palette={PALETTE.emerald} />
            <Stat label="Min SOC" value={odo.minSoc} unit="%" palette={PALETTE.emerald} />
            <Stat label="Max Cell Temperature" value={odo.maxCellTemp} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Cell Temperature" value={odo.minCellTemp} unit="°C" palette={PALETTE.indigo} />
            <Stat label="Max Pack Temperature" value={odo.maxPackTemp} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Pack Temperature" value={odo.minPackTemp} unit="°C" palette={PALETTE.indigo} />
          </Section>

          <Section title="Latest Day">
            <Stat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" palette={PALETTE.amber} />
            <Stat label="Max DC Current" value={latestTrip.max_op_dc_current_a} unit="A" palette={PALETTE.sky} />
            <Stat label="Max SOC" value={latestTrip.max_soc_percent} unit="%" palette={PALETTE.emerald} />
            <Stat label="Min SOC" value={latestTrip.min_soc_percent} unit="%" palette={PALETTE.emerald} />
            <Stat label="Max Cell Temperature" value={latestTrip.max_cell_temp_c} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Cell Temperature" value={latestTrip.min_cell_temp_c} unit="°C" palette={PALETTE.indigo} />
            <Stat label="Max Pack Temperature" value={latestTrip.max_pack_temp_c} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Pack Temperature" value={latestTrip.min_pack_temp_c} unit="°C" palette={PALETTE.indigo} />
          </Section>
        </div>
      )}

      {data.length === 0 && !selectedDate && (
        <div className="text-center py-12 text-orange-300/70">
          No battery analytics data available for the selected period.
        </div>
      )}

      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title={`Data on ${selectedDate}`}>
            <Stat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" palette={PALETTE.amber} />
            <Stat label="Max DC Current" value={latestTrip.max_op_dc_current_a} unit="A" palette={PALETTE.sky} />
            <Stat label="Max SOC" value={latestTrip.max_soc_percent} unit="%" palette={PALETTE.emerald} />
            <Stat label="Min SOC" value={latestTrip.min_soc_percent} unit="%" palette={PALETTE.emerald} />
            <Stat label="Max Cell Temperature" value={latestTrip.max_cell_temp_c} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Cell Temperature" value={latestTrip.min_cell_temp_c} unit="°C" palette={PALETTE.indigo} />
            <Stat label="Max Pack Temperature" value={latestTrip.max_pack_temp_c} unit="°C" palette={PALETTE.rose} warn={45} danger={55} />
            <Stat label="Min Pack Temperature" value={latestTrip.min_pack_temp_c} unit="°C" palette={PALETTE.indigo} />
          </Section>

          {!latestTrip.day && (
            <div className="border border-white/10 rounded-2xl p-6 flex items-center justify-center text-gray-500 text-sm">
              No battery data recorded on this date.
            </div>
          )}
        </div>
      )}

      {!selectedDate && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Energy Consumption" subtitle="Daily total over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.total_kwh_consumed ?? 0) }))}
              xKey="day"
              palette={PALETTE.amber}
              unit="kWh"
            />
          </ChartCard>

          <ChartCard title="Max DC Current" subtitle="Daily peak over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_op_dc_current_a ?? 0) }))}
              xKey="day"
              palette={PALETTE.sky}
              unit="A"
            />
          </ChartCard>

          <ChartCard title="Maximum SOC" subtitle="Daily max over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_soc_percent ?? 0) }))}
              xKey="day"
              palette={PALETTE.emerald}
              unit="%"
            />
          </ChartCard>

          <ChartCard title="Minimum SOC" subtitle="Daily minimum over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.min_soc_percent ?? 0) }))}
              xKey="day"
              palette={PALETTE.emerald}
              unit="%"
            />
          </ChartCard>

          <ChartCard title="Min Cell Temperature" subtitle="Daily minimum over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.min_cell_temp_c ?? 0) }))}
              xKey="day"
              palette={PALETTE.indigo}
              unit="°C"
            />
          </ChartCard>

          <ChartCard title="Pack Temperature" subtitle="Daily max over the last 30 days">
            <TrendChart
              data={chartData.map(d => ({ day: d.day, y: Number(d.max_pack_temp_c ?? 0) }))}
              xKey="day"
              palette={PALETTE.rose}
              unit="°C"
              warnLine={45}
              dangerLine={55}
            />
          </ChartCard>
        </div>
      )}

      {selectedDate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="DC Current" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="current" palette={PALETTE.sky} unit="A" />
            )}
          </ChartCard>

          <ChartCard title="Maximum SOC" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="soc" palette={PALETTE.emerald} unit="%" />
            )}
          </ChartCard>

          <ChartCard title="Minimum SOC" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="minSoc" palette={PALETTE.emerald} unit="%" />
            )}
          </ChartCard>

          <ChartCard title="Min Cell Temperature" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="minCellTemp" palette={PALETTE.indigo} unit="°C" />
            )}
          </ChartCard>

          <ChartCard title="Pack Temperature (Max)" subtitle={`Hour by hour on ${selectedDate}`}>
            {hourlyLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
            ) : (
              <TrendChart data={hourlyChartData} xKey="hour" yKey="maxPackTemp" palette={PALETTE.rose} unit="°C" warnLine={45} dangerLine={55} />
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

/* ========================= LEGACY BATTERY ANALYTICS (VEHICLE #1 ONLY) =========================
   Untouched original implementation — kept exactly as it was so vehicle #1
   (EE-R-DC-CETL90-L1) keeps its existing format while every other vehicle
   gets ModernBatteryAnalytics above. */
function LegacyBatteryAnalytics() {
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
          ? `/api/battery/analytics/${id}?date=${selectedDate}`
          : `/api/battery/analytics/${id}?days=30`;

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

  const latestTrip = useMemo(() => {
    if (!data.length) return {};
    return data[0];
  }, [data]);

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
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Battery Analytics
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
            <LegacyStat label="Energy Used" value={odo.energyUsed} unit="kWh" />
            <LegacyStat label="Max DC Current" value={odo.maxCurrent} unit="A" />
            <LegacyStat label="Max Cell Temperature" value={odo.maxTemp} unit="°C" warn={45} danger={55} />
            <LegacyStat label="Avg Cell Temperature" value={odo.avgTemp} unit="°C" warn={42} danger={52} />
          </LegacySection>

          <LegacySection title="Latest Day">
            <LegacyStat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" />
            <LegacyStat
              label="Max DC Current"
              value={latestTrip.max_op_dc_current_a}
              unit="A"
            />
            <LegacyStat
              label="Max Cell Temperature"
              value={latestTrip.max_cell_temp_c}
              unit="°C"
              warn={45}
              danger={55}
            />
            <LegacyStat
              label="Avg Cell Temperature"
              value={latestTrip.avg_cell_temp_c}
              unit="°C"
              warn={42}
              danger={52}
            />
          </LegacySection>
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-12 text-orange-300/70">
          No battery analytics data available for the selected period.
        </div>
      )}

      {data.length > 0 && (
        <>
          {!selectedDate ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LegacyChartCard title="Energy Consumption Trend (kWh)">
                <LegacyLineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.total_kwh_consumed ?? 0),
                  }))}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Max Cell Temperature Trend (°C)">
                <LegacyLineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.max_cell_temp_c ?? 0),
                  }))}
                  band={{ warn: 45, danger: 55 }}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Avg Cell Temperature Trend (°C)">
                <LegacyLineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.avg_cell_temp_c ?? 0),
                  }))}
                  band={{ warn: 42, danger: 52 }}
                />
              </LegacyChartCard>

              <LegacyChartCard title="Max DC Current Trend (A)">
                <LegacyLineChart
                  data={chartData.map(d => ({
                    x: d.day,
                    y: Number(d.max_op_dc_current_a ?? 0),
                  }))}
                />
              </LegacyChartCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LegacySection title={`Data on ${selectedDate}`}>
                <LegacyStat label="Energy Used" value={latestTrip.total_kwh_consumed} unit="kWh" />
                <LegacyStat
                  label="Max DC Current"
                  value={latestTrip.max_op_dc_current_a}
                  unit="A"
                />
                <LegacyStat
                  label="Max Cell Temperature"
                  value={latestTrip.max_cell_temp_c}
                  unit="°C"
                  warn={45}
                  danger={55}
                />
                <LegacyStat
                  label="Avg Cell Temperature"
                  value={latestTrip.avg_cell_temp_c}
                  unit="°C"
                  warn={42}
                  danger={52}
                />
              </LegacySection>

              <LegacyChartCard title={`Battery Metrics on ${selectedDate}`}>
                <LegacyBarChart
                  data={[
                    { x: "Energy", y: Number(latestTrip.total_kwh_consumed ?? 0) },
                    { x: "DC Current", y: Number(latestTrip.max_op_dc_current_a ?? 0) },
                    { x: "Max Temp", y: Number(latestTrip.max_cell_temp_c ?? 0) },
                    { x: "Avg Temp", y: Number(latestTrip.avg_cell_temp_c ?? 0) },
                  ]}
                  band={{ warn: 45, danger: 55 }}
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

      <polygon fill="url(#lineGradient)" points={areaPoints} />

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
