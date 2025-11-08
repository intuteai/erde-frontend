// src/pages/customer/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search, RefreshCcw, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Table columns — customer view */
const columns = [
  { key: "index",       label: "S.No",             width: "w-20", sortable: false },
  { key: "vehicleType", label: "Vehicle Type",     width: "w-44", sortable: true  },
  { key: "vehicleNo",   label: "Vehicle Number",   width: "w-44", sortable: true  },
  { key: "vcuId",       label: "VCU Model",        width: "w-48", sortable: false },
  { key: "hmiId",       label: "HMI Model",        width: "w-48", sortable: false },
  { key: "delivery",    label: "Delivery Date",    width: "w-40", sortable: false },
  { key: "totalHours",  label: "Total Hours",      width: "w-32", sortable: false },
  { key: "totalKwh",    label: "Total kWh",        width: "w-32", sortable: false },
  { key: "avgKwh",      label: "Avg kWh",          width: "w-28", sortable: false },
];

function Pill({ children }) {
  return (
    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-200">
      {children}
    </span>
  );
}

export default function CustomerDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "vehicleType", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user?.token;

  /** Fetch ONLY THIS customer's vehicles */
  const fetchData = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/vehicle-master/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const mapped = res.data.map((row) => ({
        id: row.vehicle_master_id,
        vehicleType: `${row.vehicle_make || ""} ${row.vehicle_model || ""}`.trim() || "—",
        vehicleNo: row.vehicle_reg_no || "—",
        vcuId: row.vcu_display || "—",
        hmiId: row.hmi_display || "—",
        delivery: row.date_of_deployment
          ? new Date(row.date_of_deployment).toLocaleDateString("en-IN")
          : "—",
        totalHours: 0,
        totalKwh: 0,
        avgKwh: 0,
      }));

      setRows(mapped);
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Failed to load your vehicles. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
    else {
      setError("Not authenticated. Please log in.");
      setLoading(false);
    }
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /** Sort only on vehicleType & vehicleNo */
  const onSort = (key, enabled) => {
    if (!enabled) return;
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  /** Search only on Vehicle Type & Vehicle Number */
  const filtered = useMemo(() => {
    let data = [...rows];
    const q = query.trim().toLowerCase();

    if (q) {
      data = data.filter((r) =>
        [r.vehicleType, r.vehicleNo]
          .some((v) => v?.toString().toLowerCase().includes(q))
      );
    }

    if (["vehicleType", "vehicleNo"].includes(sort.key)) {
      const dir = sort.dir === "asc" ? 1 : -1;
      data.sort((a, b) => {
        const A = (a[sort.key] ?? "").toString().toLowerCase();
        const B = (b[sort.key] ?? "").toString().toLowerCase();
        return A.localeCompare(B) * dir;
      });
    }

    return data;
  }, [rows, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

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
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black overflow-x-hidden">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmax] h-[120vmax] rounded-full border border-orange-500/10 animate-[spin_60s_linear_infinite]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vmax] h-[140vmax] rounded-full border border-red-500/10 animate-[spin_80s_linear_infinite_reverse]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
            My Vehicles
          </h1>
          <p className="mt-2 text-sm text-orange-200/80">
            View and monitor your registered vehicles
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative w-full md:max-w-lg group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Vehicle Type or Reg No..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 shadow-lg"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white font-semibold border border-orange-500/40 shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border-2 border-orange-500/30 bg-gradient-to-br from-gray-800/70 via-gray-800/50 to-gray-900/60 shadow-2xl overflow-hidden backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-black/40 backdrop-blur">
                <tr className="text-left">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={`px-5 py-4 text-sm font-semibold uppercase tracking-wider text-orange-200/90 ${c.width}`}
                    >
                      <button
                        className={`inline-flex items-center gap-1 ${c.sortable ? "hover:text-white transition" : "cursor-default"}`}
                        onClick={() => onSort(c.key, c.sortable)}
                        title={c.sortable ? "Sort" : undefined}
                      >
                        {c.label}
                        {c.sortable && (
                          <ArrowUpDown
                            className={`w-4 h-4 transition-opacity ${
                              sort.key === c.key ? "opacity-100" : "opacity-40"
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
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {columns.map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded bg-orange-500/10 w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center text-orange-200/80" colSpan={columns.length}>
                      No vehicles found.
                    </td>
                  </tr>
                ) : (
                  paged.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="group cursor-pointer hover:bg-orange-500/5 transition"
                    >
                      <td className="px-5 py-4 text-sm text-gray-200">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-5 py-4"><Pill>{row.vehicleType}</Pill></td>
                      <td className="px-5 py-4 text-gray-100 font-medium">{row.vehicleNo}</td>
                      <td className="px-5 py-4 text-gray-300 text-xs">{row.vcuId}</td>
                      <td className="px-5 py-4 text-gray-300 text-xs">{row.hmiId}</td>
                      <td className="px-5 py-4 text-gray-100">{row.delivery}</td>
                      <td className="px-5 py-4 text-gray-100">{row.totalHours}</td>
                      <td className="px-5 py-4 text-gray-100">{row.totalKwh}</td>
                      <td className="px-5 py-4 text-gray-100">{row.avgKwh}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-black/40">
            <div className="text-xs text-orange-200/70">
              {!loading && (
                <span>
                  Showing <b>{paged.length}</b> of <b>{filtered.length}</b> result(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg border border-orange-500/30 text-orange-200 disabled:opacity-50 hover:bg-orange-500/10 transition"
              >
                Prev
              </button>
              <span className="text-sm text-orange-200/80">
                Page <b>{page}</b> / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg border border-orange-500/30 text-orange-200 disabled:opacity-50 hover:bg-orange-500/10 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-[spin_60s_linear_infinite] { animation: spin 60s linear infinite; }
        .animate-[spin_80s_linear_infinite_reverse] { animation: spin 80s linear infinite reverse; }
      `}</style>
    </div>
  );
}