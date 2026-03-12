import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Search,
  RefreshCcw,
  Loader2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PAGE_SIZE = 10;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,   // 30s — batch analytics can be slow on large date ranges
  headers: { "Content-Type": "application/json" },
});

const columns = [
  { key: "index",        label: "S.No",        sortable: false },
  { key: "vehicle_type", label: "Vehicle Type", sortable: true  },
  { key: "capacity",     label: "Capacity (T)", sortable: false },
  { key: "vehicle_no",   label: "Vehicle No",   sortable: true  },
  { key: "customer",     label: "Customer",     sortable: true  },
  { key: "total_hours",  label: "Total Hours",  sortable: true  },
  { key: "total_kwh",    label: "Total kWh",    sortable: true  },
  { key: "avg_kwh",      label: "Avg kWh/Hr",   sortable: true  },
  { key: "status",       label: "Status",       sortable: true  },
  { key: "track",        label: "Live Track",   sortable: false },
];

/* ── Status Pill ─────────────────────────────────────────── */
const StatusPill = React.memo(({ status }) => {
  const styles = {
    online:  "bg-green-500/20  text-green-300  border-green-500/40",
    idle:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    offline: "bg-red-500/20    text-red-300    border-red-500/40",
  };

  const dotColor = {
    online:  "bg-green-400",
    idle:    "bg-yellow-400",
    offline: "bg-red-400",
  };

  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Offline";

  return (
    <span
      className={`px-3 py-1.5 text-xs font-medium rounded-full border flex items-center gap-1.5 w-fit
        ${styles[status] || styles.offline}`}
    >
      <span className={`w-2 h-2 rounded-full animate-pulse ${dotColor[status] || dotColor.offline}`} />
      {label}
    </span>
  );
});

