import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function DatabaseLogs() {
  const { id } = useParams();
  const vehicleId = id;

  if (!vehicleId) {
    return (
      <div className="flex items-center justify-center h-96 text-orange-400 text-xl font-medium">
        No vehicle selected
      </div>
    );
  }

  const today = new Date();
  const todayStr = fmtDate(today);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [exportMode, setExportMode] = useState("selected");
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportCurrent, setExportCurrent] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const loadMoreRef = useRef(null);

  /* ========================= ALL COLUMNS ========================= */
  const COLUMNS = [
    { key: "recorded_at", label: "Timestamp", alwaysVisible: true },

    // Battery Basics
    { key: "soc_percent", label: "SOC (%)" },
    { key: "battery_status", label: "Battery Status" },
    { key: "stack_voltage_v", label: "Stack Voltage (V)" },
    { key: "battery_current_a", label: "Battery Current (A)" },
    { key: "charger_current_demand_a", label: "Charger Current Demand (A)" },
    { key: "charger_voltage_demand_v", label: "Charger Voltage Demand (V)" },

    // Cell & Temperature Stats
    { key: "max_voltage_v", label: "Max Cell Voltage (V)" },
    { key: "min_voltage_v", label: "Min Cell Voltage (V)" },
    { key: "avg_voltage_v", label: "Avg Cell Voltage (V)" },
    { key: "max_temp_c", label: "Max Battery Temp (°C)" },
    { key: "min_temp_c", label: "Min Battery Temp (°C)" },
    { key: "avg_temp_c", label: "Avg Battery Temp (°C)" },

    // Motor & Inverter
    { key: "motor_torque_limit", label: "Motor Torque Limit (Nm)" },
    { key: "motor_torque_value", label: "Motor Torque Value (Nm)" },
    { key: "motor_speed_rpm", label: "Motor Speed (RPM)" },
    { key: "motor_rotation_dir", label: "Motor Rotation Direction" },
    { key: "motor_operation_mode", label: "Motor Operation Mode" },
    { key: "mcu_enable_state", label: "MCU Enable State" },
    { key: "motor_ac_current_a", label: "Motor AC Current (A)" },
    { key: "motor_ac_voltage_v", label: "Motor AC Voltage (V)" },
    { key: "dc_side_voltage_v", label: "DC Side Voltage (V)" },
    { key: "motor_temp_c", label: "Motor Temperature (°C)" },
    { key: "mcu_temp_c", label: "MCU Temperature (°C)" },
    { key: "radiator_temp_c", label: "Radiator Temperature (°C)" },

    // New: Motor Raw Data
    { key: "motor_status_word", label: "Motor Status Word" },
    { key: "motor_freq_raw", label: "Motor Frequency Raw" },
    { key: "motor_total_wattage_w", label: "Motor Total Wattage (W)" },
    { key: "motor_dc_input_voltage_raw", label: "Motor DC Input Voltage Raw" },
    { key: "motor_ac_output_voltage_raw", label: "Motor AC Output Voltage Raw" },

    // BTMS (Thermal Management)
    { key: "btms_command_mode", label: "BTMS Command Mode" },
    { key: "btms_status_mode", label: "BTMS Status Mode" },
    { key: "btms_hv_request", label: "BTMS HV Request" },
    { key: "btms_charge_status", label: "BTMS Charge Status" },
    { key: "bms_hv_relay_state", label: "BMS HV Relay State" },
    { key: "btms_hv_relay_state", label: "BTMS HV Relay State" },
    { key: "btms_target_temp_c", label: "BTMS Target Temp (°C)" },
    { key: "btms_inlet_temp_c", label: "BTMS Inlet Temp (°C)" },
    { key: "btms_outlet_temp_c", label: "BTMS Outlet Temp (°C)" },
    { key: "btms_demand_power_kw", label: "BTMS Demand Power (kW)" },
    { key: "bms_pack_voltage_v", label: "BMS Pack Voltage (V)" },
    { key: "bms_life_counter", label: "BMS Life Counter" },
    { key: "btms_command_crc", label: "BTMS Command CRC" },

    // DC-DC Converter
    { key: "dcdc_pri_a_mosfet_temp_c", label: "DCDC Pri A MOSFET Temp (°C)" },
    { key: "dcdc_sec_ls_mosfet_temp_c", label: "DCDC Sec LS MOSFET Temp (°C)" },
    { key: "dcdc_sec_hs_mosfet_temp_c", label: "DCDC Sec HS MOSFET Temp (°C)" },
    { key: "dcdc_pri_c_mosfet_temp_c", label: "DCDC Pri C MOSFET Temp (°C)" },
    { key: "dcdc_input_voltage_v", label: "DCDC Input Voltage (V)" },
    { key: "dcdc_input_current_a", label: "DCDC Input Current (A)" },
    { key: "dcdc_output_voltage_v", label: "DCDC Output Voltage (V)" },
    { key: "dcdc_output_current_a", label: "DCDC Output Current (A)" },
    { key: "dcdc_occurence_count", label: "DCDC Overcurrent Count" },

    // Odometer & Energy
    { key: "total_running_hrs", label: "Total Running Hours" },
    { key: "last_trip_hrs", label: "Last Trip Hours" },
    { key: "total_kwh_consumed", label: "Total kWh Consumed" },
    { key: "last_trip_kwh", label: "Last Trip kWh" },
  ];

  const [selectedCols, setSelectedCols] = useState(
    new Set(COLUMNS.filter(c => !c.alwaysVisible).map(c => c.key))
  );

  const toggleCol = (key) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllCols = () => {
    setSelectedCols(new Set(COLUMNS.filter(c => !c.alwaysVisible).map(c => c.key)));
  };

  const deselectAllCols = () => setSelectedCols(new Set());

  /* ========================= FETCH LOGS ========================= */
  const fetchLogs = async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const fetchUrl = `/api/database-logs/${vehicleId}?date=${selectedDate}${
        !reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
      }`;

      const res = await fetch(fetchUrl, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const newRows = await res.json();

      if (!Array.isArray(newRows) || newRows.length === 0) {
        setHasMore(false);
        if (reset) setRows([]);
        return;
      }

      const updatedRows = reset ? newRows : [...rows, ...newRows];
      setRows(updatedRows);

      setCursor(newRows[newRows.length - 1].recorded_at_raw);

      const hasMoreHeader = res.headers.get("X-Has-More");
      setHasMore(hasMoreHeader === "true" || (!hasMoreHeader && newRows.length === 200));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load data");
      if (reset) setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ========================= OPTIMIZED EXPORT WITH STREAMING & PROGRESS ========================= */
  const exportData = async () => {
    setExporting(true);
    setExportProgress(0);
    setExportTotal(0);
    setExportCurrent(0);
    setError(null);

    let abortController = new AbortController();

    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      // Build export parameters
      let exportParams = new URLSearchParams();

      switch (exportMode) {
        case "selected":
          exportParams.append('date', selectedDate);
          break;
        case "today":
          exportParams.append('period', 'today');
          break;
        case "week":
          exportParams.append('period', 'week');
          break;
        case "month":
          exportParams.append('period', 'month');
          break;
        case "all":
          exportParams.append('period', 'all');
          break;
        case "custom":
          if (!customStart || !customEnd) {
            alert("Please select both start and end dates");
            setExporting(false);
            return;
          }
          exportParams.append('start', customStart);
          exportParams.append('end', customEnd);
          break;
        default:
          exportParams.append('date', selectedDate);
      }

      // Add selected columns
      const visibleCols = COLUMNS.filter(c => c.alwaysVisible || selectedCols.has(c.key));
      const columnKeys = visibleCols.map(c => c.key);
      exportParams.append('columns', JSON.stringify(columnKeys));

      // Step 1: Get total count for progress tracking
      const countUrl = `/api/database-logs/${vehicleId}/count?${exportParams.toString()}`;
      const countRes = await fetch(countUrl, { 
        headers: authHeaders,
        signal: abortController.signal 
      });

      if (!countRes.ok) {
        throw new Error('Failed to get row count');
      }

      const { total } = await countRes.json();
      setExportTotal(total);

      if (total === 0) {
        alert("No data available for the selected range");
        setExporting(false);
        return;
      }

      // Step 2: Start the export with streaming
      const exportUrl = `/api/database-logs/${vehicleId}/export?${exportParams.toString()}`;
      
      const exportRes = await fetch(exportUrl, { 
        headers: authHeaders,
        signal: abortController.signal 
      });

      if (!exportRes.ok) {
        const text = await exportRes.text().catch(() => "");
        throw new Error(`Export failed: ${exportRes.status} ${text || exportRes.statusText}`);
      }

      // Get total from headers if available
      const totalFromHeader = exportRes.headers.get('X-Total-Rows');
      if (totalFromHeader) {
        setExportTotal(parseInt(totalFromHeader, 10));
      }

      // Read the stream and track progress
      const reader = exportRes.body.getReader();
      const chunks = [];
      let receivedLength = 0;
      let estimatedRows = 0;
      const avgBytesPerRow = 150; // Rough estimate

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        
        // Estimate rows processed (rough calculation)
        estimatedRows = Math.floor(receivedLength / avgBytesPerRow);
        setExportCurrent(Math.min(estimatedRows, total));
        
        // Calculate progress percentage
        const progress = total > 0 ? Math.min((estimatedRows / total) * 100, 99) : 0;
        setExportProgress(progress);
      }

      // Combine all chunks into a blob
      const blob = new Blob(chunks, { type: 'text/csv' });

      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;

      // Generate filename
      let filename = `raw_telemetry_${vehicleId}`;
      switch (exportMode) {
        case "selected": filename += `_${selectedDate}`; break;
        case "today": filename += `_today_${todayStr}`; break;
        case "week": filename += `_last7days`; break;
        case "month": filename += `_last30days`; break;
        case "all": filename += `_all_time`; break;
        case "custom": filename += `_from_${customStart}_to_${customEnd}`; break;
      }
      filename += `.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Mark as complete
      setExportProgress(100);
      setExportCurrent(total);
      
      // Reset progress after 3 seconds
      setTimeout(() => {
        setExportProgress(0);
        setExportTotal(0);
        setExportCurrent(0);
      }, 3000);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Export cancelled by user');
      } else {
        console.error("Export error:", err);
        setError("Failed to export data: " + err.message);
      }
    } finally {
      setExporting(false);
    }
  };

  /* ========================= EFFECTS ========================= */
  useEffect(() => {
    setRows([]);
    setCursor(null);
    setHasMore(true);
    fetchLogs(true);
  }, [vehicleId, selectedDate]);

  useEffect(() => {
    if (!hasMore || rows.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          fetchLogs(false);
        }
      },
      { rootMargin: "600px" }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [rows.length, hasMore, loading]);

  /* ========================= RENDER ========================= */
  const visibleColumns = COLUMNS.filter(c => c.alwaysVisible || selectedCols.has(c.key));

  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
        Raw Telemetry Logs
      </h2>

      {/* Controls */}
      <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-orange-300 font-medium min-w-32">Display Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={todayStr}
              className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-orange-300 font-medium min-w-32">Export Range:</label>
            <select
              value={exportMode}
              onChange={e => setExportMode(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
            >
              <option value="selected">Selected Day</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Historical Data</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {exportMode === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-gray-800/30 rounded-lg border border-orange-500/20">
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">Start Date:</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                max={customEnd}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">End Date:</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                min={customStart}
                max={todayStr}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={exportData}
            disabled={exporting || loading}
            className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-4"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting... {exportProgress > 0 ? `${exportProgress.toFixed(0)}%` : 'Please wait'}
              </>
            ) : exportProgress === 100 ? (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Export Complete!
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Data
              </>
            )}
          </button>

          {/* Progress Bar */}
          {exporting && exportTotal > 0 && (
            <div className="w-full max-w-2xl">
              <div className="flex justify-between text-sm text-orange-300 mb-2">
                <span>
                  {exportCurrent.toLocaleString()} / {exportTotal.toLocaleString()} rows
                </span>
                <span>{exportProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${exportProgress}%` }}
                >
                  {exportProgress > 10 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {exportProgress.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center text-xs text-orange-400/70 mt-2">
                ⏳ Large exports may take a few minutes. Your download will start automatically.
              </div>
            </div>
          )}
        </div>

        {/* Export Info Banner - only show if not already showing progress */}
        {exporting && exportTotal === 0 && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
            <p className="text-blue-300 text-sm">
              ⏳ Calculating total rows... Please wait.
            </p>
          </div>
        )}

        <div className="pt-8 mt-8 border-t border-orange-500/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange-400 font-semibold">
              Visible Columns ({visibleColumns.length}/{COLUMNS.length})
            </h3>
            <div className="flex gap-2">
              <button onClick={selectAllCols} className="text-xs px-4 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded hover:bg-orange-500/30 transition">
                Select All
              </button>
              <button onClick={deselectAllCols} className="text-xs px-4 py-1.5 bg-gray-800/50 border border-orange-500/30 rounded hover:bg-gray-700/50 transition">
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-80 overflow-y-auto bg-black/30 rounded-lg p-4">
            {COLUMNS.filter(c => !c.alwaysVisible).map(col => (
              <label
                key={col.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all border ${
                  selectedCols.has(col.key)
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-100"
                    : "bg-gray-800/40 border-gray-700 text-orange-200"
                } hover:bg-orange-500/10`}
              >
                <input
                  type="checkbox"
                  checked={selectedCols.has(col.key)}
                  onChange={() => toggleCol(col.key)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span className="truncate">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 bg-gray-950/80 border-b border-orange-500/20 text-orange-300 font-medium">
          Showing {rows.length.toLocaleString()} record{rows.length !== 1 ? "s" : ""} for {selectedDate}
        </div>

        <div className="overflow-auto max-h-[700px]">
          {error && (
            <div className="p-12 text-center text-red-400">
              {error}
            </div>
          )}

          {!error && rows.length === 0 && !loading && (
            <div className="p-16 text-center text-orange-400/70">
              No telemetry data available for {selectedDate}
            </div>
          )}

          {rows.length > 0 && (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-950/95 z-10 border-b-2 border-orange-500/30">
                <tr>
                  {visibleColumns.map(col => (
                    <th key={col.key} className="px-5 py-3.5 text-left text-orange-400 font-semibold uppercase tracking-wider min-w-[140px]">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-500/10">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-orange-500/5 transition">
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-5 py-3.5 text-orange-100">
                        {row[col.key] ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="p-8 text-center text-orange-300">
              {loading ? "Loading more records..." : "Scroll down to load more"}
            </div>
          )}

          {!hasMore && rows.length > 0 && (
            <div className="p-8 text-center text-orange-400/70 border-t border-orange-500/20">
              End of data • Total loaded: {rows.length.toLocaleString()} rows
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================= HELPERS ========================= */
const fmtDate = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};