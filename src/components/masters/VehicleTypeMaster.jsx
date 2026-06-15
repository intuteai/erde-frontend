// src/components/masters/VehicleTypeMaster.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Link2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

// BACKEND APIs
const API_BASE = "http://localhost:5000/api/vehicle-types";
const CATEGORY_API = "http://localhost:5000/api/vehicle-categories";

const getAuthHeaders = () => ({});

export default function VehicleTypeMaster() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch vehicle types
  const fetchTypes = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(API_BASE);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Failed to load vehicle types";
      setError(
        msg.includes("Unauthorized") || e.response?.status === 401
          ? "Session expired"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(CATEGORY_API, {
        headers: getAuthHeaders(),
      });
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load vehicle categories", e);
    }
  };

  useEffect(() => {
    fetchTypes();
    fetchCategories();
  }, []);

  // Search filter
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      `${r.make} ${r.model} ${r.category_name || ""} ${r.capacity_tonne || ""} ${r.architecture_diagram || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  // CRUD Handlers
  const startAdd = () =>
    setEditing({
      make: "",
      model: "",
      capacity_tonne: "",
      category_id: "",
      architecture_diagram: "",
      drawings_folder_url: "",
    });

  const startEdit = (row) => setEditing({ ...row });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing.make?.trim()) return alert("Make is required!");
    if (!editing.model?.trim()) return alert("Model is required!");
    if (!editing.category_id) return alert("Vehicle Category is required!");

    const payload = {
      make: editing.make.trim(),
      model: editing.model.trim(),
      capacity_tonne: editing.capacity_tonne?.trim() || null,
      category_id: Number(editing.category_id),
      architecture_diagram: editing.architecture_diagram?.trim() || null,
      drawings_folder_url: editing.drawings_folder_url?.trim() || null,
    };

    try {
      if (!editing.vtype_id) {
        // CREATE
        const { data } = await axios.post(API_BASE, payload, {
          headers: getAuthHeaders(),
        });
        const newRow = {
          ...payload,
          vtype_id: data.vtype_id,
          category_name: categories.find((c) => c.category_id === payload.category_id)?.category_name || "",
        };
        setRows((prev) => [newRow, ...prev]);
      } else {
        // UPDATE
        await axios.put(`${API_BASE}/${editing.vtype_id}`, payload, {
          headers: getAuthHeaders(),
        });
        setRows((  prev) =>
          prev.map((r) =>
            r.vtype_id === editing.vtype_id
              ? {
                  ...r,
                  ...payload,
                  category_name: categories.find((c) => c.category_id === payload.category_id)?.category_name || r.category_name,
                }
              : r
          )
        );
      }
      setEditing(null);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to save vehicle type");
    }
  };

  const askDelete = (id) => setConfirmId(id);

  const doDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${confirmId}`, {
        headers: getAuthHeaders(),
      });
      setRows((prev) => prev.filter((r) => r.vtype_id !== confirmId));
    } catch (e) {
      alert(e.response?.data?.error || "Cannot delete: This type is in use");
    } finally {
      setConfirmId(null);
    }
  };

  // Export to CSV
  const exportCsv = () => {
    const headers = "Make,Model,Category,Capacity (tonne),Architecture,Drawings URL\n";
    const csv = rows
      .map((r) =>
        [
          r.make,
          r.model,
          r.category_name || "",
          r.capacity_tonne || "",
          r.architecture_diagram || "",
          r.drawings_folder_url || "",
        ]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle_types.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-x-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Vehicle Type Master
          </h1>
          <p className="mt-2 text-orange-300">Manage electric vehicle models and specifications</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vehicle types..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCsv}
              className="px-5 py-3 rounded-xl bg-gray-800 border border-orange-500/30 hover:bg-gray-700 flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={startAdd}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2 hover:opacity-90 transition"
            >
              <Plus className="w-5 h-5" /> Add Type
            </button>
          </div>
        </div>

        {/* Loading & Error States */}
        {loading && (
          <div className="text-center py-12 text-orange-300">
            Loading vehicle types...
          </div>
        )}

        {error && !loading && (
          <div className="p-5 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-gray-800/50 rounded-2xl border border-orange-500/30 overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-black/60 sticky top-0 z-10">
                  <tr>
                    {["Make", "Model", "Category", "Capacity (tonne)", "Architecture", "Drawings", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-4 text-left text-orange-200 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-gray-400 text-lg">
                        {query ? "No matching vehicle types found" : "No vehicle types added yet"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r.vtype_id}
                        className="border-t border-orange-500/10 hover:bg-orange-500/5 transition"
                      >
                        <td className="px-6 py-4 font-bold text-orange-100">{r.make}</td>
                        <td className="px-6 py-4">{r.model}</td>
                        <td className="px-6 py-4">{r.category_name || "-"}</td>
                        <td className="px-6 py-4">{r.capacity_tonne || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {r.architecture_diagram || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {r.drawings_folder_url ? (
                            <a
                              href={r.drawings_folder_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-300 hover:text-orange-100 flex items-center gap-1 transition"
                            >
                              <Link2 className="w-4 h-4" /> Open
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(r)}
                              className="p-2 hover:bg-orange-500/20 rounded transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => askDelete(r.vtype_id)}
                              className="p-2 hover:bg-red-500/20 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit / Add Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-3xl font-bold text-orange-300 mb-8">
                {editing.vtype_id ? "Edit" : "Add New"} Vehicle Type
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Make *"
                  value={editing.make || ""}
                  onChange={(v) => setEditing({ ...editing, make: v })}
                  placeholder="e.g. Tata"
                />
                <Input
                  label="Model *"
                  value={editing.model || ""}
                  onChange={(v) => setEditing({ ...editing, model: v })}
                  placeholder="e.g. Ace EV"
                />
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="text-orange-300 text-sm font-medium">Vehicle Category *</span>
                    <select
                      value={editing.category_id || ""}
                      onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
                      className="mt-2 w-full px-4 py-3 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-white"
                    >
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Input
                  label="Capacity (tonne)"
                  value={editing.capacity_tonne || ""}
                  onChange={(v) => setEditing({ ...editing, capacity_tonne: v })}
                  placeholder="e.g. 175.00"
                />
                <Input
                  label="Architecture Diagram"
                  value={editing.architecture_diagram || ""}
                  onChange={(v) => setEditing({ ...editing, architecture_diagram: v })}
                  placeholder="e.g. https://example.com/diagram.png"
                />
                <Input
                  label="Drawings Folder URL"
                  value={editing.drawings_folder_url || ""}
                  onChange={(v) => setEditing({ ...editing, drawings_folder_url: v })}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="flex justify-end gap-4 mt-10">
                <button
                  onClick={cancelEdit}
                  className="px-8 py-3 rounded-xl border border-orange-500/50 hover:bg-orange-500/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold hover:opacity-90 transition"
                >
                  {editing.vtype_id ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-red-500 max-w-md w-full">
              <h3 className="text-2xl font-bold text-red-400 mb-4">Confirm Delete</h3>
              <p className="text-gray-300 mb-8">
                Are you sure you want to delete this vehicle type? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-6 py-3 rounded-xl border border-orange-500/50 hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  className="px-6 py-3 rounded-xl bg-red-600 font-bold hover:bg-red-700 transition"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Input Component
function Input({ label, value = "", onChange, ...props }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-500 transition"
        {...props}
      />
    </label>
  );
}