/* ── Main Component ──────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const user  = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const token = user?.token;

  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [query,       setQuery]       = useState("");
  const [sortConfig,  setSortConfig]  = useState({ key: null, direction: "asc" });
  const [page,        setPage]        = useState(1);

  const [analyticsMode, setAnalyticsMode] = useState("all"); // "all" | "today" | "custom"
  const [fromDate,      setFromDate]      = useState("");
  const [toDate,        setToDate]        = useState("");

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!token) return;

    setError("");
    setLoading(true);

    try {
      const authHeader = { Authorization: `Bearer ${token}` };

      // Step 1: always fetch base summary (status, vehicle info, all-time totals)
      const summaryRes = await apiClient.get(
        "/api/vehicle-master/admin-summary",
        { headers: authHeader }
      );

      let baseRows = summaryRes.data.map((row) => ({
        vehicle_master_id: row.vehicle_master_id,
        vehicle_type:      row.vehicle_type?.trim() || "—",
        capacity:          row.capacity ?? "—",
        vehicle_no:        row.vehicle_no  || "—",
        customer:          row.customer    || "—",
        total_hours:       row.total_hours ?? "—",
        total_kwh:         row.total_kwh   ?? "—",
        avg_kwh:           row.avg_kwh     ?? "—",
        status:            row.status      || "offline",
        last_seen:         row.last_seen,
      }));

      // Step 2: if custom mode but dates incomplete, show base data and stop
      if (analyticsMode === "custom" && (!fromDate || !toDate)) {
        setRows(baseRows);
        setLoading(false);
        return;
      }

      // Step 3: for today/custom — ONE batch request replaces N per-vehicle requests
      if (analyticsMode !== "all") {
        const params =
          analyticsMode === "today"
            ? "mode=today"
            : `from=${fromDate}&to=${toDate}`;

        const batchRes = await apiClient.get(
          `/api/vehicles/analytics/batch?${params}`,
          { headers: authHeader }
        );

        // batchRes.data is { [vehicle_master_id]: { running_hours, kwh_consumed, avg_kwh } }
        const analyticsMap = batchRes.data;

        baseRows = baseRows.map((row) => {
          const a = analyticsMap[row.vehicle_master_id];
          if (!a) return row;
          return {
            ...row,
            total_hours: a.running_hours ?? "—",
            total_kwh:   a.kwh_consumed  ?? "—",
            avg_kwh:     a.avg_kwh       ?? "—",
          };
        });
      }

      setRows(baseRows);
    } catch (err) {
      console.error("Admin dashboard fetch failed:", err);
      setError("Failed to load fleet data. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, analyticsMode, fromDate, toDate]);

  /* ── Effects ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) {
      setError("Authentication required. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1800);
      return;
    }
    fetchData();
  }, [token, analyticsMode, fromDate, toDate, navigate, fetchData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim().toLowerCase());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ── Derived data ────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!query) return rows;
    return rows.filter((row) =>
      Object.values(row).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(query)
      )
    );
  }, [rows, query]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA == null || valA === "—") return 1;
      if (valB == null || valB === "—") return -1;

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === "asc" ? numA - numB : numB - numA;
      }

      return sortConfig.direction === "asc"
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true });
    });
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  // Stable serial numbers based on original (unsorted) order
  const idToRank = useMemo(() => {
    const map = new Map();
    rows.forEach((row, idx) => map.set(row.vehicle_master_id, idx + 1));
    return map;
  }, [rows]);

  /* ── Handlers ────────────────────────────────────────────── */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const onSort = useCallback((key) => {
    if (!columns.find((c) => c.key === key)?.sortable) return;
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleRowClick = useCallback(
    (row) => {
      localStorage.setItem(
        "selectedVehicle",
        JSON.stringify({
          id:          row.vehicle_master_id,
          vehicleNo:   row.vehicle_no,
          vehicleType: row.vehicle_type,
          customer:    row.customer,
        })
      );
      navigate(`/vehicle/${row.vehicle_master_id}`);
    },
    [navigate]
  );

  const handleTrackClick = useCallback(
    (e, vehicleId) => {
      e.stopPropagation();
      navigate(`/vehicle/${vehicleId}/track`);
    },
    [navigate]
  );

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="mt-3 text-orange-200/70 text-lg">
            Real-time overview of all deployed vehicles
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 mb-8">

          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400/70" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by vehicle number, type, customer..."
              className="w-full pl-14 pr-6 py-3.5 rounded-xl bg-gray-800/50 border border-orange-500/30 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-white placeholder-orange-300/50 transition shadow-lg"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            {/* Mode Buttons */}
            <div className="flex items-center gap-3 bg-gray-800/40 p-1.5 rounded-xl border border-orange-500/20 w-fit">
              {[
                { value: "all",    label: "All Time"   },
                { value: "today",  label: "Today"      },
                { value: "custom", label: "Date Range" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setAnalyticsMode(value);
                    if (value !== "custom") {
                      setFromDate("");
                      setToDate("");
                    }
                  }}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    analyticsMode === value
                      ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-500/30"
                      : "text-orange-300 hover:text-orange-200 hover:bg-gray-700/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Date Range Picker */}
            {analyticsMode === "custom" && (
              <div className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-xl border border-orange-500/20 w-fit">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-orange-300/70 font-medium px-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-900/50 border border-orange-500/30 text-orange-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm"
                  />
                </div>
                <div className="flex items-center mt-5">
                  <div className="w-8 h-px bg-orange-500/40" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-orange-300/70 font-medium px-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-900/50 border border-orange-500/30 text-orange-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition text-sm"
                  />
                </div>
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-70 transition font-medium shadow-lg shadow-orange-500/20 md:ml-auto"
            >
              {refreshing
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <RefreshCcw className="w-5 h-5" />
              }
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Data range label */}
        <p className="text-sm text-orange-300/70 mb-4">
          Showing data for:{" "}
          <span className="text-orange-300 font-medium">
            {analyticsMode === "all"
              ? "All Time"
              : analyticsMode === "today"
              ? "Today"
              : fromDate && toDate
              ? `${fromDate} → ${toDate}`
              : "Select date range"}
          </span>
        </p>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden border border-orange-500/20 bg-gray-800/30 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-black/60 to-black/40">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-5 text-left text-xs font-semibold text-orange-200 uppercase tracking-wider"
                    >
                      <button
                        onClick={() => onSort(col.key)}
                        disabled={!col.sortable}
                        className={`flex items-center gap-2 hover:text-orange-300 transition ${
                          col.sortable ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        {col.label}
                        {col.sortable && (
                          <ArrowUpDown
                            className={`w-4 h-4 transition-transform ${
                              sortConfig.key === col.key
                                ? sortConfig.direction === "asc" ? "rotate-0" : "rotate-180"
                                : "opacity-50"
                            }`}
                          />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-orange-500/10">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-400" />
                      <p className="mt-4 text-orange-300">Loading fleet data...</p>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-16 text-center text-orange-300/70"
                    >
                      No vehicles found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.vehicle_master_id}
                      onClick={() => handleRowClick(row)}
                      className="hover:bg-orange-500/5 transition cursor-pointer group"
                    >
                      <td className="px-6 py-5 text-sm font-medium text-orange-300/90">
                        {idToRank.get(row.vehicle_master_id) ?? "—"}
                      </td>
                      <td className="px-6 py-5 font-medium text-orange-100">
                        {row.vehicle_type}
                      </td>
                      <td className="px-6 py-5 text-orange-200">{row.capacity}</td>
                      <td className="px-6 py-5 font-semibold">{row.vehicle_no}</td>
                      <td className="px-6 py-5">{row.customer}</td>
                      <td className="px-6 py-5">
                        {row.total_hours === "—" ? "—" : `${row.total_hours} hrs`}
                      </td>
                      <td className="px-6 py-5">
                        {row.total_kwh === "—" ? "—" : row.total_kwh}
                      </td>
                      <td className="px-6 py-5">
                        {row.avg_kwh === "—" ? "—" : row.avg_kwh}
                      </td>
                      <td className="px-6 py-5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={(e) => handleTrackClick(e, row.vehicle_master_id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 transition font-medium text-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          Track Live
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-black/30 border-t border-orange-500/20">
              <p className="text-sm text-orange-300/70">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, sortedRows.length)} of{" "}
                {sortedRows.length} vehicles
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}