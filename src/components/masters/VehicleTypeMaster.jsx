// src/components/VehicleTypeMaster.jsx
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

// BACKEND API
const API_BASE = "http://localhost:5000/api/vehicle-types";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function VehicleTypeMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTypes = async () => {
    setLoading(true);
    setError("");
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setError("Not logged in. Redirecting...");
      setTimeout(() => (window.location.href = "/login"), 1500);
      return;
    }

    try {
      const { data } = await axios.get(API_BASE, { headers });
      console.log("VEHICLE TYPES LOADED:", data);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg.includes("Unauthorized") ? "Session expired!" : msg);
      if (e.response?.status === 401) {
        localStorage.removeItem("user");
        setTimeout(() => (window.location.href = "/login"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      `${r.make} ${r.model} ${r.capacity_kwh} ${r.engine_specs} ${r.architecture_diagram}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const startAdd = () =>
    setEditing({
      make: "",
      model: "",
      capacity_kwh: "",
      engine_specs: "",
      wheel_loader: false,
      excavator: false,
      architecture_diagram: "",
      drawings_folder_url: "",
    });

  const startEdit = (r) => setEditing({ ...r });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing.make?.trim()) return alert("Make required!");
    if (!editing.model?.trim()) return alert("Model required!");

    try {
      if (!editing.vtype_id) {
        // CREATE
        const payload = {
          make: editing.make.trim(),
          model: editing.model.trim(),
          capacity_kwh: editing.capacity_kwh || null,
          engine_specs: editing.engine_specs || null,
          wheel_loader: editing.wheel_loader || false,
          excavator: editing.excavator || false,
          architecture_diagram: editing.architecture_diagram || null,
          drawings_folder_url: editing.drawings_folder_url || null,
        };
        const { data } = await axios.post(API_BASE, payload, { headers: getAuthHeaders() });
        setRows(prev => [{ ...payload, vtype_id: data.vtype_id }, ...prev]);
      } else {
        // UPDATE
        const payload = {
          make: editing.make.trim(),
          model: editing.model.trim(),
          capacity_kwh: editing.capacity_kwh || null,
          engine_specs: editing.engine_specs || null,
          wheel_loader: editing.wheel_loader || false,
          excavator: editing.excavator || false,
          architecture_diagram: editing.architecture_diagram || null,
          drawings_folder_url: editing.drawings_folder_url || null,
        };
        await axios.put(`${API_BASE}/${editing.vtype_id}`, payload, { headers: getAuthHeaders() });
        setRows(prev => prev.map(r => r.vtype_id === editing.vtype_id ? { ...r, ...payload } : r));
      }
      setEditing(null);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  const askDelete = (id) => setConfirmId(id);
  const doDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${confirmId}`, { headers: getAuthHeaders() });
      setRows(prev => prev.filter(r => r.vtype_id !== confirmId));
    } catch (e) {
      alert(e.response?.data?.error || "Cannot delete: used in vehicles");
    } finally {
      setConfirmId(null);
    }
  };

  const exportCsv = () => {
    const headers = "Make,Model,Capacity (kWh),Specs,Wheel Loader,Excavator,Architecture,Drawings URL\n";
    const csv = rows.map(r => [
      r.make,
      r.model,
      r.capacity_kwh || "",
      r.engine_specs || "",
      r.wheel_loader ? "Yes" : "No",
      r.excavator ? "Yes" : "No",
      r.architecture_diagram || "",
      r.drawings_folder_url || "",
    ].map(v => `"${v}"`).join(",")).join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle_types.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Vehicle Type Master
          </h1>
          <p className="text-orange-300">Configure EV models & specs</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-orange-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search types..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="px-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={startAdd} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Type
            </button>
          </div>
        </div>

        {loading && <div className="text-center py-8">Loading vehicle types...</div>}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-2xl border border-orange-500/30 overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/50">
              <tr>
                {["Make", "Model", "Battery", "Specs", "Type", "Architecture", "Drawings", "Actions"].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-orange-200 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-orange-400">No vehicle types</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.vtype_id} className="border-t border-orange-500/10 hover:bg-orange-500/5">
                    <td className="px-6 py-4 font-bold">{r.make}</td>
                    <td className="px-6 py-4">{r.model}</td>
                    <td className="px-6 py-4">{r.capacity_kwh || "-"} kWh</td>
                    <td className="px-6 py-4 text-sm">{r.engine_specs || "-"}</td>
                    <td className="px-6 py-4">
                      {r.wheel_loader && "Loader "}
                      {r.excavator && "Excavator"}
                    </td>
                    <td className="px-6 py-4 text-sm">{r.architecture_diagram || "-"}</td>
                    <td className="px-6 py-4">
                      {r.drawings_folder_url ? (
                        <a href={r.drawings_folder_url} target="_blank" className="text-orange-300 flex items-center gap-1">
                          <Link2 className="w-4 h-4" /> Open
                        </a>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => startEdit(r)} className="p-2 hover:bg-orange-500/20 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => askDelete(r.vtype_id)} className="p-2 hover:bg-red-500/20 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-3xl">
              <h2 className="text-2xl font-bold text-orange-300 mb-6">
                {editing.vtype_id ? "Edit" : "Add"} Vehicle Type
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Make *" value={editing.make} onChange={v => setEditing({...editing, make: v})} />
                <Input label="Model *" value={editing.model} onChange={v => setEditing({...editing, model: v})} />
                <Input label="Battery (kWh)" value={editing.capacity_kwh} onChange={v => setEditing({...editing, capacity_kwh: v})} />
                <TextArea label="Engine Specs" value={editing.engine_specs} onChange={v => setEditing({...editing, engine_specs: v})} />
                <div className="flex gap-4">
                  <label><input type="checkbox" checked={editing.wheel_loader} onChange={e => setEditing({...editing, wheel_loader: e.target.checked})} /> Wheel Loader</label>
                  <label><input type="checkbox" checked={editing.excavator} onChange={e => setEditing({...editing, excavator: e.target.checked})} /> Excavator</label>
                </div>
                <Input label="Architecture Diagram" value={editing.architecture_diagram} onChange={v => setEditing({...editing, architecture_diagram: v})} />
                <Input label="Drawings URL" value={editing.drawings_folder_url} onChange={v => setEditing({...editing, drawings_folder_url: v})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={cancelEdit} className="px-6 py-3 rounded-xl border border-orange-500/30 hover:bg-orange-500/10">Cancel</button>
                <button onClick={saveEdit} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold">Save</button>
              </div>
            </div>
          </div>
        )}

        {confirmId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-red-500">
              <p className="text-xl mb-6">Delete this vehicle type?</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmId(null)} className="px-6 py-3 rounded-xl border border-orange-500/30">Cancel</button>
                <button onClick={doDelete} className="px-6 py-3 rounded-xl bg-red-600 font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value = "", onChange, ...props }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-sm">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500"
        {...props}
      />
    </label>
  );
}

function TextArea({ label, value = "", onChange }) {
  return (
    <label className="block col-span-2">
      <span className="text-orange-300 text-sm">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full px-4 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500"
      />
    </label>
  );
}