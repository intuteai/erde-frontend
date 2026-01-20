import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import axios from "axios";

/* ===================== API ===================== */
const API_BASE = "http://localhost:5000/api/vcu";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function VCUMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    vcu_make: "",
    vcu_model: "",
    serial_number: "",
    vcu_specs: "",
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
      setError(e.response?.data?.error || "Failed to load VCUs");
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
      `${r.vcu_make} ${r.vcu_model} ${r.serial_number}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  /* ===================== MODAL ===================== */
  const openNew = () => {
    setEditing(null);
    setForm({
      vcu_make: "",
      vcu_model: "",
      serial_number: "",
      vcu_specs: "",
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      vcu_make: r.vcu_make || "",
      vcu_model: r.vcu_model || "",
      serial_number: r.serial_number?.toUpperCase() || "", // Ensure uppercase on load
      vcu_specs: r.vcu_specs || "",
    });
    setShowModal(true);
  };

  /* ===================== SAVE ===================== */
  const saveForm = async () => {
    if (!form.vcu_make.trim() || !form.vcu_model.trim()) {
      return alert("VCU Make and Model are required");
    }
    if (!form.serial_number.trim()) {
      return alert("Serial number is required");
    }

    const payload = {
      vcu_make: form.vcu_make.trim().toUpperCase(),
      vcu_model: form.vcu_model.trim(),
      serial_number: form.serial_number.trim().toUpperCase(),
      vcu_specs: form.vcu_specs?.trim() || null,
    };

    try {
      if (!editing) {
        // CREATE
        const { data } = await axios.post(API_BASE, payload, {
          headers: getAuthHeaders(),
        });
        setRows((prev) => [
          { ...payload, vcu_id: data.vcu_id },
          ...prev,
        ]);
      } else {
        // UPDATE
        await axios.put(`${API_BASE}/${editing.vcu_id}`, payload, {
          headers: getAuthHeaders(),
        });
        setRows((prev) =>
          prev.map((r) =>
            r.vcu_id === editing.vcu_id ? { ...r, ...payload } : r
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
    if (!confirm("Delete this VCU?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: getAuthHeaders(),
      });
      setRows((prev) => prev.filter((r) => r.vcu_id !== id));
    } catch (e) {
      alert(e.response?.data?.error || "Cannot delete VCU");
    }
  };

  /* ===================== CSV ===================== */
  const exportCSV = () => {
    const headers = "VCU Make,VCU Model,Serial Number,VCU Specs\n";
    const csv = rows
      .map((r) =>
        [
          r.vcu_make,
          r.vcu_model,
          r.serial_number,
          r.vcu_specs || "",
        ]
          .map((v) => `"${v}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vcu_master.csv";
    a.click();
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            VCU Master
          </h1>
          <p className="text-orange-300">Physical Vehicle Control Units</p>
        </div>

        {/* Toolbar */}
        <div className="flex gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by make, model, or serial..."
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
            <Plus className="w-5 h-5" /> Add VCU
          </button>
        </div>

        {loading && <div className="text-center py-8">Loading VCUs…</div>}
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
                {["Make", "Model", "Serial Number", "Specs", "Actions"].map((h) => (
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
                    No VCUs found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.vcu_id} className="border-t border-orange-500/10">
                    <td className="px-6 py-4 font-bold">{r.vcu_make}</td>
                    <td className="px-6 py-4">{r.vcu_model}</td>
                    <td className="px-6 py-4 font-mono text-sm uppercase">
                      {r.serial_number}
                    </td>
                    <td className="px-6 py-4 text-sm">{r.vcu_specs || "-"}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-2 hover:bg-orange-500/20 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeRow(r.vcu_id)}
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
                {editing ? "Edit" : "Add"} VCU
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="VCU Make *"
                  value={form.vcu_make}
                  onChange={(v) =>
                    setForm({ ...form, vcu_make: v.toUpperCase() })
                  }
                  className="uppercase tracking-wide"
                />
                <Input
                  label="VCU Model *"
                  value={form.vcu_model}
                  onChange={(v) => setForm({ ...form, vcu_model: v })}
                />
                <Input
                  label="Serial Number *"
                  value={form.serial_number}
                  onChange={(v) => {
                    // Allow A-Z, 0-9 and safe special characters: - _ . / :
                    const cleaned = v
                      .replace(/[^A-Z0-9\-_.:/]/gi, "")
                      .toUpperCase();

                    setForm({ ...form, serial_number: cleaned });
                  }}
                  className="uppercase font-mono tracking-wide"
                  placeholder="e.g. VCU-01/2025.A"
                />
                <TextArea
                  label="VCU Specs"
                  value={form.vcu_specs}
                  onChange={(v) => setForm({ ...form, vcu_specs: v })}
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