import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

/* ============================================================
   COLUMN DEFINITIONS  (single source of truth — mirrors backend)
   ============================================================ */
const COLUMNS = [
  { key: "recorded_at",                    label: "Timestamp",                        alwaysVisible: true },
  // Battery / BMS / Charger
  { key: "soc_percent",                    label: "SOC (%)" },
  { key: "battery_status",                 label: "Battery Status" },
  { key: "stack_voltage_v",                label: "Stack Voltage (V)" },
  { key: "battery_current_a",              label: "Battery Current (A)" },
  { key: "output_power_kw",                label: "Battery Power (kW)" },
  { key: "charger_current_demand_a",       label: "Charger Current Demand (A)" },
  { key: "charger_voltage_demand_v",       label: "Charger Voltage Demand (V)" },
  { key: "max_voltage_v",                  label: "Max Cell Voltage (V)" },
  { key: "min_voltage_v",                  label: "Min Cell Voltage (V)" },
  { key: "avg_voltage_v",                  label: "Avg Cell Voltage (V)" },
  { key: "max_temp_c",                     label: "Max Battery Temp (°C)" },
  { key: "min_temp_c",                     label: "Min Battery Temp (°C)" },
  { key: "avg_temp_c",                     label: "Avg Battery Temp (°C)" },
  // NEW — Battery Health & Capacity
  { key: "soh_percent",                    label: "SOH (%)" },
  { key: "cycle_count",                    label: "Cycle Count" },
  { key: "remaining_ah",                   label: "Remaining AH (Ah)" },
  { key: "charging_ah",                    label: "Charging AH (Ah)" },
  // NEW — String Voltages
  { key: "string_voltage_1_v",             label: "String Voltage 1 (V)" },
  { key: "string_voltage_2_v",             label: "String Voltage 2 (V)" },
  { key: "string_voltage_3_v",             label: "String Voltage 3 (V)" },
  { key: "string_voltage_4_v",             label: "String Voltage 4 (V)" },
  { key: "string_voltage_5_v",             label: "String Voltage 5 (V)" },
  { key: "string_voltage_6_v",             label: "String Voltage 6 (V)" },
  { key: "string_voltage_7_v",             label: "String Voltage 7 (V)" },
  // NEW — String Temperatures
  { key: "string_temp_1_c",               label: "String Temp 1 (°C)" },
  { key: "string_temp_2_c",               label: "String Temp 2 (°C)" },
  { key: "string_temp_3_c",               label: "String Temp 3 (°C)" },
  { key: "string_temp_4_c",               label: "String Temp 4 (°C)" },
  { key: "string_temp_5_c",               label: "String Temp 5 (°C)" },
  { key: "string_temp_6_c",               label: "String Temp 6 (°C)" },
  { key: "string_temp_7_c",               label: "String Temp 7 (°C)" },
  { key: "string_temp_8_c",               label: "String Temp 8 (°C)" },
  // Motor / MCU
  { key: "motor_torque_limit",             label: "Motor Torque Limit (Nm)" },
  { key: "motor_torque_value",             label: "Motor Torque Value (Nm)" },
  { key: "motor_speed_rpm",                label: "Motor Speed (RPM)" },
  { key: "motor_rotation_dir",             label: "Motor Rotation Direction" },
  { key: "motor_operation_mode",           label: "Motor Operation Mode" },
  { key: "mcu_enable_state",               label: "MCU Enable State" },
  { key: "motor_ac_current_a",             label: "Motor AC Current (A)" },
  { key: "motor_ac_voltage_v",             label: "Motor AC Voltage (V)" },
  { key: "dc_side_voltage_v",              label: "DC Side Voltage (V)" },
  { key: "motor_temp_c",                   label: "Motor Temperature (°C)" },
  { key: "mcu_temp_c",                     label: "MCU Temperature (°C)" },
  { key: "radiator_temp_c",                label: "Radiator Temperature (°C)" },
  { key: "motor_status_word",              label: "Motor Status Word" },
  { key: "motor_freq_raw",                 label: "Motor Frequency Raw" },
  { key: "motor_total_wattage_w",          label: "Motor Total Wattage (W)" },
  // BTMS
  { key: "btms_command_mode",              label: "BTMS Command Mode" },
  { key: "btms_status_mode",               label: "BTMS Status Mode" },
  { key: "btms_hv_request",               label: "BTMS HV Request" },
  { key: "btms_charge_status",             label: "BTMS Charge Status" },
  { key: "bms_hv_relay_state",             label: "BMS HV Relay State" },
  { key: "btms_hv_relay_state",            label: "BTMS HV Relay State" },
  { key: "btms_target_temp_c",             label: "BTMS Target Temp (°C)" },
  { key: "btms_inlet_temp_c",              label: "BTMS Inlet Temp (°C)" },
  { key: "btms_outlet_temp_c",             label: "BTMS Outlet Temp (°C)" },
  { key: "btms_demand_power_kw",           label: "BTMS Demand Power (kW)" },
  { key: "bms_pack_voltage_v",             label: "BMS Pack Voltage (V)" },
  { key: "bms_life_counter",               label: "BMS Life Counter" },
  { key: "btms_command_crc",               label: "BTMS Command CRC" },
  // DC-DC Converter
  { key: "dcdc_pri_a_mosfet_temp_c",      label: "DCDC Pri A MOSFET Temp (°C)" },
  { key: "dcdc_sec_ls_mosfet_temp_c",     label: "DCDC Sec LS MOSFET Temp (°C)" },
  { key: "dcdc_sec_hs_mosfet_temp_c",     label: "DCDC Sec HS MOSFET Temp (°C)" },
  { key: "dcdc_pri_c_mosfet_temp_c",      label: "DCDC Pri C MOSFET Temp (°C)" },
  { key: "dcdc_max_temp_c",               label: "DCDC Max Temp (°C)" },
  { key: "dcdc_input_voltage_v",          label: "DCDC Input Voltage (V)" },
  { key: "dcdc_input_current_a",          label: "DCDC Input Current (A)" },
  { key: "dcdc_output_voltage_v",         label: "DCDC Output Voltage (V)" },
  { key: "dcdc_output_current_a",         label: "DCDC Output Current (A)" },
  { key: "dcdc_occurence_count",          label: "DCDC Overcurrent Count" },
  // Air Compressor
  { key: "compressor_input_voltage_v",    label: "Compressor Input Voltage (V)" },
  { key: "compressor_input_current_a",    label: "Compressor Input Current (A)" },
  { key: "compressor_output_voltage_v",   label: "Compressor Output Voltage (V)" },
  { key: "compressor_output_current_a",   label: "Compressor Output Current (A)" },
  // ODO / Trip
  { key: "total_running_hrs",             label: "Total Running Hours" },
  { key: "last_trip_hrs",                 label: "Last Trip Hours" },
  { key: "total_kwh_consumed",            label: "Total kWh Consumed" },
  { key: "last_trip_kwh",                 label: "Last Trip kWh" },
  // EVCC1 — EV Charging Controller
  { key: "evcc1_pwr_stat",               label: "EVCC1 Power Status" },
  { key: "evcc1_socket_stat",            label: "EVCC1 Socket Status" },
  { key: "evcc1_evse_stat",              label: "EVCC1 EVSE Status" },
  { key: "evcc1_cp_stat",                label: "EVCC1 CP State" },
  { key: "evcc1_s2_on_stat",             label: "EVCC1 S2 Switch" },
  { key: "evcc1_pd_stat",                label: "EVCC1 PD Status" },
  { key: "evcc1_step_num",               label: "EVCC1 Step Number" },
  { key: "evcc1_dcac_chg_mode",          label: "EVCC1 DC/AC Charge Mode" },
  { key: "evcc1_chg_finished",           label: "EVCC1 Charge Finished (EVCC)" },
  { key: "evcc1_evse_chg_finished",      label: "EVCC1 Charge Finished (EVSE)" },
  { key: "evcc1_evse_evcc_chg_finished", label: "EVCC1 Charge Finished (Joint)" },
  { key: "evcc1_evse_processing",        label: "EVCC1 EVSE Processing" },
  { key: "evcc1_evse_pwr_delivery",      label: "EVCC1 Power Delivery" },
  { key: "evcc1_evse_isol_stat",         label: "EVCC1 Isolation Status" },
  { key: "evcc1_evse_transfer_type",     label: "EVCC1 Transfer Type" },
  { key: "evcc1_evse_notification",      label: "EVCC1 EVSE Notification" },
  { key: "evcc1_evse_max_volt_v",        label: "EVCC1 EVSE Max Voltage (V)" },
  { key: "evcc1_evse_min_volt_v",        label: "EVCC1 EVSE Min Voltage (V)" },
  { key: "evcc1_evse_max_curr_a",        label: "EVCC1 EVSE Max Current (A)" },
  { key: "evcc1_evse_min_curr_a",        label: "EVCC1 EVSE Min Current (A)" },
  { key: "evcc1_evse_max_pwr_w",         label: "EVCC1 EVSE Max Power (W)" },
  { key: "evcc1_evse_max_delay_s",       label: "EVCC1 EVSE Max Delay (s)" },
  { key: "evcc1_evse_out_volt_v",        label: "EVCC1 EVSE Output Voltage (V)" },
  { key: "evcc1_evse_out_curr_a",        label: "EVCC1 EVSE Output Current (A)" },
  { key: "evcc1_ac_max_current_value_a", label: "EVCC1 AC Max Current (A)" },
  { key: "evcc1_duty_value",             label: "EVCC1 Duty Value (%)" },
  { key: "evcc1_aag_value",              label: "EVCC1 AAG Value" },
  { key: "evcc1_lock_stat",              label: "EVCC1 Lock Command" },
  { key: "evcc1_lock_status",            label: "EVCC1 Lock Status" },
  { key: "evcc1_lock_alarm",             label: "EVCC1 Lock Alarm" },
  { key: "evcc1_error_code",             label: "EVCC1 Error Code" },
];

