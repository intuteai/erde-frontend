// src/components/VehicleMaster.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api/vehicles-master";

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function VehicleMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    vehicle_unique_id: "", vehicle_reg_no: "", customer_id: "", vtype_id: "", vcu_hmi_id: "",
    vehicle_type: "", vcu_make_model: "", hmi_make_model: "",
    motor_make_model: "", controller_make_model: "", battery_make_model: "",
    dc_dc_make_model: "", btms_make_model: "", hyd_cooling_yesno: "No",
    motor_controller_details: "", date_of_deployment: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_BASE, { headers: getAuthHeaders() });
      setRows(data);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(r => Object.values(r).join(" ").toLowerCase().includes(q));
  }, [rows, query]);

  const openNew = () => {
    setEditing(null);
    setForm({
      vehicle_unique_id: `VEH-${new Date().getFullYear().toString().slice(2)}-${String(rows.length + 1).padStart(4, '0')}`,
      vehicle_reg_no: "", customer_id: "1", vtype_id: "", vcu_hmi_id: "",
      vehicle_type: "Wheel Loader", vcu_make_model: "", hmi_make_model: "",
      motor_make_model: "", controller_make_model: "", battery_make_model: "",
      dc_dc_make_model: "", btms_make_model: "", hyd_cooling_yesno: "No",
      motor_controller_details: "", date_of_deployment: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      vehicle_unique_id: r.vehicle_unique_id,
      vehicle_reg_no: r.vehicle_reg_no || "",
      customer_id: r.customer_id?.toString() || "",
      vtype_id: r.vtype_id?.toString() || "",
      vcu_hmi_id: r.vcu_hmi_id?.toString() || "",
      vehicle_type: r.vehicle_type || "",
      vcu_make_model: r.vcu_make_model || "",
      hmi_make_model: r.hmi_make_model || "",
      motor_make_model: r.motor_make_model || "",
      controller_make_model: r.controller_make_model || "",
      battery_make_model: r.battery_make_model || "",
      dc_dc_make_model: r.dc_dc_make_model || "",
      btms_make_model: r.btms_make_model || "",
      hyd_cooling_yesno: r.hyd_cooling_yesno ? "Yes" : "No",
      motor_controller_details: r.motor_controller_details || "",
      date_of_deployment: r.date_of_deployment || ""
    });
    setShowModal(true);
  };

  const saveForm = async () => {
    if (!form.vehicle_unique_id || !form.customer_id || !form.vtype_id) {
      alert("ID, Customer, Type required!");
      return;
    }

    const payload = {
      vehicle_unique_id: form.vehicle_unique_id,
      customer_id: parseInt(form.customer_id),
      vtype_id: parseInt(form.vtype_id),
      vcu_hmi_id: form.vcu_hmi_id ? parseInt(form.vcu_hmi_id) : null,
      vehicle_reg_no: form.vehicle_reg_no || null,
      vehicle_type: form.vehicle_type || null,
      vcu_make_model: form.vcu_make_model || null,
      hmi_make_model: form.hmi_make_model || null,
      motor_make_model: form.motor_make_model || null,
      controller_make_model: form.controller_make_model || null,
      battery_make_model: form.battery_make_model || null,
      dc_dc_make_model: form.dc_dc_make_model || null,
      btms_make_model: form.btms_make_model || null,
      hyd_cooling_yesno: form.hyd_cooling_yesno === "Yes",
      motor_controller_details: form.motor_controller_details || null,
      date_of_deployment: form.date_of_deployment || null,
    };

    try {
      if (!editing) {
        await axios.post(API_BASE, payload, { headers: getAuthHeaders() });
      } else {
        await axios.put(`${API_BASE}/${editing.vehicle_master_id}`, payload, { headers: getAuthHeaders() });
      }
      await fetchVehicles();
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  const removeRow = async (id) => {
    if (!confirm("Delete vehicle?")) return;
    try {
      await axios.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
      await fetchVehicles();
    } catch (e) {
      alert(e.response?.data?.error);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Unique ID", "Reg No", "Customer", "Type", "VCU", "HMI", "Motor", "Controller",
      "Battery", "DC/DC", "BTMS", "Hyd Cooling", "Cooler Details", "Deployed"
    ];
    const csv = [headers.join(","), ...rows.map(r => [
      r.vehicle_unique_id, r.vehicle_reg_no || "", r.company_name || "",
      `${r.make} ${r.model}`, r.vcu_make || "", r.hmi_make || "",
      r.motor_make_model || "", r.controller_make_model || "",
      r.battery_make_model || "", r.dc_dc_make_model || "",
      r.btms_make_model || "", r.hyd_cooling_yesno ? "Yes" : "No",
      r.motor_controller_details || "", r.date_of_deployment || ""
    ].map(v => `"${v}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "fleet_master.csv"; a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-6 py-8">
      <div className="max-w-full mx-auto space-y-6">

        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Vehicle Master Database
          </h1>
          <p className="text-orange-300">Full EV configuration registry</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-orange-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search fleet..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export All
            </button>
            <button onClick={openNew} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Vehicle
            </button>
          </div>
        </div>

        {loading && <div className="text-center py-8">Loading fleet...</div>}
        {error && <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5" />{error}</div>}

        <div className="bg-gray-800/50 rounded-2xl border border-orange-500/30 overflow-x-auto">
          <table className="w-full min-w-[2000px] text-sm">
            <thead className="bg-black/50">
              <tr>
                {["Unique ID", "Reg No", "Customer", "Type", "VCU", "HMI", "Motor", "Controller", "Battery", "DC/DC", "BTMS", "Hyd", "Cooler", "Deployed", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-orange-200 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.vehicle_master_id} className="border-t border-orange-500/10 hover:bg-orange-500/5">
                  <td className="px-4 py-3 font-mono text-xs">{r.vehicle_unique_id}</td>
                  <td className="px-4 py-3 font-bold">{r.vehicle_reg_no}</td>
                  <td className="px-4 py-3">{r.company_name}</td>
                  <td className="px-4 py-3">{r.make} {r.model}</td>
                  <td className="px-4 py-3 text-xs">{r.vcu_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.hmi_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.motor_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.controller_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.battery_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.dc_dc_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.btms_make_model || "-"}</td>
                  <td className="px-4 py-3">{r.hyd_cooling_yesno ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" title={r.motor_controller_details}>{r.motor_controller_details || "-"}</td>
                  <td className="px-4 py-3">{r.date_of_deployment}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(r)} className="p-2 hover:bg-orange-500/20 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => removeRow(r.vehicle_master_id)} className="p-2 hover:bg-red-500/20 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={15} className="text-center py-16 text-orange-400">No vehicles found</td></tr>}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-6xl my-8">
              <h2 className="text-2xl font-bold text-orange-300 mb-6">{editing ? "Edit" : "Add"} Vehicle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Input label="Unique ID *" value={form.vehicle_unique_id} onChange={v => setForm({...form, vehicle_unique_id: v})} />
                <Input label="Reg No" value={form.vehicle_reg_no} onChange={v => setForm({...form, vehicle_reg_no: v})} />
                <Input label="Customer ID" value={form.customer_id} onChange={v => setForm({...form, customer_id: v})} />
                <Input label="Type ID" value={form.vtype_id} onChange={v => setForm({...form, vtype_id: v})} />
                <Input label="VCU/HMI ID" value={form.vcu_hmi_id} onChange={v => setForm({...form, vcu_hmi_id: v})} />
                <Input label="VCU Make+Model" value={form.vcu_make_model} onChange={v => setForm({...form, vcu_make_model: v})} />
                <Input label="HMI Make+Model" value={form.hmi_make_model} onChange={v => setForm({...form, hmi_make_model: v})} />
                <Input label="Motor" value={form.motor_make_model} onChange={v => setForm({...form, motor_make_model: v})} />
                <Input label="Controller" value={form.controller_make_model} onChange={v => setForm({...form, controller_make_model: v})} />
                <Input label="Battery" value={form.battery_make_model} onChange={v => setForm({...form, battery_make_model: v})} />
                <Input label="DC/DC" value={form.dc_dc_make_model} onChange={v => setForm({...form, dc_dc_make_model: v})} />
                <Input label="BTMS" value={form.btms_make_model} onChange={v => setForm({...form, btms_make_model: v})} />
                <Select label="Hyd Cooling" value={form.hyd_cooling_yesno} onChange={v => setForm({...form, hyd_cooling_yesno: v})} options={["Yes", "No"]} />
                <TextArea label="Cooler Details" value={form.motor_controller_details} onChange={v => setForm({...form, motor_controller_details: v})} />
                <Input label="Deployment" type="date" value={form.date_of_deployment} onChange={v => setForm({...form, date_of_deployment: v})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-orange-500/30 hover:bg-orange-500/10">Cancel</button>
                <button onClick={saveForm} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold">Save Vehicle</button>
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
      <span className="text-orange-300 text-xs">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm"
        {...props} />
    </label>
  );
}

function TextArea({ label, value = "", onChange }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-xs">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm" />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-xs">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}