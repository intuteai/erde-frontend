import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ========================= FAULTS ========================= */
export default function MotorFaults() {
  const { id } = useParams();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  /* ========================= FETCH ========================= */
  useEffect(() => {
    const fetchFaults = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const url = selectedDate
          ? `/api/faults/${id}?date=${selectedDate}`
          : `/api/faults/${id}?days=30`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load faults");

        const rows = await res.json();
        setLogs(rows || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchFaults();
  }, [id, selectedDate]);

  /* ========================= HELPERS ========================= */
  const pretty = (code) =>
    code
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  /* ========================= COUNTS ========================= */
  const counts = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      map.set(l.code, (map.get(l.code) || 0) + 1);
    });
    return map;
  }, [logs]);

  /* ========================= FILTERED & SORTED LOGS ========================= */
  const filtered = useMemo(() => {
    let list = logs;

    if (selectedCodes.size > 0) {
      list = list.filter((l) => selectedCodes.has(l.code));
    }

    // Unfixed (active) faults first, then newest activations
    return [...list].sort((a, b) => {
      if (!!a.cleared_at !== !!b.cleared_at) {
        return a.cleared_at ? 1 : -1;
      }
      return new Date(b.activated_at) - new Date(a.activated_at);
    });
  }, [logs, selectedCodes]);

  const toggleCode = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const clearDate = () => setSelectedDate("");

  /* ========================= CSV EXPORT ========================= */
  const exportCSV = () => {
    const rows = [
      ["Activated At", "Fixed At", "Code", "Description"],
      ...filtered.map((l) => [
        new Date(l.activated_at).toLocaleString(),
        l.cleared_at ? new Date(l.cleared_at).toLocaleString() : "",
        l.code,
        pretty(l.code),
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `faults_${selectedDate || "30days"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  /* ========================= UI STATES ========================= */
  if (loading)
    return (
      <div className="text-center py-16 text-orange-300">
        Loading faults…
      </div>
    );

  if (error)
    return (
      <div className="text-center py-16 text-red-400">
        Error: {error}
      </div>
    );

  const uniqueCodes = [...new Set(logs.map((l) => l.code))];

  return (
    <div className="space-y-6 pb-8">
      {/* ===== TITLE ===== */}
      <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent mb-3">
        Fault History
      </h2>

      {/* ===== DATE FILTER ===== */}
      <div className="flex justify-center items-center gap-4 flex-wrap">
        <label className="text-orange-300 text-sm font-medium">Filter by Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-900/80 border border-orange-500/40 text-orange-200 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none transition"
        />
        {selectedDate && (
          <button
            onClick={clearDate}
            className="text-orange-400 hover:text-orange-300 underline text-sm transition"
          >
            Show last 30 days
          </button>
        )}
      </div>

      {/* ===== FAULT TYPE FILTER BUTTONS ===== */}
      <div className="bg-gradient-to-br from-gray-900/90 to-black/80 border border-orange-500/30 rounded-xl p-5 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedCodes(new Set())}
            className={`px-4 py-3 rounded-lg border font-medium transition-all ${
              selectedCodes.size === 0
                ? "border-orange-500 bg-orange-500/20 text-orange-300 shadow-lg scale-105"
                : "border-orange-500/30 text-orange-200 bg-gray-800/40 hover:bg-orange-500/10 hover:border-orange-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>All Faults</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-600/40 border border-orange-500/60">
                {logs.length}
              </span>
            </div>
          </button>

          {uniqueCodes.map((code) => (
            <button
              key={code}
              onClick={() => toggleCode(code)}
              className={`px-4 py-3 rounded-lg border font-medium transition-all ${
                selectedCodes.has(code)
                  ? "border-orange-500 bg-orange-500/20 text-orange-300 shadow-lg scale-105"
                  : "border-orange-500/30 text-orange-200 bg-gray-800/40 hover:bg-orange-500/10 hover:border-orange-500/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-left">{pretty(code)}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-600/40 border border-orange-500/60 flex-shrink-0">
                  {counts.get(code) || 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ===== FAULT LOG TABLE ===== */}
      <div className="bg-gradient-to-br from-gray-900/90 to-black/80 rounded-xl border border-orange-500/30 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-900/60 border-b border-orange-500/20 flex justify-between items-center">
          <div className="text-orange-300 font-medium">
            <span className="text-orange-400 font-bold">{filtered.length}</span> fault session{filtered.length !== 1 ? "s" : ""}
            {selectedDate && <span className="text-orange-200/70"> on {selectedDate}</span>}
            {selectedCodes.size > 0 && <span className="text-orange-200/70"> (filtered)</span>}
          </div>

          <button
            onClick={exportCSV}
            className="px-5 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
          >
            Export CSV
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="max-h-[500px] overflow-y-auto divide-y divide-orange-500/10">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-orange-300/70">
              No fault sessions found for the selected filters.
            </div>
          ) : (
            filtered.map((l) => (
              <div
                key={l.dtc_id}
                className="px-6 py-5 hover:bg-orange-500/5 transition-all group"
              >
                <div className="flex justify-between items-start gap-6">
                  {/* Left: Fault Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${l.cleared_at ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                      <div className="font-semibold text-orange-100 text-lg">
                        {pretty(l.code)}
                      </div>
                    </div>
                    {l.description && (
                      <div className="text-sm text-orange-200/60 ml-5">
                        {l.description}
                      </div>
                    )}
                  </div>

                  {/* Right: Timestamps */}
                  <div className="text-right space-y-1 min-w-[200px]">
                    <div className="text-sm text-orange-300 font-medium">
                      {new Date(l.activated_at).toLocaleString()}
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full inline-block ${
                      l.cleared_at
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {l.cleared_at
                        ? `Fixed: ${new Date(l.cleared_at).toLocaleString()}`
                        : "Active"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}