/* ============================================================
   COLUMN GROUPS  (drives the grouped column-selector UI)
   ============================================================ */
const COLUMN_GROUPS = [
  {
    label: "Battery / BMS / Charger",
    keys: [
      "soc_percent","battery_status","stack_voltage_v","battery_current_a",
      "output_power_kw","charger_current_demand_a","charger_voltage_demand_v",
      "max_voltage_v","min_voltage_v","avg_voltage_v",
      "max_temp_c","min_temp_c","avg_temp_c",
    ],
  },
  {
    label: "Battery Health & Capacity",
    keys: [
      "soh_percent","cycle_count","remaining_ah","charging_ah",
    ],
  },
  {
    label: "String Voltages",
    keys: [
      "string_voltage_1_v","string_voltage_2_v","string_voltage_3_v",
      "string_voltage_4_v","string_voltage_5_v","string_voltage_6_v",
      "string_voltage_7_v",
    ],
  },
  {
    label: "String Temperatures",
    keys: [
      "string_temp_1_c","string_temp_2_c","string_temp_3_c",
      "string_temp_4_c","string_temp_5_c","string_temp_6_c",
      "string_temp_7_c","string_temp_8_c",
    ],
  },
  {
    label: "Motor / MCU",
    keys: [
      "motor_torque_limit","motor_torque_value","motor_speed_rpm",
      "motor_rotation_dir","motor_operation_mode","mcu_enable_state",
      "motor_ac_current_a","motor_ac_voltage_v","dc_side_voltage_v",
      "motor_temp_c","mcu_temp_c","radiator_temp_c",
      "motor_status_word","motor_freq_raw","motor_total_wattage_w",
    ],
  },
  {
    label: "BTMS",
    keys: [
      "btms_command_mode","btms_status_mode","btms_hv_request","btms_charge_status",
      "bms_hv_relay_state","btms_hv_relay_state","btms_target_temp_c",
      "btms_inlet_temp_c","btms_outlet_temp_c","btms_demand_power_kw",
      "bms_pack_voltage_v","bms_life_counter","btms_command_crc",
    ],
  },
  {
    label: "DC-DC Converter",
    keys: [
      "dcdc_pri_a_mosfet_temp_c","dcdc_sec_ls_mosfet_temp_c",
      "dcdc_sec_hs_mosfet_temp_c","dcdc_pri_c_mosfet_temp_c","dcdc_max_temp_c",
      "dcdc_input_voltage_v","dcdc_input_current_a",
      "dcdc_output_voltage_v","dcdc_output_current_a","dcdc_occurence_count",
    ],
  },
  {
    label: "Air Compressor",
    keys: [
      "compressor_input_voltage_v","compressor_input_current_a",
      "compressor_output_voltage_v","compressor_output_current_a",
    ],
  },
  {
    label: "ODO / Trip",
    keys: ["total_running_hrs","last_trip_hrs","total_kwh_consumed","last_trip_kwh"],
  },
  {
    label: "EVCC1 — EV Charging Controller",
    keys: [
      "evcc1_pwr_stat","evcc1_socket_stat","evcc1_evse_stat",
      "evcc1_cp_stat","evcc1_s2_on_stat","evcc1_pd_stat",
      "evcc1_step_num","evcc1_dcac_chg_mode",
      "evcc1_chg_finished","evcc1_evse_chg_finished","evcc1_evse_evcc_chg_finished",
      "evcc1_evse_processing","evcc1_evse_pwr_delivery",
      "evcc1_evse_isol_stat","evcc1_evse_transfer_type","evcc1_evse_notification",
      "evcc1_evse_max_volt_v","evcc1_evse_min_volt_v",
      "evcc1_evse_max_curr_a","evcc1_evse_min_curr_a",
      "evcc1_evse_max_pwr_w","evcc1_evse_max_delay_s",
      "evcc1_evse_out_volt_v","evcc1_evse_out_curr_a",
      "evcc1_ac_max_current_value_a","evcc1_duty_value","evcc1_aag_value",
      "evcc1_lock_stat","evcc1_lock_status","evcc1_lock_alarm","evcc1_error_code",
    ],
  },
];

