// src/components/FleetMap.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import { ArrowLeft, Layers, LocateFixed, Maximize2, Minimize2 } from "lucide-react";
import { useMapLibreMap } from "../lib/useMapLibreMap";
import {
  createVehicleMarkerElement,
  updateVehicleMarkerElement,
} from "../lib/vehicleMarkerElement";
import { smoothMarkerMove } from "../lib/smoothMarkerMove";
import { useEventSourceWithBackoff } from "../lib/useEventSourceWithBackoff";
import "../lib/mapLibreOverrides.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const LIVE_THRESHOLD_MS = 15_000;
const FLEET_MARKER_SIZE = 36;

// "Live" is driven by last_seen (from vehicle_latest_snapshot, i.e. whether
// the vehicle is actively sending telemetry to live_values) — the same
// signal the dashboard's status pill uses — NOT recorded_at (the GPS ping
// timestamp). A vehicle can keep pinging its GPS position while its
// telemetry has gone stale; that should show as offline here too.
function isVehicleLive(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < LIVE_THRESHOLD_MS;
}

function statChip(label, value) {
  const chip = document.createElement("span");
  const key = document.createElement("span");
  key.style.color = "#9ca3af";
  key.textContent = `${label} `;
  const val = document.createElement("span");
  val.style.color = "#fff";
  val.style.fontWeight = "700";
  val.textContent = value;
  chip.appendChild(key);
  chip.appendChild(val);
  return chip;
}

// Builds the DOM content for a vehicle's hover popup — a dark card matching
// the glass-card styling used everywhere else in this app (the tracking
// page's identity card, this same page's bottom-left legend), replacing
// MapLibre's plain default white popup. `v.customer` is already present in
// both the snapshot and SSE payloads this page already fetches — it was
// simply unused until now.
function buildPopupCard(v, live) {
  const el = document.createElement("div");
  el.style.background = "rgba(17,24,39,.92)";
  el.style.backdropFilter = "blur(6px)";
  el.style.border = "1px solid rgba(255,255,255,.08)";
  el.style.borderRadius = "10px";
  el.style.padding = "8px 12px";
  el.style.color = "#fff";
  el.style.minWidth = "150px";
  el.style.fontFamily = "inherit";

  const name = document.createElement("div");
  name.style.fontWeight = "700";
  name.style.fontSize = "12px";
  name.textContent = v.vehicle_no || "Unknown vehicle";
  el.appendChild(name);

  if (v.customer) {
    const customer = document.createElement("div");
    customer.style.color = "#9ca3af";
    customer.style.fontSize = "10px";
    customer.style.marginTop = "2px";
    customer.textContent = v.customer;
    el.appendChild(customer);
  }

  const stats = document.createElement("div");
  stats.style.display = "flex";
  stats.style.gap = "10px";
  stats.style.marginTop = "6px";
  stats.style.fontSize = "10px";
  stats.appendChild(
    statChip("SOC", v.soc_percent != null ? `${Math.round(v.soc_percent)}%` : "—")
  );
  stats.appendChild(
    statChip(
      "Hours",
      v.total_hours != null ? `${Math.round(v.total_hours).toLocaleString()} h` : "—"
    )
  );
  el.appendChild(stats);

  const status = document.createElement("div");
  status.style.display = "flex";
  status.style.alignItems = "center";
  status.style.gap = "4px";
  status.style.marginTop = "4px";

  const dot = document.createElement("span");
  dot.style.width = "6px";
  dot.style.height = "6px";
  dot.style.borderRadius = "999px";
  dot.style.background = live ? "#22c55e" : "#6b7280";
  status.appendChild(dot);

  const label = document.createElement("span");
  label.style.fontSize = "10px";
  label.style.fontWeight = "600";
  label.style.color = live ? "#6ee7b7" : "#9ca3af";
  label.textContent = live ? "LIVE" : "OFFLINE";
  status.appendChild(label);

  el.appendChild(status);
  return el;
}

