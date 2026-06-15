import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  X,
} from "lucide-react";
import axios from "axios";

/* ================= BACKEND ================= */
const API_BASE = "http://localhost:5000/api/customers";

const getAuthHeaders = () => ({});


/* ================= COMPONENT ================= */
export default function CustomerMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= FETCH ================= */
  const fetchCustomers = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(API_BASE, {
        headers: getAuthHeaders(),
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  /* ================= SEARCH ================= */
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();

    return rows.filter((r) =>
      [
        r.company_name,
        r.address,
        r.contact_person,
        r.phone,
        r.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  /* ================= ADD / EDIT ================= */
  const startAdd = () =>
    setEditing({
      company_name: "",
      address: "",
      contact_person: "",
      phone: "",
      email: "",
    });

  const startEdit = (r) => setEditing({ ...r });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing.company_name?.trim())
      return alert("Company name is required");

    try {
      if (!editing.customer_id) {
        /* ===== CREATE ===== */
        const payload = {
          company_name: editing.company_name.trim(),
          address: editing.address?.trim() || null,
          contact_person: editing.contact_person?.trim() || null,
          phone: editing.phone?.trim() || null,
          email: editing.email?.trim(),
        };

        const { data } = await axios.post(API_BASE, payload, {
          headers: getAuthHeaders(),
        });

        setRows((prev) => [
          {
            ...payload,
            customer_id: data.customer_id,
          },
          ...prev,
        ]);
      } else {
        /* ===== UPDATE ===== */
        const payload = {
          company_name: editing.company_name.trim(),
          address: editing.address?.trim() || null,
          contact_person: editing.contact_person?.trim() || null,
          phone: editing.phone?.trim() || null,
        };

        await axios.put(
          `${API_BASE}/${editing.customer_id}`,
          payload,
          { headers: getAuthHeaders() }
        );

        setRows((prev) =>
          prev.map((r) =>
            r.customer_id === editing.customer_id
              ? { ...r, ...payload }
              : r
          )
        );
      }

      setEditing(null);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  /* ================= DELETE ================= */
  const askDelete = (id) => setConfirmId(id);

  const doDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/${confirmId}`, {
        headers: getAuthHeaders(),
      });
      setRows((prev) => prev.filter((r) => r.customer_id !== confirmId));
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed");
    } finally {
      setConfirmId(null);
    }
  };

  /* ================= EXPORT ================= */
  const exportCsv = () => {
    const headers = "Company,Address,Contact Person,Phone,Email\n";
    const csv = rows
      .map((r) =>
        [
          r.company_name,
          r.address || "",
          r.contact_person || "",
          r.phone || "",
          r.email || "",
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

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Customer Master Database
          </h1>
          <p className="mt-2 text-orange-200/70">
            Login is created automatically using email
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportCsv}
              className="px-5 py-3 rounded-xl border border-orange-500/30 text-orange-200 hover:bg-orange-500/10 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </button>

            <button
              onClick={startAdd}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Customer
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl border border-orange-500/30 bg-gray-800/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/50 text-orange-200">
              <tr>
                <th className="px-6 py-4 text-left">Company</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Contact Person</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-orange-500/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-orange-300/70">
                    {loading ? "Loading…" : "No customers found"}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.customer_id} className="hover:bg-orange-500/5">
                    <td className="px-6 py-4 font-semibold">{r.company_name}</td>
                    <td className="px-6 py-4">{r.address || "-"}</td>
                    <td className="px-6 py-4">{r.contact_person || "-"}</td>
                    <td className="px-6 py-4">{r.phone || "-"}</td>
                    <td className="px-6 py-4 text-orange-300">{r.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(r)}
                          className="p-2 rounded-lg bg-orange-500/20"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => askDelete(r.customer_id)}
                          className="p-2 rounded-lg bg-red-500/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MODALS */}
        {editing && (
          <Modal
            title={editing.customer_id ? "Edit Customer" : "Add Customer"}
            onClose={cancelEdit}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Company Name *" value={editing.company_name}
                onChange={(v) => setEditing({ ...editing, company_name: v })} />
              <Input label="Address" value={editing.address}
                onChange={(v) => setEditing({ ...editing, address: v })} />
              <Input label="Contact Person" value={editing.contact_person}
                onChange={(v) => setEditing({ ...editing, contact_person: v })} />
              <Input label="Phone" value={editing.phone}
                onChange={(v) => setEditing({ ...editing, phone: v })} />

              {!editing.customer_id && (
                <Input label="Email *" type="email" value={editing.email}
                  onChange={(v) => setEditing({ ...editing, email: v })} />
              )}
            </div>

            <p className="mt-4 text-xs text-orange-300/70">
              Login is created automatically using email with a default password.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={cancelEdit}
                className="px-5 py-2 border border-orange-500/30 rounded-xl">
                Cancel
              </button>
              <button onClick={saveEdit}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold">
                Save
              </button>
            </div>
          </Modal>
        )}

        {confirmId && (
          <Modal title="Delete Customer?" onClose={() => setConfirmId(null)}>
            <p className="mb-6 text-orange-200">
              This will permanently remove the customer and login.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmId(null)}
                className="px-5 py-2 border border-orange-500/30 rounded-xl">
                Cancel
              </button>
              <button onClick={doDelete}
                className="px-6 py-2 bg-red-600 rounded-xl font-bold">
                Delete
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* ================= SHARED ================= */
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-4 bg-gray-900 rounded-2xl border border-orange-500/40 p-8">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold text-orange-300">{title}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm text-orange-300">{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 rounded-xl bg-black/40 border border-orange-500/30"
      />
    </label>
  );
}
