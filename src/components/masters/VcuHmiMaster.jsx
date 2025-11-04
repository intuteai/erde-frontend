// src/components/VcuHmiMaster.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import axios from "axios";

// BACKEND API
const API_BASE = "http://localhost:5000/api/vcu-hmi";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function VcuHmiMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    vcu_make: "", vcu_model: "", vcu_specs: "",
    hmi_make: "", hmi_model: "", hmi_specs: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setError("Not logged in. Redirecting...");
      setTimeout(() => (window.location.href = "/login"), 1500);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(API_BASE, { headers });
      console.log("VCU/HMI LOADED:", data);
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
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(r =>
      `${r.vcu_make} ${r.vcu_model} ${r.hmi_make} ${r.hmi_model}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const openNew = () => {
    setEditing(null);
    setForm({ vcu_make: "", vcu_model: "", vcu_specs: "", hmi_make: "", hmi_model: "", hmi_specs: "" });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      vcu_make: r.vcu_make || "",
      vcu_model: r.vcu_model || "",
      vcu_specs: r.vcu_specs || "",
      hmi_make: r.hmi_make || "",
      hmi_model: r.hmi_model || "",
      hmi_specs: r.hmi_specs || ""
    });
    setShowModal(true);
  };

  const saveForm = async () => {
    if (!form.vcu_make?.trim() || !form.vcu_model?.trim()) {
      alert("VCU Make and Model required!");
      return;
    }

    try {
      if (!editing) {
        // CREATE
        const payload = {
          vcu_make: form.vcu_make.trim(),
          vcu_model: form.vcu_model.trim(),
          vcu_specs: form.vcu_specs?.trim() || null,
          hmi_make: form.hmi_make?.trim() || null,
          hmi_model: form.hmi_model?.trim() || null,
          hmi_specs: form.hmi_specs?.trim() || null,
        };
        const { data } = await axios.post(API_BASE, payload, { headers: getAuthHeaders() });
        setRows(prev => [{ ...payload, vcu_hmi_id: data.vcu_hmi_id }, ...prev]);
      } else {
        // UPDATE
        const payload = {
          vcu_make: form.vcu_make.trim(),
          vcu_model: form.vcu_model.trim(),
          vcu_specs: form.vcu_specs?.trim() || null,
          hmi_make: form.hmi_make?.trim() || null,
          hmi_model: form.hmi_model?.trim() || null,
          hmi_specs: form.hmi_specs?.trim() || null,
        };
        await axios.put(`${API_BASE}/${editing.vcu_hmi_id}`, payload, { headers: getAuthHeaders() });
        setRows(prev => prev.map(r => r.vcu_hmi_id === editing.vcu_hmi_id ? { ...r, ...payload } : r));
      }
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  const removeRow = async (id) => {
    if (!confirm("Delete this VCU/HMI config?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
      setRows(prev => prev.filter(r => r.vcu_hmi_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || "Cannot delete: used in vehicles");
    }
  };

  const exportCSV = () => {
    const headers = "VCU Make,VCU Model,VCU Specs,HMI Make,HMI Model,HMI Specs\n";
    const csv = rows.map(r => [
      r.vcu_make, r.vcu_model, r.vcu_specs || "",
      r.hmi_make || "", r.hmi_model || "", r.hmi_specs || ""
    ].map(v => `"${v}"`).join(",")).join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vcu_hmi_master.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            VCU / HMI Master
          </h1>
          <p className="text-orange-300">Configure vehicle brains & displays</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-orange-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search VCU/HMI..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={openNew} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Config
            </button>
          </div>
        </div>

        {loading && <div className="text-center py-8">Loading VCU/HMI...</div>}
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
                {["VCU Make", "VCU Model", "VCU Specs", "HMI Make", "HMI Model", "HMI Specs", "Actions"].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-orange-200 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-orange-400">No configs found</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.vcu_hmi_id} className="border-t border-orange-500/10 hover:bg-orange-500/5">
                    <td className="px-6 py-4 font-bold">{r.vcu_make}</td>
                    <td className="px-6 py-4">{r.vcu_model}</td>
                    <td className="px-6 py-4 text-sm">{r.vcu_specs || "-"}</td>
                    <td className="px-6 py-4">{r.hmi_make || "-"}</td>
                    <td className="px-6 py-4">{r.hmi_model || "-"}</td>
                    <td className="px-6 py-4 text-sm">{r.hmi_specs || "-"}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(r)} className="p-2 hover:bg-orange-500/20 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => removeRow(r.vcu_hmi_id)} className="p-2 hover:bg-red-500/20 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-3xl">
              <h2 className="text-2xl font-bold text-orange-300 mb-6">
                {editing ? "Edit" : "Add"} VCU/HMI
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="VCU Make *" value={form.vcu_make} onChange={v => setForm({...form, vcu_make: v})} />
                <Input label="VCU Model *" value={form.vcu_model} onChange={v => setForm({...form, vcu_model: v})} />
                <TextArea label="VCU Specs" value={form.vcu_specs} onChange={v => setForm({...form, vcu_specs: v})} />
                <Input label="HMI Make" value={form.hmi_make} onChange={v => setForm({...form, hmi_make: v})} />
                <Input label="HMI Model" value={form.hmi_model} onChange={v => setForm({...form, hmi_model: v})} />
                <TextArea label="HMI Specs" value={form.hmi_specs} onChange={v => setForm({...form, hmi_specs: v})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-orange-500/30 hover:bg-orange-500/10">Cancel</button>
                <button onClick={saveForm} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold">Save</button>
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