export default function FleetMap() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const markersRef = useRef(new Map()); // vehicle_master_id -> { marker, el, popup, data }
  const hasFitBoundsRef = useRef(false);
  // Tracks whichever popup is currently open, so a new mouseenter can close
  // it first — without this, two popups could both be visibly open at once
  // (each marker owns an independent Popup instance with no built-in mutual
  // exclusion between them; relying on the browser always firing
  // mouseleave on the old target before mouseenter on the new one isn't
  // reliable, e.g. moving the pointer quickly between two distant markers).
  const openPopupRef = useRef(null);
  // Gates SSE-driven marker creation until loadSnapshot's first pass for the
  // CURRENT map instance has finished. Without this, an SSE message can win
  // the race against the snapshot fetch (SSE opens immediately on mount,
  // independent of the map's async style/tile load, and the backend pushes
  // the full fleet state as soon as it connects) and create a marker from a
  // bare position payload that has no vehicle_no/vehicle_type/customer —
  // showing "Unknown vehicle" in the popup and writing incomplete data to
  // localStorage if clicked before the snapshot lands. Reset to false at the
  // start of every loadSnapshot call so a style-load-failure retry re-arms
  // the gate for the new map instance.
  const initialLoadDoneRef = useRef(false);
  // Identifies the most recently-dispatched loadSnapshot call. Rapid
  // satellite-toggle clicks (each one calls loadSnapshot again, via
  // onStyleReload) fire overlapping fetches that can resolve out of order —
  // without this guard, an earlier click's response landing AFTER a later
  // click's response had already rendered fresher data would silently
  // clobber it with stale markers. Every resolve/catch/finally below checks
  // its own captured id against this ref and no-ops if a newer call has
  // since started.
  const loadRequestIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const upsertMarker = useCallback((v, map) => {
    if (!map || v.lat == null || v.lon == null) return;

    const existing = markersRef.current.get(v.vehicle_master_id);
    const live = isVehicleLive(v.last_seen);
    const lngLat = [v.lon, v.lat]; // MapLibre uses [lng, lat], not [lat, lng]

    if (existing) {
      existing.data = v;
      smoothMarkerMove(existing.marker, lngLat);
      updateVehicleMarkerElement(existing.el, { live, headingDeg: v.heading_deg, size: FLEET_MARKER_SIZE });
      existing.popup.setDOMContent(buildPopupCard(v, live));
      // Keep the popup pinned to the marker's new position — without this,
      // a popup left open while its vehicle moves (a live SSE update
      // arriving mid-hover) visually detaches and keeps pointing at the
      // vehicle's old position while the marker itself moves on.
      if (existing.popup.isOpen()) existing.popup.setLngLat(lngLat);
    } else {
      const el = createVehicleMarkerElement({ live, headingDeg: v.heading_deg, size: FLEET_MARKER_SIZE });
      const popup = new maplibregl.Popup({ offset: 16, closeButton: false, closeOnClick: false })
        .setDOMContent(buildPopupCard(v, live));

      const marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);

      el.addEventListener("mouseenter", () => {
        if (openPopupRef.current && openPopupRef.current !== popup) {
          openPopupRef.current.remove();
        }
        popup.setLngLat(marker.getLngLat()).addTo(map);
        openPopupRef.current = popup;
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
        if (openPopupRef.current === popup) openPopupRef.current = null;
      });

      // `entry` is shared between the registry map and the click closure below,
      // so later upserts that mutate `entry.data` are visible at click time —
      // avoids the handler reading stale, creation-time vehicle data.
      const entry = { marker, el, popup, data: v };
      const openVehicle = () => {
        const current = entry.data;
        localStorage.setItem(
          "selectedVehicle",
          JSON.stringify({
            id: current.vehicle_master_id,
            vehicleNo: current.vehicle_no,
            vehicleType: current.vehicle_type,
            customer: current.customer,
          })
        );
        navigate(`/vehicle/${current.vehicle_master_id}`);
      };
      el.addEventListener("click", openVehicle);

      // Markers are plain divs with no native interactive semantics — without
      // this, clicking into a vehicle's live-tracking page (the only way in)
      // was entirely unreachable for keyboard-only/switch-access users, since
      // Tab skipped every marker. tabIndex + role="button" + a keydown
      // handler make them behave like real buttons; the browser's default
      // focus outline then applies automatically (nothing here suppresses it).
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Open ${v.vehicle_no || "vehicle"} details`);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openVehicle();
        }
      });

      markersRef.current.set(v.vehicle_master_id, entry);
    }
  }, [navigate]);

  /* =========================
     SNAPSHOT FETCH — runs once per map instance (including after a
     style-load-failure retry re-creates the map, via useMapLibreMap's
     onLoad), since markers belong to the map instance that owns them.
  ========================= */
  const loadSnapshot = useCallback(async (map) => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setError(null);
    initialLoadDoneRef.current = false;
    markersRef.current.forEach(({ marker, popup }) => {
      popup.remove();
      marker.remove();
    });
    markersRef.current.clear();
    hasFitBoundsRef.current = false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/locations`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestId !== loadRequestIdRef.current) return; // superseded by a newer call

      // Guard against malformed rows (missing id or coordinates) so one bad
      // entry can't throw mid-forEach and leave vehicleCount/markers out of sync.
      const validData = (Array.isArray(data) ? data : []).filter(
        (v) => v && v.vehicle_master_id != null && v.lat != null && v.lon != null
      );

      validData.forEach((v) => upsertMarker(v, map));
      setVehicleCount(markersRef.current.size);

      if (validData.length > 0 && !hasFitBoundsRef.current) {
        const bounds = new maplibregl.LngLatBounds();
        markersRef.current.forEach(({ marker }) => bounds.extend(marker.getLngLat()));
        map.fitBounds(bounds, { padding: 40 });
        hasFitBoundsRef.current = true;
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return; // superseded by a newer call
      console.error("Failed to load vehicle locations:", err);
      setError("Failed to load vehicle locations.");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    }
  }, [upsertMarker]);

  const { mapRef, failed: mapFailed, styleMode, setStyleMode } = useMapLibreMap("fleet-map", {
    onLoad: loadSnapshot,
    // Reusing loadSnapshot here re-fetches on every satellite/map toggle
    // (heavier than strictly necessary, since markers are DOM overlays that
    // survive a style switch on their own) — but toggling is an infrequent
    // user action, and keeping one code path for "sources are ready, set
    // up markers" is simpler than maintaining a second lighter variant.
    onStyleReload: loadSnapshot,
  });

  // Re-fits the map to every currently-visible marker — lets a user who's
  // panned/zoomed away (to inspect one vehicle, say) get back to the
  // "see the whole fleet" view without reloading the page. Reuses the same
  // bounds-from-markers logic loadSnapshot runs once on initial load.
  //
  // bearing/pitch: 0 resets the compass rotation and 3D tilt a right-click
  // (or ctrl-click) drag can apply — fitBounds alone only adjusts position
  // and zoom, it leaves the current camera angle untouched, so a tilted or
  // rotated view would stay tilted/rotated even after "resetting".
  //
  // duration: without an explicit value, MapLibre auto-scales the
  // animation length by how far the camera has to travel — resetting from
  // a zoomed-way-out world view back to the fleet (a huge jump) measured
  // at ~6 SECONDS by default, which reads as the button doing nothing
  // ("stuck"), not as a slow-but-working animation. Capping it keeps the
  // button feeling snappy regardless of how far away the view currently is.
  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (!map || markersRef.current.size === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    markersRef.current.forEach(({ marker }) => bounds.extend(marker.getLngLat()));
    map.fitBounds(bounds, { padding: 40, bearing: 0, pitch: 0, duration: 1200 });
  }, [mapRef]);

  /* =========================
     LIVE SSE UPDATES
  ========================= */
  const handleFleetMessage = (e) => {
    let d;
    try {
      d = JSON.parse(e.data);
    } catch (err) {
      console.warn("Malformed fleet location payload:", e.data);
      return;
    }

    if (d?.lat == null || d?.lon == null || d?.vehicle_master_id == null) return;
    if (!mapRef.current || !initialLoadDoneRef.current) return;

    try {
      const existing = markersRef.current.get(d.vehicle_master_id);
      const merged = existing ? { ...existing.data, ...d } : d;
      upsertMarker(merged, mapRef.current);

      if (!existing) setVehicleCount(markersRef.current.size);
    } catch (err) {
      console.error("Error processing fleet location update:", err);
    }
  };

  const sseStatus = useEventSourceWithBackoff(
    `${API_BASE_URL}/api/vehicles/locations/stream`,
    handleFleetMessage
  );

  /* =========================
     STALE RE-CHECK TICKER
  ========================= */
  useEffect(() => {
    const interval = setInterval(() => {
      markersRef.current.forEach(({ el, data }) => {
        updateVehicleMarkerElement(el, {
          live: isVehicleLive(data.last_seen),
          headingDeg: data.heading_deg,
          size: FLEET_MARKER_SIZE,
        });
      });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  /* =========================
     FULLSCREEN
  ========================= */
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col bg-black text-white" style={{ minHeight: "calc(100vh - 180px)" }}>
      <div className="shrink-0 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-lg font-bold tracking-wide">Fleet Map</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStyleMode(styleMode === "map" ? "satellite" : "map")}
              className="flex items-center gap-2 text-gray-300 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title={styleMode === "map" ? "Switch to satellite" : "Switch to map"}
              aria-label={styleMode === "map" ? "Switch to satellite" : "Switch to map"}
            >
              <Layers size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 text-gray-300 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        {(error || sseStatus === "reconnecting") && (
          <div className="mt-1 text-xs text-center text-amber-400">
            ⚠ {error || "Live updates reconnecting…"}
          </div>
        )}
      </div>

      <div className="flex-1 relative" style={{ minHeight: "500px" }}>
        <div id="fleet-map" className="absolute inset-0" />

        {mapFailed && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-gray-900/95">
            <div className="text-center px-6 py-5 max-w-xs">
              <p className="text-gray-200 font-semibold mb-1">Map unavailable</p>
              <p className="text-gray-400 text-sm">Having trouble loading the map. Retrying…</p>
            </div>
          </div>
        )}

        {loading && !mapFailed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <div className="flex items-center gap-3 bg-gray-900/90 text-gray-300 px-4 py-2 rounded-lg text-sm">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              Loading vehicles…
            </div>
          </div>
        )}

        {!loading && !error && !mapFailed && vehicleCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <span className="bg-gray-900/90 text-gray-300 px-4 py-2 rounded-lg text-sm">
              No live vehicle locations available
            </span>
          </div>
        )}

        {!loading && !mapFailed && (
          // Gated on !loading, matching the empty-state message below — not
          // just cosmetic: loadSnapshot clears all markers synchronously (on
          // every reload, including a satellite/map toggle, since it's reused
          // as onStyleReload) but only updates vehicleCount once the refetch
          // resolves, so without this the badge would show the STALE previous
          // count next to the "Loading vehicles…" spinner, actively wrong
          // rather than just not-yet-loaded.
          <div className="absolute top-3 right-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-gray-200 shadow-lg">
            {vehicleCount} vehicle{vehicleCount === 1 ? "" : "s"}
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Live
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> Offline
          </div>
        </div>

        <button
          onClick={resetView}
          className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm text-gray-200 hover:text-white rounded-lg px-3 py-2 text-xs font-semibold shadow-lg"
          title="Reset view to show the whole fleet"
        >
          <LocateFixed size={14} /> Reset view
        </button>
      </div>
    </div>
  );
}
