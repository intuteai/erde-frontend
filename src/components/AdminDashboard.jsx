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
   TABLE COLUMNS CONFIG
========================= */
const columns = [
  { key: "index", label: "S.No", sortable: false },
  { key: "vehicle_type", label: "Vehicle Type", sortable: true },
  { key: "capacity", label: "Capacity (T)", sortable: false },
  { key: "vehicle_no", label: "Vehicle No", sortable: true },
  { key: "customer", label: "Customer", sortable: true },
  { key: "total_hours", label: "Total Hours", sortable: true },
  { key: "total_kwh", label: "Total kWh", sortable: true },
  { key: "avg_kwh", label: "Avg kWh/Hr", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "track", label: "Live Track", sortable: false },
];

export default function AdminDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(null); // ← Changed: no default sorting
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user?.token;

  /* =========================
     FETCH ADMIN SUMMARY DATA
  ========================= */
  const fetchData = async () => {
    setError("");
    if (refreshing) setRefreshing(false);
    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/vehicle-master/admin-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formattedData = (res.data || []).map((row) => ({
        vehicle_master_id: row.vehicle_master_id,
        vehicle_type: row.vehicle_type?.trim() || "—",
        capacity: row.capacity ?? "—",
        vehicle_no: row.vehicle_no || "—",
        customer: row.customer || "—",
        total_hours: row.total_hours !== null ? row.total_hours : "—",
        total_kwh: row.total_kwh !== null ? row.total_kwh : "—",
        avg_kwh: row.avg_kwh !== null ? row.avg_kwh : "—",
        status: row.status || "offline",
        last_seen: row.last_seen,
      }));

      setRows(formattedData);
    } catch (err) {
      console.error("AdminDashboard fetch error:", err);
      setError("Failed to load fleet data. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Authentication required. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
      setLoading(false);
      return;
    }
    fetchData();
  }, [token, navigate]);

  /* =========================
     BASE SORTED LIST (always by vehicle_master_id ASC)
  ========================= */
  const baseSortedRows = useMemo(() => {
    return [...rows].sort((a, b) =>
      Number(a.vehicle_master_id) - Number(b.vehicle_master_id)
    );
  }, [rows]);

  /* =========================
     ID → Permanent Rank Map (fast lookup)
  ========================= */
  const idToRank = useMemo(() => {
    const map = new Map();
    baseSortedRows.forEach((row, index) => {
      map.set(row.vehicle_master_id, index + 1);
    });
    return map;
  }, [baseSortedRows]);

  /* =========================
     PROCESSED DATA (search + optional user sort)
  ========================= */
  const processedData = useMemo(() => {
    let data = [...baseSortedRows];

    // Apply search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((row) =>
        ["customer", "vehicle_type", "vehicle_no"].some((field) =>
          String(row[field] || "").toLowerCase().includes(q)
        )
      );
    }

    // Apply user-selected sort ONLY if sort is set
    if (sort?.key) {
      const multiplier = sort.dir === "asc" ? 1 : -1;

      data.sort((a, b) => {
        let valA = a[sort.key];
        let valB = b[sort.key];

        switch (sort.key) {
          case "total_hours":
          case "total_kwh":
          case "avg_kwh":
          case "capacity":
            valA = valA === "—" ? -Infinity : Number(valA);
            valB = valB === "—" ? -Infinity : Number(valB);
            break;

          case "status":
            const order = { online: 0, idle: 1, offline: 2 };
            valA = order[valA] ?? 3;
            valB = order[valB] ?? 3;
            break;

          default:
            valA = String(valA || "").toLowerCase();
            valB = String(valB || "").toLowerCase();
        }

        return (valA > valB ? 1 : valA < valB ? -1 : 0) * multiplier;
      });
    }

    return data;
  }, [baseSortedRows, query, sort]);

  /* =========================
     PAGINATION
  ========================= */
  const totalPages = Math.max(1, Math.ceil(processedData.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedData.slice(start, start + PAGE_SIZE);
  }, [processedData, page]);

  /* =========================
     REFRESH HANDLER
  ========================= */
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

    setSort((prev) => {
      // If clicking the same column → toggle direction
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // New column → start with asc
      return { key, dir: "asc" };
    });
  };

  /* =========================
     ROW CLICK → Vehicle Details
  ========================= */
  const handleRowClick = (row) => {
    localStorage.setItem(
      "selectedVehicle",
      JSON.stringify({
        id: row.vehicle_master_id,
        vehicleNo: row.vehicle_no,
        vehicleType: row.vehicle_type,
        customer: row.customer,
      })
    );
    navigate(`/vehicle/${row.vehicle_master_id}`);
  };

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
              placeholder="Search by customer, vehicle type, or registration number..."
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
                              sort?.key === col.key
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
                      <p className="mt-4 text-orange-300">Loading fleet data...</p>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-16 text-center text-orange-300/70">
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
                      <td className="px-6 py-5">
                        <span className="font-medium text-orange-100">
                          {row.vehicle_type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-orange-200">
                        {row.capacity}
                      </td>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vehicle/${row.vehicle_master_id}/track`);
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