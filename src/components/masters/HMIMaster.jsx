import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

// API Base URLs
const API_BASE = "http://localhost:5000/api/hmi";

const getAuthHeaders = () => ({});

export default function HMIMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    hmi_make: "",
    hmi_model: "",
    imei_number: "",
    hmi_specs: "",
  });

  /* ===================== FETCH ===================== */
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(API_BASE, {
        headers: getAuthHeaders(),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load HMIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ===================== SEARCH ===================== */
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      `${r.hmi_make} ${r.hmi_model} ${r.imei_number}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  /* ===================== MODAL ===================== */
  const openNew = () => {
    setEditing(null);
    setForm({
      hmi_make: "",
      hmi_model: "",
      imei_number: "",
      hmi_specs: "",
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      hmi_make: r.hmi_make || "",
      hmi_model: r.hmi_model || "",
      imei_number: r.imei_number || "",
      hmi_specs: r.hmi_specs || "",
    });
    setShowModal(true);
  };

  /* ===================== SAVE ===================== */
  const saveForm = async () => {
    if (!form.hmi_make.trim() || !form.hmi_model.trim()) {
      return alert("HMI Make and Model are required");
    }
    if (!form.imei_number.trim()) {
      return alert("IMEI number is required");
    }

    const payload = {
      hmi_make: form.hmi_make.trim().toUpperCase(),      // final safety
      hmi_model: form.hmi_model.trim(),
      imei_number: form.imei_number.trim(),
      hmi_specs: form.hmi_specs?.trim() || null,
    };

    try {
      if (!editing) {
        // CREATE
        const { data } = await axios.post(API_BASE, payload, {
          headers: getAuthHeaders(),
        });
        setRows((prev) => [
          { ...payload, hmi_id: data.hmi_id },
          ...prev,
        ]);
      } else {
        // UPDATE
        await axios.put(`${API_BASE}/${editing.hmi_id}`, payload, {
          headers: getAuthHeaders(),
        });
        setRows((prev) =>
          prev.map((r) =>
            r.hmi_id === editing.hmi_id ? { ...r, ...payload } : r
          )
        );
      }
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  /* ===================== DELETE ===================== */
  const removeRow = async (id) => {
    if (!confirm("Delete this HMI?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: getAuthHeaders(),
      });
      setRows((prev) => prev.filter((r) => r.hmi_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || "Cannot delete HMI (likely in use)");
    }
  };

  /* ===================== CSV EXPORT ===================== */
  const exportCSV = () => {
    const headers = "HMI Make,HMI Model,IMEI Number,HMI Specs\n";
    const csv = rows
      .map((r) =>
        [
          r.hmi_make,
          r.hmi_model,
          r.imei_number,
          r.hmi_specs || "",
        ]
          .map((v) => `"${v}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hmi_master.csv";
    a.click();
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            HMI Master
          </h1>
          <p className="text-orange-300">Human–Machine Interfaces (IMEI Tracked)</p>
        </div>

        {/* Toolbar */}
        <div className="flex gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by make, model, or IMEI..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30"
            />
          </div>
          <button
            onClick={exportCSV}
            className="px-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 flex gap-2"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={openNew}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex gap-2"
          >
            <Plus className="w-5 h-5" /> Add HMI
          </button>
        </div>

        {loading && <div className="text-center py-8">Loading HMIs…</div>}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl flex gap-2">
            <AlertCircle /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800/50 rounded-2xl border border-orange-500/30 overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/50">
              <tr>
                {["Make", "Model", "IMEI Number", "Specs", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-orange-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-orange-400">
                    No HMIs found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.hmi_id} className="border-t border-orange-500/10">
                    <td className="px-6 py-4 font-bold">{r.hmi_make}</td>
                    <td className="px-6 py-4">{r.hmi_model}</td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {r.imei_number}
                    </td>
                    <td className="px-6 py-4 text-sm">{r.hmi_specs || "-"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 hover:bg-orange-500/20 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeRow(r.hmi_id)}
                        className="p-2 hover:bg-red-500/20 rounded ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-3xl">
              <h2 className="text-2xl font-bold text-orange-300 mb-6">
                {editing ? "Edit" : "Add"} HMI
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="HMI Make *"
                  value={form.hmi_make}
                  onChange={(v) =>
                    setForm({ ...form, hmi_make: v.toUpperCase() })
                  }
                  className="uppercase tracking-wide"
                />
                <Input
                  label="HMI Model *"
                  value={form.hmi_model}
                  onChange={(v) => setForm({ ...form, hmi_model: v })}
                />
                <Input
                  label="IMEI Number *"
                  value={form.imei_number}
                  onChange={(v) => setForm({ ...form, imei_number: v })}
                />
                <TextArea
                  label="HMI Specs"
                  value={form.hmi_specs}
                  onChange={(v) => setForm({ ...form, hmi_specs: v })}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl border border-orange-500/30"
                >
                  Cancel
                </button>
                <button
                  onClick={saveForm}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== Reusable Components ===================== */
function Input({ label, value, onChange, className = "", ...props }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-sm">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full px-4 py-2 rounded-lg bg-gray-800 border border-orange-500/30 text-white ${className}`}
        {...props}
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block col-span-2">
      <span className="text-orange-300 text-sm">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full px-4 py-2 rounded-lg bg-gray-800 border border-orange-500/30 text-white"
      />
    </label>
  );
}