const COLUMN_MAP = Object.fromEntries(COLUMNS.map(c => [c.key, c]));

/* ============================================================
   HELPERS
   ============================================================ */
const fmtDate = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const fmtEta = (seconds) => {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `~${s}s remaining`;
  if (s === 0) return `~${m}m remaining`;
  return `~${m}m ${s}s remaining`;
};


/* ============================================================
   COMPONENT
   ============================================================ */
export default function DatabaseLogs() {
  const { id: vehicleId } = useParams();

  if (!vehicleId) {
    return (
      <div className="flex items-center justify-center h-96 text-orange-400 text-xl font-medium">
        No vehicle selected
      </div>
    );
  }

  const todayStr = fmtDate(new Date());

  // ---- display state ----
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [rows, setRows]                 = useState([]);
  const [cursor, setCursor]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [error, setError]               = useState(null);
  const loadMoreRef                     = useRef(null);

  // ---- column visibility ----
  const [selectedCols, setSelectedCols] = useState(
    () => new Set(COLUMNS.filter(c => !c.alwaysVisible).map(c => c.key))
  );

  // ---- export state ----
  const [exportMode, setExportMode]         = useState("today");
  const [customStart, setCustomStart]       = useState(todayStr);
  const [customEnd, setCustomEnd]           = useState(todayStr);
  const [exporting, setExporting]           = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal]       = useState(0);
  const [exportCurrent, setExportCurrent]   = useState(0);
  const [exportEta, setExportEta]           = useState(null);
  const [exportDone, setExportDone]         = useState(false);
  const exportAbort                         = useRef(null);

  /* ========================= COLUMN HELPERS ========================= */
  const toggleCol = useCallback(key => setSelectedCols(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  }), []);

  const toggleGroup = useCallback((keys, forceOn) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      const allOn = keys.every(k => next.has(k));
      keys.forEach(k => (forceOn ?? !allOn) ? next.add(k) : next.delete(k));
      return next;
    });
  }, []);

  const selectAllCols   = () => setSelectedCols(new Set(COLUMNS.filter(c => !c.alwaysVisible).map(c => c.key)));
  const deselectAllCols = () => setSelectedCols(new Set());

  const visibleColumns = COLUMNS.filter(c => c.alwaysVisible || selectedCols.has(c.key));

  /* ========================= FETCH LOGS ========================= */
  const fetchLogs = useCallback(async (reset = false) => {
    if (loading || (!hasMore && !reset)) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (!reset && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/database-logs/${vehicleId}?${params}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const newRows = await res.json();
      if (!Array.isArray(newRows) || newRows.length === 0) {
        setHasMore(false);
        if (reset) setRows([]);
        return;
      }

      setRows(prev => reset ? newRows : [...prev, ...newRows]);
      setCursor(newRows[newRows.length - 1].recorded_at_raw);

      const more = res.headers.get("X-Has-More");
      setHasMore(more === "true" || (!more && newRows.length === 200));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load data");
      if (reset) setRows([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, selectedDate, cursor, loading, hasMore]);

  /* ========================= EXPORT ========================= */
  const exportData = async () => {
    if (exporting) return;

    setExporting(true);
    setExportProgress(0);
    setExportTotal(0);
    setExportCurrent(0);
    setExportEta(null);
    setExportDone(false);
    setError(null);

    const abort = new AbortController();
    exportAbort.current = abort;
    let fileWritable = null;

    try {
      const exportParams = new URLSearchParams();

      if (exportMode === "custom") {
        if (!customStart || !customEnd) {
          setError("Please select both start and end dates");
          setExporting(false);
          return;
        }
        exportParams.set("start", customStart);
        exportParams.set("end", customEnd);
      } else {
        exportParams.set("period", "today");
      }

      const colsToExport = COLUMNS
        .filter(c => c.alwaysVisible || selectedCols.has(c.key))
        .map(c => c.key);
      exportParams.set("columns", JSON.stringify(colsToExport));

      // Start export directly — eliminates the count pre-fetch round-trip.
      // X-Total-Rows header provides the row count; empty range returns HTTP 400.
      const exportRes = await fetch(
        `/api/database-logs/${vehicleId}/export?${exportParams}`,
        { credentials: "include", signal: abort.signal }
      );

      if (!exportRes.ok) {
        const body = await exportRes.json().catch(() => ({ error: exportRes.statusText }));
        setError(body.error || `Export failed (${exportRes.status})`);
        setExporting(false);
        return;
      }

      const knownTotal = parseInt(exportRes.headers.get("X-Total-Rows") ?? "0", 10) || 0;
      setExportTotal(knownTotal);

      // Build filename
      const rangeTag = exportMode === "custom"
        ? `${customStart}_to_${customEnd}`
        : `today_${todayStr}`;
      const filename = `raw_telemetry_${vehicleId}_${rangeTag}.csv`;

      // Try File System Access API — writes each chunk straight to disk, no RAM buffering.
      // Called after the fetch is confirmed OK, so dialog never appears for empty ranges.
      // Falls back silently to in-memory Blob for Firefox and older browsers.
      if (typeof window.showSaveFilePicker === "function") {
        try {
          const fh = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
          });
          fileWritable = await fh.createWritable();
        } catch (err) {
          if (err.name === "AbortError") {
            setExporting(false);
            return;
          }
          // SecurityError / gesture timeout — fall through to memory approach
        }
      }

      const RATE_WINDOW_MS = 5000;
      const AVG_BYTES_PER_ROW = 150;
      const THROTTLE_MS = 100; // update UI at most 10×/sec

      const rateWindow = [];
      const reader = exportRes.body.getReader();
      const chunks = fileWritable ? null : [];
      let receivedBytes = 0;
      let lastUIUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (fileWritable) {
          await fileWritable.write(value);
        } else {
          chunks.push(value);
        }

        receivedBytes += value.length;

        // Throttle — skip re-render if within throttle window
        const now = Date.now();
        if (now - lastUIUpdate < THROTTLE_MS) continue;
        lastUIUpdate = now;

        const estimatedRows = Math.min(Math.floor(receivedBytes / AVG_BYTES_PER_ROW), knownTotal);
        rateWindow.push({ time: now, rows: estimatedRows });
        while (rateWindow.length > 1 && now - rateWindow[0].time > RATE_WINDOW_MS) rateWindow.shift();

        let eta = null;
        if (rateWindow.length >= 2) {
          const dt = (rateWindow.at(-1).time - rateWindow[0].time) / 1000;
          const dr = rateWindow.at(-1).rows - rateWindow[0].rows;
          const rps = dt > 0 ? dr / dt : 0;
          if (rps > 0) eta = fmtEta((knownTotal - estimatedRows) / rps);
        }

        setExportCurrent(estimatedRows);
        setExportEta(eta);
        setExportProgress(knownTotal > 0 ? Math.min((estimatedRows / knownTotal) * 100, 99) : 0);
      }

      if (fileWritable) {
        await fileWritable.close(); // commits file to the chosen location
      } else {
        const blob = new Blob(chunks, { type: "text/csv" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }

      setExportProgress(100);
      setExportCurrent(knownTotal);
      setExportEta(null);
      setExportDone(true);

      setTimeout(() => {
        setExportProgress(0);
        setExportTotal(0);
        setExportCurrent(0);
        setExportDone(false);
      }, 4000);

    } catch (err) {
      if (fileWritable) fileWritable.abort().catch(() => {});
      if (err.name === "AbortError") {
        console.log("Export cancelled");
      } else {
        console.error("Export error:", err);
        setError("Export failed: " + err.message);
      }
    } finally {
      setExporting(false);
      exportAbort.current = null;
    }
  };

  const cancelExport = () => {
    exportAbort.current?.abort();
    setExporting(false);
    setExportProgress(0);
    setExportTotal(0);
    setExportCurrent(0);
    setExportEta(null);
  };

  /* ========================= EFFECTS ========================= */
  useEffect(() => {
    setRows([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
  }, [vehicleId, selectedDate]);

  useEffect(() => {
    fetchLogs(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, selectedDate]);

  useEffect(() => {
    if (!hasMore || rows.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading) fetchLogs(false); },
      { rootMargin: "600px" }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [rows.length, hasMore, loading, fetchLogs]);

  /* ========================= RENDER ========================= */
  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
        Raw Telemetry Logs
      </h2>

      {/* ---- Controls Panel ---- */}
      <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl p-6 shadow-lg space-y-6">

        {/* Date + export range row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="text-orange-300 font-medium min-w-32">Display Date:</label>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={e => setSelectedDate(e.target.value)}
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
              <option value="today">Today</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Custom date range */}
        {exportMode === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-800/30 rounded-lg border border-orange-500/20">
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">Start Date:</label>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => setCustomStart(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">End Date:</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
          </div>
        )}

        {/* Export button + progress */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={exportData}
              disabled={exporting || loading}
              className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-3"
            >
              {exporting ? (
                <>
                  <SpinnerIcon />
                  Exporting… {exportProgress > 0 ? `${exportProgress.toFixed(0)}%` : "Preparing…"}
                </>
              ) : exportDone ? (
                <>
                  <CheckIcon />
                  Export Complete!
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Export Data
                </>
              )}
            </button>

            {exporting && (
              <button
                onClick={cancelExport}
                className="px-5 py-4 bg-red-700/80 hover:bg-red-600 text-white rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>

          {exporting && exportTotal === 0 && (
            <div className="w-full max-w-2xl p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
              <p className="text-blue-300 text-sm">⏳ Calculating row count — this is fast, please wait…</p>
            </div>
          )}

          {exporting && exportTotal > 0 && (
            <div className="w-full max-w-2xl space-y-2">
              <div className="flex justify-between text-sm text-orange-300">
                <span>{exportCurrent.toLocaleString()} / {exportTotal.toLocaleString()} rows</span>
                <span className="flex items-center gap-3">
                  {exportEta && <span className="text-orange-400/80 text-xs">{exportEta}</span>}
                  <span>{exportProgress.toFixed(1)}%</span>
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${exportProgress}%` }}
                >
                  {exportProgress > 12 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {exportProgress.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-orange-400/60">
                ⏳ Download starts automatically when ready.
              </p>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* ---- Column selector (grouped) ---- */}
        <div className="pt-6 border-t border-orange-500/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-orange-400 font-semibold">
              Visible Columns ({visibleColumns.length} / {COLUMNS.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllCols}
                className="text-xs px-4 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded hover:bg-orange-500/30 transition"
              >
                Select All
              </button>
              <button
                onClick={deselectAllCols}
                className="text-xs px-4 py-1.5 bg-gray-800/50 border border-orange-500/30 rounded hover:bg-gray-700/50 transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto bg-black/30 rounded-lg p-4">
            {COLUMN_GROUPS.map(group => {
              const groupCols   = group.keys.map(k => COLUMN_MAP[k]).filter(Boolean);
              const allSelected = groupCols.every(c => selectedCols.has(c.key));
              const anySelected = groupCols.some(c => selectedCols.has(c.key));

              return (
                <div key={group.label}>
                  {/* Group header with toggle-all checkbox */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = anySelected && !allSelected; }}
                      onChange={() => toggleGroup(group.keys, !allSelected)}
                      className="w-4 h-4 accent-orange-500 rounded flex-shrink-0"
                    />
                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>

                  {/* Column checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 pl-6">
                    {groupCols.map(col => (
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
                          className="w-4 h-4 accent-orange-500 rounded flex-shrink-0"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Data Table ---- */}
      <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 bg-gray-950/80 border-b border-orange-500/20 text-orange-300 font-medium flex justify-between items-center">
          <span>
            {rows.length.toLocaleString()} record{rows.length !== 1 ? "s" : ""} for {selectedDate}
          </span>
          {loading && rows.length > 0 && (
            <span className="text-xs text-orange-400/70 flex items-center gap-1">
              <SpinnerIcon small /> Loading…
            </span>
          )}
        </div>

        <div className="overflow-auto max-h-[700px]">
          {loading && rows.length === 0 && (
            <div className="p-16 text-center text-orange-400/70 flex flex-col items-center gap-3">
              <SpinnerIcon />
              <span>Loading telemetry data…</span>
            </div>
          )}

          {!loading && rows.length === 0 && !error && (
            <div className="p-16 text-center text-orange-400/70">
              No telemetry data available for {selectedDate}
            </div>
          )}

          {error && rows.length === 0 && (
            <div className="p-12 text-center text-red-400">{error}</div>
          )}

          {rows.length > 0 && (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-950/95 z-10 border-b-2 border-orange-500/30">
                <tr>
                  {visibleColumns.map(col => (
                    <th
                      key={col.key}
                      className="px-5 py-3.5 text-left text-orange-400 font-semibold uppercase tracking-wider min-w-[140px] whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-500/10">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-orange-500/5 transition">
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-5 py-3.5 text-orange-100 whitespace-nowrap">
                        {row[col.key] ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="p-8 text-center text-orange-300 text-sm">
              {loading ? "Loading more records…" : "Scroll down to load more"}
            </div>
          )}

          {!hasMore && rows.length > 0 && (
            <div className="p-8 text-center text-orange-400/70 border-t border-orange-500/20 text-sm">
              End of data · {rows.length.toLocaleString()} rows loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ICON MICRO-COMPONENTS
   ============================================================ */
function SpinnerIcon({ small = false }) {
  const sz = small ? "h-3 w-3" : "h-5 w-5";
  return (
    <svg className={`animate-spin ${sz}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}