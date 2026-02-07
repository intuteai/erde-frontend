import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import axios from "axios";

// API Base URLs
const API_BASE = "http://localhost:5000/api";
const VEHICLE_API = `${API_BASE}/vehicle-master`;
const CUSTOMERS_API = `${API_BASE}/customers`;
const VTYPES_API = `${API_BASE}/vehicle-types`;
const VCU_API = `${API_BASE}/vcu`;
const HMI_API = `${API_BASE}/hmi`;

// Date formatter
const formatDate = (d) => {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// Get Auth Headers
const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export default function VehicleMaster() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [customers, setCustomers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vcus, setVcus] = useState([]);
  const [hmis, setHmis] = useState([]);

  // Selected VCU / HMI snapshot
  const [selectedVcu, setSelectedVcu] = useState(null);
  const [selectedHmi, setSelectedHmi] = useState(null);

  // Search inputs
  const [vcuSearch, setVcuSearch] = useState("");
  const [hmiSearch, setHmiSearch] = useState("");
  const [showVcuList, setShowVcuList] = useState(false);
  const [showHmiList, setShowHmiList] = useState(false);

  // Unassign flags
  const [vcuUnassigned, setVcuUnassigned] = useState(false);
  const [hmiUnassigned, setHmiUnassigned] = useState(false);

  const [form, setForm] = useState({
    vehicle_unique_id: "",
    vehicle_reg_no: "",
    customer_id: "",
    vtype_id: "",
    vcu_id: "",
    hmi_id: "",
    vcu_make_model: "",
    hmi_make_model: "",
    motor_unique_id: "",
    motor_make_model: "",
    controller_unique_id: "",
    controller_make_model: "",
    battery_unique_id: "",
    battery_make_model: "",
    dc_dc_make_model: "",
    btms_make_model: "",
    hyd_cooling_yesno: "No",
    compressor_yesno: "No",
    motor_cooling_yesno: "No",
    motor_controller_details: "",
    compressor_details: "",
    motor_cooling_details: "",
    date_of_deployment: new Date().toISOString().split("T")[0],
  });

  // Fetch dropdown data
  const fetchDropdowns = async () => {
    try {
      const [custRes, vtypeRes, vcuRes, hmiRes] = await Promise.all([
        axios.get(CUSTOMERS_API, { headers: getAuthHeaders() }),
        axios.get(VTYPES_API, { headers: getAuthHeaders() }),
        axios.get(VCU_API, { headers: getAuthHeaders() }),
        axios.get(HMI_API, { headers: getAuthHeaders() }),
      ]);
      setCustomers(custRes.data || []);
      setVehicleTypes(vtypeRes.data || []);
      setVcus(vcuRes.data || []);
      setHmis(hmiRes.data || []);
    } catch (err) {
      console.error("Failed to load dropdowns", err);
      setError("Failed to load reference data");
    }
  };

  // Fetch vehicles
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(VEHICLE_API, {
        headers: getAuthHeaders(),
      });
      setRows(data || []);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchDropdowns();
  }, []);

  // Sync selected VCU
  useEffect(() => {
    if (!vcus.length) return;

    if (!form.vcu_id && vcuUnassigned) {
      setSelectedVcu(null);
      setVcuSearch("");
      setVcuUnassigned(false);
      return;
    }

    if (!form.vcu_id) return;

    if (selectedVcu?.vcu_id === Number(form.vcu_id)) return;

    const vcu = vcus.find((v) => v.vcu_id === Number(form.vcu_id));
    if (!vcu) return;

    setSelectedVcu(vcu);
    setVcuSearch(vcu.serial_number || "");
  }, [form.vcu_id, vcus, selectedVcu, vcuUnassigned]);

  // Sync selected HMI
  useEffect(() => {
    if (!hmis.length) return;

    if (!form.hmi_id && hmiUnassigned) {
      setSelectedHmi(null);
      setHmiSearch("");
      setHmiUnassigned(false);
      return;
    }

    if (!form.hmi_id) return;

    if (selectedHmi?.hmi_id === Number(form.hmi_id)) return;

    const hmi = hmis.find((h) => h.hmi_id === Number(form.hmi_id));
    if (!hmi) return;

    setSelectedHmi(hmi);
    setHmiSearch(hmi.imei_number || "");
  }, [form.hmi_id, hmis, selectedHmi, hmiUnassigned]);

  // VCU make+model snapshot
  useEffect(() => {
    // Explicit unassign → clear snapshot
    if (!form.vcu_id && vcuUnassigned) {
      setForm((prev) => ({ ...prev, vcu_make_model: "" }));
      return;
    }

    // Edit mode + same VCU → restore original snapshot
    if (editing && Number(form.vcu_id) === Number(editing.vcu_id)) {
      setForm((prev) => ({
        ...prev,
        vcu_make_model: editing.vcu_make_model || "",
      }));
      return;
    }

    // New selection or changed VCU → derive from master
    if (!form.vcu_id) return;

    const vcu = vcus.find((v) => v.vcu_id === Number(form.vcu_id));
    if (!vcu) return;

    setForm((prev) => ({
      ...prev,
      vcu_make_model: `${vcu.vcu_make || ""} ${vcu.vcu_model || ""}`.trim(),
    }));
  }, [form.vcu_id, vcus, editing, vcuUnassigned]);

  // HMI make+model snapshot
  useEffect(() => {
    // Explicit unassign → clear snapshot
    if (!form.hmi_id && hmiUnassigned) {
      setForm((prev) => ({ ...prev, hmi_make_model: "" }));
      return;
    }

    // Edit mode + same HMI → restore original snapshot
    if (editing && Number(form.hmi_id) === Number(editing.hmi_id)) {
      setForm((prev) => ({
        ...prev,
        hmi_make_model: editing.hmi_make_model || "",
      }));
      return;
    }

    // New selection or changed HMI → derive from master
    if (!form.hmi_id) return;

    const hmi = hmis.find((h) => h.hmi_id === Number(form.hmi_id));
    if (!hmi) return;

    setForm((prev) => ({
      ...prev,
      hmi_make_model: `${hmi.hmi_make || ""} ${hmi.hmi_model || ""}`.trim(),
    }));
  }, [form.hmi_id, hmis, editing, hmiUnassigned]);

  // Search filter for table
  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).join(" ").toLowerCase().includes(q)
    );
  }, [rows, query]);

  // Open new vehicle modal
  const openNew = () => {
    setEditing(null);
    setSelectedVcu(null);
    setSelectedHmi(null);
    setVcuSearch("");
    setHmiSearch("");
    setVcuUnassigned(false);
    setHmiUnassigned(false);

    const year = new Date().getFullYear().toString().slice(2);
    const nextNum = String(rows.length + 1).padStart(4, "0");

    setForm({
      vehicle_unique_id: `ERDE-${year}-${nextNum}`,
      vehicle_reg_no: "",
      customer_id: "",
      vtype_id: "",
      vcu_id: "",
      hmi_id: "",
      vcu_make_model: "",
      hmi_make_model: "",
      motor_unique_id: "",
      motor_make_model: "",
      controller_unique_id: "",
      controller_make_model: "",
      battery_unique_id: "",
      battery_make_model: "",
      dc_dc_make_model: "",
      btms_make_model: "",
      hyd_cooling_yesno: "No",
      compressor_yesno: "No",
      motor_cooling_yesno: "No",
      motor_controller_details: "",
      compressor_details: "",
      motor_cooling_details: "",
      date_of_deployment: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (r) => {
    setEditing(r);

    const vcu = vcus.find((v) => v.vcu_id === r.vcu_id);
    const hmi = hmis.find((h) => h.hmi_id === r.hmi_id);

    setSelectedVcu(vcu || null);
    setSelectedHmi(hmi || null);

    setVcuSearch(vcu?.serial_number || "");
    setHmiSearch(hmi?.imei_number || "");

    setVcuUnassigned(false);
    setHmiUnassigned(false);

    setForm({
      vehicle_unique_id: r.vehicle_unique_id,
      vehicle_reg_no: r.vehicle_reg_no || "",
      customer_id: r.customer_id?.toString() || "",
      vtype_id: r.vtype_id?.toString() || "",
      vcu_id: r.vcu_id?.toString() || "",
      hmi_id: r.hmi_id?.toString() || "",
      vcu_make_model: r.vcu_make_model || "",
      hmi_make_model: r.hmi_make_model || "",
      motor_unique_id: r.motor_unique_id || "",
      motor_make_model: r.motor_make_model || "",
      controller_unique_id: r.controller_unique_id || "",
      controller_make_model: r.controller_make_model || "",
      battery_unique_id: r.battery_unique_id || "",
      battery_make_model: r.battery_make_model || "",
      dc_dc_make_model: r.dc_dc_make_model || "",
      btms_make_model: r.btms_make_model || "",
      hyd_cooling_yesno: r.hyd_cooling_yesno ? "Yes" : "No",
      compressor_yesno: r.compressor_yesno ? "Yes" : "No",
      motor_cooling_yesno: r.motor_cooling_yesno ? "Yes" : "No",
      motor_controller_details: r.motor_controller_details || "",
      compressor_details: r.compressor_details || "",
      motor_cooling_details: r.motor_cooling_details || "",
      date_of_deployment: r.date_of_deployment || "",
    });

    setShowModal(true);
  };

  const getVcuOptions = () => {
    let available;

    if (!editing) {
      available = vcus.filter((v) => !v.is_assigned);
    } else {
      const free = vcus.filter((v) => !v.is_assigned);
      const current = vcus.find((v) => v.vcu_id === Number(form.vcu_id));

      const map = new Map();
      [...free, current].filter(Boolean).forEach((v) => map.set(v.vcu_id, v));

      available = Array.from(map.values());
    }

    return available.map((v) => ({
      value: v.vcu_id,
      serial: v.serial_number,
      isCurrent: editing && v.vcu_id === Number(form.vcu_id),
      assignedTo: v.is_assigned ? v.assigned_vehicle_unique_id : null,
    }));
  };

  const getHmiOptions = () => {
    let available;

    if (!editing) {
      available = hmis.filter((h) => !h.is_assigned);
    } else {
      const free = hmis.filter((h) => !h.is_assigned);
      const current = hmis.find((h) => h.hmi_id === Number(form.hmi_id));

      const map = new Map();
      [...free, current].filter(Boolean).forEach((h) => map.set(h.hmi_id, h));

      available = Array.from(map.values());
    }

    return available.map((h) => ({
      value: h.hmi_id,
      imei: h.imei_number,
      isCurrent: editing && h.hmi_id === Number(form.hmi_id),
      assignedTo: h.is_assigned ? h.assigned_vehicle_unique_id : null,
    }));
  };

  const unassignVcu = () => {
    if (!confirm("Unassign VCU from this vehicle?")) return;
    setVcuUnassigned(true);
    setForm((prev) => ({ ...prev, vcu_id: "" }));
  };

  const unassignHmi = () => {
    if (!confirm("Unassign HMI from this vehicle?")) return;
    setHmiUnassigned(true);
    setForm((prev) => ({ ...prev, hmi_id: "" }));
  };

  const saveForm = async () => {
    if (!form.vehicle_reg_no || !form.customer_id || !form.vtype_id) {
      alert("Registration No., Customer, and Vehicle Type are required!");
      return;
    }

    const payload = {
      vehicle_unique_id: form.vehicle_unique_id,
      customer_id: parseInt(form.customer_id),
      vtype_id: parseInt(form.vtype_id),
      vcu_id:
        form.vcu_id !== ""
          ? Number(form.vcu_id)
          : editing
          ? editing.vcu_id
          : null,
      hmi_id:
        form.hmi_id !== ""
          ? Number(form.hmi_id)
          : editing
          ? editing.hmi_id
          : null,
      vehicle_reg_no: form.vehicle_reg_no || null,
      vcu_make_model: form.vcu_make_model || null,
      hmi_make_model: form.hmi_make_model || null,
      motor_unique_id: form.motor_unique_id || null,
      motor_make_model: form.motor_make_model || null,
      controller_unique_id: form.controller_unique_id || null,
      controller_make_model: form.controller_make_model || null,
      battery_unique_id: form.battery_unique_id || null,
      battery_make_model: form.battery_make_model || null,
      dc_dc_make_model: form.dc_dc_make_model || null,
      btms_make_model: form.btms_make_model || null,
      hyd_cooling_yesno: form.hyd_cooling_yesno === "Yes",
      compressor_yesno: form.compressor_yesno === "Yes",
      motor_cooling_yesno: form.motor_cooling_yesno === "Yes",
      motor_controller_details: form.motor_controller_details || null,
      compressor_details: form.compressor_details || null,
      motor_cooling_details: form.motor_cooling_details || null,
      date_of_deployment: form.date_of_deployment || null,
    };

    try {
      if (!editing) {
        await axios.post(VEHICLE_API, payload, { headers: getAuthHeaders() });
      } else {
        await axios.put(
          `${VEHICLE_API}/${editing.vehicle_master_id}`,
          payload,
          { headers: getAuthHeaders() }
        );
      }
      await fetchVehicles();
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.error || "Save failed");
    }
  };

  const removeRow = async (id) => {
    if (!confirm("Delete this vehicle permanently?")) return;
    try {
      await axios.delete(`${VEHICLE_API}/${id}`, { headers: getAuthHeaders() });
      await fetchVehicles();
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Unique ID",
      "Reg No.",
      "Customer",
      "Vehicle Type",
      "VCU Serial",
      "HMI IMEI",
      "VCU Make+Model",
      "HMI Make+Model",
      "Motor",
      "Battery",
      "DC/DC",
      "BTMS",
      "Deployment",
      "Actions",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.vehicle_unique_id || "",
          r.vehicle_reg_no || "",
          r.company_name || "",
          `${r.vehicle_make || ""} ${r.vehicle_model || ""}`.trim(),
          r.vcu_serial || "",
          r.hmi_imei || "",
          r.vcu_make_model || "",
          r.hmi_make_model || "",
          r.motor_make_model || "",
          r.battery_make_model || "",
          r.dc_dc_make_model || "",
          r.btms_make_model || "",
          r.hyd_cooling_yesno ? "Yes" : "No",
          r.compressor_yesno ? "Yes" : "No",
          r.motor_cooling_yesno ? "Yes" : "No",
          [
            r.motor_controller_details,
            r.compressor_details,
            r.motor_cooling_details,
          ].filter(Boolean).join(" | ") || "",
          formatDate(r.date_of_deployment),
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle_master.csv";
    a.click();
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black overflow-x-hidden text-white">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Vehicle Master Database
          </h1>
          <p className="text-orange-300">Full EV configuration registry</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fleet..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border border-orange-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-3 rounded-xl bg-gray-800 border border-orange-500/30 hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export All
            </button>
            <button
              onClick={openNew}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Vehicle
            </button>
          </div>
        </div>

        {loading && <div className="text-center py-8">Loading fleet...</div>}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="bg-gray-800/50 rounded-2xl border border-orange-500/30 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-black/50">
              <tr>
                {[
                  "Unique ID",
                  "Reg No.",
                  "Customer",
                  "Vehicle Type",
                  "VCU Serial",
                  "HMI IMEI",
                  "VCU Make+Model",
                  "HMI Make+Model",
                  "Motor",
                  "Battery",
                  "DC/DC",
                  "BTMS",
                  "Deployment",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-orange-200 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.vehicle_master_id}
                  className="border-t border-orange-500/10 hover:bg-orange-500/5"
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.vehicle_unique_id}</td>
                  <td className="px-4 py-3 font-bold">{r.vehicle_reg_no}</td>
                  <td className="px-4 py-3">{r.company_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-300 text-xs font-medium">
                      {r.vehicle_make} {r.vehicle_model}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{r.vcu_serial || "-"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{r.hmi_imei || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.vcu_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.hmi_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.motor_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.battery_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.dc_dc_make_model || "-"}</td>
                  <td className="px-4 py-3 text-xs">{r.btms_make_model || "-"}</td>
                  <td className="px-4 py-3">{formatDate(r.date_of_deployment)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(r)}
                      className="p-2 hover:bg-orange-500/20 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeRow(r.vehicle_master_id)}
                      className="p-2 hover:bg-red-500/20 rounded ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-16 text-orange-400">
                    No vehicles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
            <div className="min-h-full w-full flex justify-center items-start pt-24 pb-10 px-4">
              <div className="bg-gray-900 p-8 rounded-2xl border-2 border-orange-500 w-full max-w-6xl max-h-[85vh] overflow-y-auto space-y-6">
                <h2 className="text-2xl font-bold text-orange-300 mb-6">
                  {editing ? "Edit" : "Add"} Vehicle
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <Input label="Unique ID *" value={form.vehicle_unique_id} disabled />

                  <Input
                    label="Reg No./VIN *"
                    value={form.vehicle_reg_no}
                    onChange={(v) => setForm({ ...form, vehicle_reg_no: v })}
                  />

                  <Select
                    label="Customer *"
                    value={form.customer_id}
                    onChange={(v) => setForm({ ...form, customer_id: v })}
                    options={customers.map((c) => ({
                      value: c.customer_id,
                      label: c.company_name,
                    }))}
                    placeholder="Select customer"
                  />

                  <Select
                    label="Vehicle Type *"
                    value={form.vtype_id}
                    onChange={(v) => setForm({ ...form, vtype_id: v })}
                    options={vehicleTypes.map((vt) => ({
                      value: vt.vtype_id,
                      label: `${vt.make} ${vt.model}`,
                    }))}
                    placeholder="Select vehicle type"
                  />

                  {/* VCU Custom Dropdown */}
                  <div className="relative">
                    <label className="block">
                      <span className="text-orange-300 text-xs">VCU Serial</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vcuSearch}
                        onChange={(e) => setVcuSearch(e.target.value)}
                        placeholder="Type or select serial number..."
                        className="mt-1 w-full px-3 py-2 pr-10 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm"
                        onFocus={() => setShowVcuList(true)}
                        onBlur={() => setTimeout(() => setShowVcuList(false), 200)}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />

                      {form.vcu_id && (
                        <button
                          type="button"
                          onClick={unassignVcu}
                          className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400 text-xl leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {selectedVcu && (
                      <p className="text-xs text-orange-400 mt-1">
                        Selected: {selectedVcu.serial_number}
                        {selectedVcu.is_assigned &&
                          selectedVcu.assigned_vehicle_unique_id !== form.vehicle_unique_id &&
                          ` (assigned to ${selectedVcu.assigned_vehicle_unique_id})`}
                      </p>
                    )}

                    {showVcuList && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-orange-500/30 rounded-lg max-h-60 overflow-auto shadow-2xl">
                        {getVcuOptions()
                          .filter((opt) =>
                            (opt.serial || "").toLowerCase().includes(vcuSearch.toLowerCase())
                          )
                          .map((opt) => (
                            <div
                              key={opt.value}
                              className="px-3 py-2 hover:bg-orange-500/20 cursor-pointer text-sm flex justify-between items-center"
                              onMouseDown={() => {
                                setForm({ ...form, vcu_id: String(opt.value) });
                                setSelectedVcu({
                                  vcu_id: opt.value,
                                  serial_number: opt.serial,
                                  is_assigned: !!opt.assignedTo,
                                  assigned_vehicle_unique_id: opt.assignedTo,
                                });
                                setVcuSearch(opt.serial || "");
                                setShowVcuList(false);
                              }}
                            >
                              <span>
                                {opt.serial}
                                {opt.isCurrent && (
                                  <span className="text-xs text-green-400 ml-2">current</span>
                                )}
                              </span>
                              {opt.assignedTo && !opt.isCurrent && (
                                <span className="text-xs text-orange-400">
                                  → {opt.assignedTo}
                                </span>
                              )}
                            </div>
                          ))}
                        {getVcuOptions().filter((opt) =>
                          (opt.serial || "").toLowerCase().includes(vcuSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-3 text-gray-400 text-sm text-center">
                            No matching serial number
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Input
                    label="VCU Make+Model (Snapshot)"
                    value={form.vcu_make_model}
                    disabled
                  />

                  {/* HMI Custom Dropdown */}
                  <div className="relative">
                    <label className="block">
                      <span className="text-orange-300 text-xs">HMI IMEI</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={hmiSearch}
                        onChange={(e) => setHmiSearch(e.target.value)}
                        placeholder="Type or select IMEI number..."
                        className="mt-1 w-full px-3 py-2 pr-10 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm"
                        onFocus={() => setShowHmiList(true)}
                        onBlur={() => setTimeout(() => setShowHmiList(false), 200)}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />

                      {form.hmi_id && (
                        <button
                          type="button"
                          onClick={unassignHmi}
                          className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-400 text-xl leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {selectedHmi && (
                      <p className="text-xs text-orange-400 mt-1">
                        Selected: {selectedHmi.imei_number}
                        {selectedHmi.is_assigned &&
                          selectedHmi.assigned_vehicle_unique_id !== form.vehicle_unique_id &&
                          ` (assigned to ${selectedHmi.assigned_vehicle_unique_id})`}
                      </p>
                    )}

                    {showHmiList && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-orange-500/30 rounded-lg max-h-60 overflow-auto shadow-2xl">
                        {getHmiOptions()
                          .filter((opt) =>
                            (opt.imei || "").toLowerCase().includes(hmiSearch.toLowerCase())
                          )
                          .map((opt) => (
                            <div
                              key={opt.value}
                              className="px-3 py-2 hover:bg-orange-500/20 cursor-pointer text-sm flex justify-between items-center"
                              onMouseDown={() => {
                                setForm({ ...form, hmi_id: String(opt.value) });
                                setSelectedHmi({
                                  hmi_id: opt.value,
                                  imei_number: opt.imei,
                                  is_assigned: !!opt.assignedTo,
                                  assigned_vehicle_unique_id: opt.assignedTo,
                                });
                                setHmiSearch(opt.imei || "");
                                setShowHmiList(false);
                              }}
                            >
                              <span>
                                {opt.imei}
                                {opt.isCurrent && (
                                  <span className="text-xs text-green-400 ml-2">current</span>
                                )}
                              </span>
                              {opt.assignedTo && !opt.isCurrent && (
                                <span className="text-xs text-orange-400">
                                  → {opt.assignedTo}
                                </span>
                              )}
                            </div>
                          ))}
                        {getHmiOptions().filter((opt) =>
                          (opt.imei || "").toLowerCase().includes(hmiSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-3 text-gray-400 text-sm text-center">
                            No matching IMEI number
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Input
                    label="HMI Make+Model (Snapshot)"
                    value={form.hmi_make_model}
                    disabled
                  />

                  <Input
                    label="Motor Make+Model"
                    value={form.motor_make_model}
                    onChange={(v) => setForm({ ...form, motor_make_model: v })}
                  />

                  <Input
                    label="Controller Make+Model"
                    value={form.controller_make_model}
                    onChange={(v) => setForm({ ...form, controller_make_model: v })}
                  />

                  <Input
                    label="Battery Make+Model"
                    value={form.battery_make_model}
                    onChange={(v) => setForm({ ...form, battery_make_model: v })}
                  />

                  <Input
                    label="DC/DC Converter"
                    value={form.dc_dc_make_model}
                    onChange={(v) => setForm({ ...form, dc_dc_make_model: v })}
                  />

                  <Input
                    label="BTMS"
                    value={form.btms_make_model}
                    onChange={(v) => setForm({ ...form, btms_make_model: v })}
                  />

                  <YesNoSelect
                    label="Hydraulic Cooling"
                    value={form.hyd_cooling_yesno}
                    onChange={(v) => setForm({ ...form, hyd_cooling_yesno: v })}
                  />
                  {form.hyd_cooling_yesno === "Yes" && (
                    <TextArea
                      label="Hydraulic Cooling Details"
                      value={form.motor_controller_details}
                      onChange={(v) => setForm({ ...form, motor_controller_details: v })}
                    />
                  )}

                  <YesNoSelect
                    label="Compressor"
                    value={form.compressor_yesno}
                    onChange={(v) => setForm({ ...form, compressor_yesno: v })}
                  />
                  {form.compressor_yesno === "Yes" && (
                    <TextArea
                      label="Compressor Details"
                      value={form.compressor_details}
                      onChange={(v) => setForm({ ...form, compressor_details: v })}
                    />
                  )}

                  <YesNoSelect
                    label="Motor Cooling"
                    value={form.motor_cooling_yesno}
                    onChange={(v) => setForm({ ...form, motor_cooling_yesno: v })}
                  />
                  {form.motor_cooling_yesno === "Yes" && (
                    <TextArea
                      label="Motor Cooling Details"
                      value={form.motor_cooling_details}
                      onChange={(v) => setForm({ ...form, motor_cooling_details: v })}
                    />
                  )}

                  <Input
                    label="Date of Deployment"
                    type="date"
                    value={form.date_of_deployment}
                    onChange={(v) => setForm({ ...form, date_of_deployment: v })}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl border border-orange-500/30 hover:bg-orange-500/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveForm}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-bold"
                  >
                    Save Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Reusable Components
// ────────────────────────────────────────────────

function Input({ label, value = "", onChange, disabled = false, ...props }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-xs">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`mt-1 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-orange-500 text-sm ${
          disabled
            ? "bg-gray-800/50 border-orange-500/20 text-gray-400 cursor-not-allowed"
            : "bg-gray-800 border-orange-500/30"
        }`}
        {...props}
      />
    </label>
  );
}

function TextArea({ label, value = "", onChange }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-xs">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm resize-vertical"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [], placeholder = "Select..." }) {
  return (
    <label className="block">
      <span className="text-orange-300 text-xs">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-orange-500/30 focus:ring-2 focus:ring-orange-500 text-sm appearance-none"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function YesNoSelect({ label, value, onChange }) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: "No", label: "No" },
        { value: "Yes", label: "Yes" },
      ]}
      placeholder="Select..."
    />
  );
}