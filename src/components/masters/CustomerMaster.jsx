// src/components/CustomerMaster.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  AlertCircle,
} from "lucide-react";
import axios from "axios";

// BACKEND URL
const API_BASE = "http://localhost:5000/api/customers";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function CustomerMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomers = async () => {
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
      console.log("SHAKTI LOADED:", data);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg.includes("Unauthorized") ? "Session expired. Logging out..." : msg);
      if (e.response?.status === 401) {
        localStorage.removeItem("user");
        setTimeout(() => (window.location.href = "/login"), 2000);
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // SEARCH
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      [
        r.company_name,
        r.address,
        r.contact_person,
        r.phone,
        r.invoicing_details,
        r.email,
        r.user_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  // ADD / EDIT
  const startAdd = () =>
    setEditing({
      company_name: "",
      address: "",
      contact_person: "",
      phone: "",
      invoicing_details: "",
      email: "",
      password: "",
      name: "",
    });

  const startEdit = (r) => setEditing({ ...r });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing.company_name?.trim()) return alert("Company name required!");

    try {
      if (!editing.customer_id) {
        // CREATE
        const payload = {
          company_name: editing.company_name.trim(),
          address: editing.address?.trim() || null,
          contact_person: editing.contact_person?.trim() || null,
          phone: editing.phone?.trim() || null,
          invoicing_details: editing.invoicing_details?.trim() || null,
          email: editing.email?.trim(),
          password: editing.password,
          name: editing.name?.trim() || editing.company_name.trim(),
        };
        const { data } = await axios.post(API_BASE, payload, { headers: getAuthHeaders() });
        const newRow = {
          ...payload,
          customer_id: data.customer_id,
          user_name: payload.name,
          email: payload.email,
          created_at: new Date().toISOString(),
        };
        setRows((prev) => [newRow, ...prev]);
      } else {
        // UPDATE
        const payload = {
          company_name: editing.company_name.trim(),
          address: editing.address?.trim() || null,
          contact_person: editing.contact_person?.trim() || null,
          phone: editing.phone?.trim() || null,
          invoicing_details: editing.invoicing_details?.trim() || null,
        };
        await axios.put(`${API_BASE}/${editing.customer_id}`, payload, { headers: getAuthHeaders() });
        setRows((prev) =>
          prev.map((r) =>
            r.customer_id === editing.customer_id
              ? { ...r, ...payload, updated_at: new Date().toISOString() }
              : r
          )
        );
      }
      setEditing(null);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  // DELETE
  const askDelete = (id) => setConfirmId(id);
  const doDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${confirmId}`, { headers: getAuthHeaders() });
      setRows((prev) => prev.filter((r) => r.customer_id !== confirmId));
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed");
    } finally {
      setConfirmId(null);
    }
  };

  // EXPORT CSV
  const exportCsv = () => {
    const headers = "Company,Address,Contact,Phone,Invoicing,Email,Name\n";
    const csv = rows
      .map((r) =>
        [
          r.company_name,
          r.address || "",
          r.contact_person || "",
          r.phone || "",
          r.invoicing_details || "",
          r.email || "",
          r.user_name || "",
        ]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent">
            Customer Master Database
          </h1>
          <p className="mt-2 text-orange-200/70">Manage all your clients</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCsv}
              className="px-5 py-3 rounded-xl border border-orange-500/30 text-orange-200 hover:bg-orange-500/10 flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={startAdd}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex items-center gap-2 shadow-lg hover:shadow-orange-500/50 transition"
            >
              <Plus className="w-5 h-5" /> Add Customer
            </button>
          </div>
        </div>

        {/* Status */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 text-orange-300">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border-2 border-orange-500/30 bg-gray-800/50 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/50 text-orange-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Company</th>
                  <th className="px-6 py-4 text-left">Address</th>
                  <th className="px-6 py-4 text-left">Contact</th>
                  <th className="px-6 py-4 text-left">Phone</th>
                  <th className="px-6 py-4 text-left">Invoicing</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-500/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-orange-300/70 text-lg">
                      {loading ? "" : "No customers found"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.customer_id} className="hover:bg-orange-500/5 transition">
                      <td className="px-6 py-4 font-semibold text-orange-100">
                        {r.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm">{r.address || "-"}</td>
                      <td className="px-6 py-4">{r.contact_person || "-"}</td>
                      <td className="px-6 py-4">{r.phone || "-"}</td>
                      <td className="px-6 py-4 text-xs text-orange-200/80">
                        {r.invoicing_details || "-"}
                      </td>
                      <td className="px-6 py-4 text-orange-300 font-medium">
                        {r.email || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(r)}
                            className="p-2.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/40 text-orange-200 transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => askDelete(r.customer_id)}
                            className="p-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 transition"
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

        {/* Edit Modal */}
        {editing && (
          <Modal title={editing.customer_id ? "Edit Customer" : "Add Customer"} onClose={cancelEdit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Company Name *" value={editing.company_name} onChange={(v) => setEditing({ ...editing, company_name: v })} />
              <Input label="Address" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} />
              <Input label="Contact Person" value={editing.contact_person} onChange={(v) => setEditing({ ...editing, contact_person: v })} />
              <Input label="Phone" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Input label="Invoicing Details" value={editing.invoicing_details} onChange={(v) => setEditing({ ...editing, invoicing_details: v })} />
              {!editing.customer_id && (
                <>
                  <Input label="Email *" type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
                  <Input label="Password *" type="password" value={editing.password} onChange={(v) => setEditing({ ...editing, password: v })} />
                  <Input label="Contact Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={cancelEdit} className="px-6 py-3 rounded-xl border border-orange-500/30 text-orange-200 hover:bg-orange-500/10">
                Cancel
              </button>
              <button onClick={saveEdit} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                Save
              </button>
            </div>
          </Modal>
        )}

        {/* Delete Confirm */}
        {confirmId && (
          <Modal title="Delete Customer?" onClose={() => setConfirmId(null)}>
            <p className="text-orange-200 mb-6">
              This will <strong>permanently delete</strong> the customer and their login.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmId(null)} className="px-6 py-3 rounded-xl border border-orange-500/30 text-orange-200 hover:bg-orange-500/10">
                Cancel
              </button>
              <button onClick={doDelete} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
                Delete Forever
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// MODAL
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-gray-900 to-black rounded-2xl border-2 border-orange-500/40 shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-orange-300">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// INPUT
function Input({ label, value = "", onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-orange-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
        placeholder={label}
      />
    </label>
  );
}