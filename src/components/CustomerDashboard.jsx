// src/pages/customer/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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

/* =========================
   STATUS PILL COMPONENT
========================= */
const StatusPill = React.memo(({ status }) => {
  const styles = {
    online: "bg-green-500/20 text-green-300 border-green-500/40",
    idle: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    offline: "bg-red-500/20 text-red-300 border-red-500/40",
  };

  const label = status?.charAt(0).toUpperCase() + status?.slice(1) || "Offline";

  return (
    <span
      className={`px-3 py-1.5 text-xs font-medium rounded-full border ${styles[status] || styles.offline} flex items-center gap-1.5`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          styles[status]?.includes("green")
            ? "bg-green-400"
            : styles[status]?.includes("yellow")
            ? "bg-yellow-400"
            : "bg-red-400"
        } animate-pulse`}
      />
      {label}
    </span>
  );
});

/* =========================
   TABLE COLUMNS CONFIG — MATCHES ADMIN
========================= */
const columns = [
  { key: "index", label: "S.No", sortable: false },
  { key: "vehicleType", label: "Vehicle Type", sortable: true },
  { key: "capacity", label: "Capacity (T)", sortable: false },
  { key: "vehicleNo", label: "Vehicle No", sortable: true },
  { key: "totalHours", label: "Total Hours", sortable: true },
  { key: "totalKwh", label: "Total kWh", sortable: true },
  { key: "avgKwh", label: "Avg kWh/Hr", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "track", label: "Live Track", sortable: false },
];

const safe = (v) => (v != null && String(v).trim() ? String(v).trim() : "—");

export default function CustomerDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "vehicleType", dir: "asc" });
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  /* =========================
     FETCH CUSTOMER VEHICLES
  ========================= */
  const fetchData = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/vehicle-master/my`, {
        withCredentials: true,
      });

      const formatted = (res.data || []).map((row) => ({
        id: row.vehicle_master_id,
        vehicleType:
          `${row.vehicle_make || ""} ${row.vehicle_model || ""}`.trim() || "—",
        capacity: row.capacity ?? row.capacity_tonne ?? "—",
        vehicleNo: safe(row.vehicle_reg_no),
        totalHours: row.total_hours ?? "—",
        totalKwh: row.total_kwh ?? "—",
        avgKwh: row.avg_kwh ?? "—",
        status: row.status || "offline",
      }));

      setRows(formatted);
    } catch (err) {
      console.error("CustomerDashboard fetch error:", err);
      setError("Failed to load your vehicles.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* =========================
     SORT HANDLER
  ========================= */
  const onSort = (key) => {
    if (!columns.find((c) => c.key === key)?.sortable) return;

    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  /* =========================
     FILTER + SORT LOGIC
  ========================= */
  const processedData = useMemo(() => {
    let data = [...rows];

    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((row) =>
        ["vehicleType", "vehicleNo"].some((field) =>
          String(row[field] || "").toLowerCase().includes(q)
        )
      );
    }

    const sortableKeys = ["vehicleType", "vehicleNo", "totalHours", "totalKwh", "avgKwh", "status"];
    if (sortableKeys.includes(sort.key)) {
      const multiplier = sort.dir === "asc" ? 1 : -1;

      data.sort((a, b) => {
        let valA = a[sort.key];
        let valB = b[sort.key];

        if (["totalHours", "totalKwh", "avgKwh"].includes(sort.key)) {
          valA = valA === "—" ? -Infinity : Number(valA);
          valB = valB === "—" ? -Infinity : Number(valB);
        } else if (sort.key === "status") {
          const order = { online: 0, idle: 1, offline: 2 };
          valA = order[valA] ?? 3;
          valB = order[valB] ?? 3;
        } else {
          valA = String(valA || "").toLowerCase();
          valB = String(valB || "").toLowerCase();
        }

        return (valA > valB ? 1 : valA < valB ? -1 : 0) * multiplier;
      });
    }

    return data;
  }, [rows, query, sort]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedData.slice(start, start + PAGE_SIZE);
  }, [processedData, page]);

  const handleRowClick = (row) => {
    localStorage.setItem(
      "selectedVehicle",
      JSON.stringify({
        id: row.id,
        vehicleNo: row.vehicleNo,
        vehicleType: row.vehicleType,
      })
    );
    navigate(`/vehicle/${row.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            My Vehicles
          </h1>
          <p className="mt-3 text-orange-200/70 text-lg">
            Monitor your registered fleet in real-time
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400/70" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by vehicle type or registration number..."
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-800/50 border border-orange-500/30 focus:border-orange-500 focus:outline-none text-white placeholder-orange-300/50 transition"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-70 transition font-medium"
          >
            {refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCcw className="w-5 h-5" />
            )}
            Refresh Data
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

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
                        className={`flex items-center gap-2 hover:text-orange-300 transition ${
                          col.sortable ? "cursor-pointer" : "cursor-default"
                        }`}
                        disabled={!col.sortable}
                      >
                        {col.label}
                        {col.sortable && (
                          <ArrowUpDown
                            className={`w-4 h-4 transition-transform ${
                              sort.key === col.key
                                ? sort.dir === "asc"
                                  ? "rotate-0"
                                  : "rotate-180"
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
                      <p className="mt-4 text-orange-300">Loading your vehicles...</p>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center text-orange-300/70">
                      No vehicles found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="hover:bg-orange-500/5 transition cursor-pointer group"
                    >
                      {/* S.No matches Admin Dashboard: global across pages */}
                      <td className="px-6 py-5 text-sm">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-medium text-orange-100">
                          {row.vehicleType}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-orange-200">
                        {row.capacity}
                      </td>
                      <td className="px-6 py-5 font-semibold">{row.vehicleNo}</td>
                      <td className="px-6 py-5">
                        {row.totalHours === "—" ? "—" : `${row.totalHours} hrs`}
                      </td>
                      <td className="px-6 py-5">
                        {row.totalKwh === "—" ? "—" : row.totalKwh}
                      </td>
                      <td className="px-6 py-5">
                        {row.avgKwh === "—" ? "—" : row.avgKwh}
                      </td>
                      <td className="px-6 py-5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vehicle/${row.id}/track`);
                          }}
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
                Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(page * PAGE_SIZE, processedData.length)} of{" "}
                {processedData.length} vehicles
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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