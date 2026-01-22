import React, { useState } from "react";
import { useParams } from "react-router-dom";

/* ========================= PAGE ========================= */
export default function DatabaseModuleExport() {
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

  const [exportMode, setExportMode] = useState("selected");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  /* ========================= BUILD QUERY ========================= */
  const buildQuery = () => {
    switch (exportMode) {
      case "today":
        return "period=today";
      case "week":
        return "period=week";
      case "month":
        return "period=month";
      case "all":
        return "period=all";
      case "custom":
        if (!customStart || !customEnd) {
          throw new Error("Select both start and end dates");
        }
        return `start=${customStart}&end=${customEnd}`;
      case "selected":
      default:
        return `date=${selectedDate}`;
    }
  };

  /* ========================= DOWNLOAD ========================= */
  const downloadCsv = async (type) => {
    setExporting(true);
    setError(null);

    try {
      const query = buildQuery();
      const url = `/api/database-logs/${vehicleId}/export/${type}?${query}`;

      // ✅ FIX: send Authorization header (JWT-based auth)
      const token = localStorage.getItem("token");

      const res = await fetch(url, {
        method: "GET",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download =
        type === "cells"
          ? `vehicle_${vehicleId}_cell_voltages.csv`
          : `vehicle_${vehicleId}_temperature_sensors.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  /* ========================= RENDER ========================= */
  return (
    <div className="space-y-6 pb-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
        Module Data Export
      </h2>

      <div className="bg-gray-900/90 border border-orange-500/30 rounded-xl p-6 shadow-lg space-y-6">
        {/* Date / Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <label className="text-orange-300 font-medium min-w-32">
              Export Range:
            </label>
            <select
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
            >
              <option value="selected">Selected Day</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {exportMode === "selected" && (
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium min-w-32">
                Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
          )}
        </div>

        {exportMode === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-800/30 rounded-lg border border-orange-500/20">
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">Start:</label>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-orange-300 font-medium">End:</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-orange-500/50 rounded-lg text-orange-200 focus:border-orange-400 outline-none transition"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => downloadCsv("cells")}
            disabled={exporting}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl disabled:opacity-60 transition"
          >
            Export Cell Voltages
          </button>

          <button
            onClick={() => downloadCsv("temps")}
            disabled={exporting}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl disabled:opacity-60 transition"
          >
            Export Temperature Sensors
          </button>
        </div>

        {exporting && (
          <div className="text-center text-orange-300">
            Preparing export…
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 font-medium">
            {error}
          </div>
        )}
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
