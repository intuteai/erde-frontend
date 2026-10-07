import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Zap,
  Layers,
} from "lucide-react";
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

const TRACK_MARKER_SIZE = 40;

const LIVE_THRESHOLD_MS = 15_000;
const OFFLINE_THRESHOLD_MS = 5 * 60_000;
const MAX_POINTS = 100;
const LIVE_POLL_INTERVAL_MS = 3_000;

// Colours the accuracy circle by GPS accuracy quality — restoring behaviour
// the pre-MapLibre version had (green <10m, amber <50m, red >=50m, grey
// when unknown) that was accidentally dropped in the migration, flattening
// it to a single always-grey fill. Expressed as a MapLibre data-driven
// paint expression reading a feature's `accuracy_m` property, rather than
// an imperative colour computed in JS, so it re-evaluates automatically on
// every `source.setData()` call with no extra `setPaintProperty` call needed.
const ACCURACY_FILL_COLOR = [
  "case",
  ["==", ["get", "accuracy_m"], null], "#6b7280",
  ["<", ["get", "accuracy_m"], 10], "#22c55e",
  ["<", ["get", "accuracy_m"], 50], "#facc15",
  "#ef4444",
];

const haversine = ([lat1, lon1], [lat2, lon2]) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const mpsToKmh = (mps) => (mps == null ? null : Math.round(mps * 3.6));

const MAX_TELEPORT_REJECTIONS = 3;

// Prepends/pushes a new [lat, lon] point onto the trail, guarding against a
// wild GPS outlier by rejecting a point that's implausibly far from the
// last accepted one — but only for a few consecutive rejections. A vehicle
// that goes offline and reconnects farther away than 2km (a real scenario:
// brief connectivity loss, a tunnel, sparse highway pings) must not get its
// trail stuck forever comparing new points against a stale anchor it will
// never approach again — after MAX_TELEPORT_REJECTIONS consecutive
// rejections, the latest point is accepted as the new anchor. Pure
// function so it's easy to reason about independent of the refs it feeds.
function pushTrailPoint(prevPoints, latLon, rejectionStreak) {
  if (prevPoints.length && rejectionStreak < MAX_TELEPORT_REJECTIONS) {
    const dist = haversine(prevPoints[prevPoints.length - 1], latLon);
    if (dist > 2) {
      return { points: prevPoints, rejectionStreak: rejectionStreak + 1 };
    }
  }
  return {
    points: [...prevPoints.slice(-MAX_POINTS + 1), latLon],
    rejectionStreak: 0,
  };
}

// Approximates a circle of `radiusMeters` around `[lng, lat]` as a GeoJSON
// polygon — MapLibre's native circle-radius paint property is in pixels,
// which doesn't stay accurate as you zoom, so accuracy is drawn as a real
// geographic polygon instead.
function circlePolygon([lng, lat], radiusMeters, points = 64) {
  const coords = [];
  const distanceX = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusMeters / 110540;
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([lng + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

const EMPTY_LINE = { type: "Feature", geometry: { type: "LineString", coordinates: [] } };
const EMPTY_POLYGON = { type: "Feature", geometry: { type: "Polygon", coordinates: [] } };

export default function VehicleLiveTrack() {
  const { id } = useParams();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const pointsRef = useRef([]); // [[lat, lon], ...] trail history — plain ref, nothing renders from this list directly, only the map source it feeds
  const rejectionStreakRef = useRef(0); // consecutive anti-teleport rejections — see pushTrailPoint

  const [lastUpdate, setLastUpdate] = useState(null);
  const [follow, setFollow] = useState(true);
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [accessState, setAccessState] = useState("checking");
  // Set to the id the access-check fetch most recently confirmed for. Needed
  // alongside accessState because switching between two vehicles that are
  // BOTH accessible never changes the string "ok" -> "ok", so an effect
  // keyed only on accessState wouldn't re-run and couldn't tell "access
  // confirmed for the OLD id" apart from "access confirmed for the NEW id" —
  // this id-keyed value always changes, so it reliably re-triggers.
  const [confirmedId, setConfirmedId] = useState(null);

  const now = Date.now();
  const age = lastUpdate ? now - lastUpdate.getTime() : null;

  const isLive = age != null && age < LIVE_THRESHOLD_MS;
  const isOffline = age != null && age > OFFLINE_THRESHOLD_MS;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setAccessState("checking");

    fetch(`${API_BASE_URL}/api/vehicles/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          // Any non-2xx — not just 403/404 — means this id isn't a usable
          // vehicle for this user: a malformed/negative id (e.g. "abc" or
          // "-1") gets a 400 from the backend's parseVehicleId, which used
          // to fall through to "ok" here and leave the page stuck on a
          // permanent "Reconnecting…" badge instead of the existing,
          // correct "Access denied" card.
          setAccessState("denied");
          return;
        }
        setConfirmedId(id);
        setAccessState("ok");
        try {
          const data = await res.json();
          if (!cancelled) setVehicleInfo(data);
        } catch {
          // Body parse failure doesn't affect access — overlay card just
          // falls back to a placeholder if vehicleInfo stays null.
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfirmedId(id);
          setAccessState("ok");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // The zoom +/- control is a native MapLibre control (added imperatively in
  // the shared useMapLibreMap hook, used by both this page and FleetMap.jsx,
  // which has no "access denied" concept) — it can't be gated by a plain
  // JSX conditional the way the identity card/badges/stats are. Hiding it
  // here instead, scoped to THIS page's own map container only, so it
  // doesn't affect FleetMap's always-visible zoom control.
  useEffect(() => {
    const ctrl = document.querySelector("#live-map .maplibregl-ctrl-top-left");
    if (ctrl) ctrl.style.visibility = accessState === "ok" ? "visible" : "hidden";
  }, [accessState]);

  useEffect(() => {
    // confirmedId !== id closes a stale-closure race: when `id` changes,
    // this effect re-runs in the same commit as the access-check effect,
    // but (being a separate effect) it still sees THIS render's already-
    // committed accessState — which, switching between two vehicles that
    // are both accessible, is already "ok" from the PREVIOUS vehicle. That
    // used to let a poll fire against the new id's /live endpoint before
    // access had actually been confirmed for it.
    if (accessState !== "ok" || !id || confirmedId !== id) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${id}/live`, {
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const alarmCount = Object.keys(data).filter(
          (k) => k.startsWith("alarms_") && data[k] === true
        ).length;
        setLiveStats({
          soc_percent: data.soc_percent ?? null,
          battery_status: data.battery_status ?? null,
          alarmCount,
        });
      } catch {
        // A single failed poll just keeps showing the last known stats —
        // this is a supplementary display; the position SSE already has
        // its own reconnect/backoff for the primary connection.
      }
    }

    poll();
    const interval = setInterval(poll, LIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, accessState, confirmedId]);

  useEffect(() => {
    pointsRef.current = [];
    rejectionStreakRef.current = 0;
    setLastUpdate(null);
    setFollow(true);
    setVehicleInfo(null);
    setLiveStats(null);
    setCurrentSpeed(null);
    markerRef.current?.remove();
    markerRef.current = null;

    const map = mapRef.current;
    map?.getSource("trail")?.setData(EMPTY_LINE);
    map?.getSource("accuracy")?.setData(EMPTY_POLYGON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Shared by both onLoad (new map instance) and onStyleReload (same
  // instance, basemap switched) — setStyle() wipes any custom GeoJSON
  // sources/layers, so both paths need to re-add them. Marker state is
  // NOT touched here — see handleMapLoad/handleStyleReload below for why
  // that has to differ between the two cases.
  const setupTrailAndAccuracy = useCallback((map) => {
    map.addSource("trail", { type: "geojson", data: EMPTY_LINE });
    map.addLayer({
      id: "trail-line",
      type: "line",
      source: "trail",
      paint: { "line-color": "#22c55e", "line-width": 4, "line-opacity": 0.8 },
    });

    map.addSource("accuracy", { type: "geojson", data: EMPTY_POLYGON });
    map.addLayer({
      id: "accuracy-fill",
      type: "fill",
      source: "accuracy",
      // fill-outline-color isn't affected by fill-opacity, so the accuracy
      // colour still reads as a clear, full-strength ring even when the low
      // fill-opacity (needed so the circle doesn't obscure the map under
      // it) makes the fill itself blend into similarly-coloured ground —
      // e.g. the green "accurate" fill was nearly imperceptible over the
      // industrial-site's lavender polygon until this was added.
      paint: { "fill-color": ACCURACY_FILL_COLOR, "fill-opacity": 0.15, "fill-outline-color": ACCURACY_FILL_COLOR },
    });

    if (pointsRef.current.length) {
      map.getSource("trail").setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: pointsRef.current.map(([lat, lon]) => [lon, lat]),
        },
      });
    }
  }, []);

  const handleMapLoad = useCallback((map) => {
    // A style-load-failure retry fully destroys the old map instance and
    // creates a new one — the marker object from before the retry is still
    // bound to the destroyed map (never re-added), so without this it would
    // silently stop updating. Clearing it here forces the next position
    // update to create a fresh marker correctly attached to this map.
    markerRef.current?.remove();
    markerRef.current = null;

    setupTrailAndAccuracy(map);
    map.on("dragstart", () => setFollow(false));
  }, [setupTrailAndAccuracy]);

  // Fires after a basemap switch (satellite/map toggle) on the SAME map
  // instance — deliberately does NOT touch markerRef. The marker is a
  // plain DOM overlay independent of the style and survives a setStyle()
  // call untouched; resetting it here (like handleMapLoad does for a
  // genuine new-instance case) would make it flicker/vanish on every
  // toggle until the next SSE tick recreated it. dragstart is a map-level
  // interaction listener, not style-dependent, so it isn't re-registered
  // here either — only the style-owned sources/layers need re-adding.
  const handleStyleReload = useCallback((map) => {
    setupTrailAndAccuracy(map);
  }, [setupTrailAndAccuracy]);

  const { mapRef, failed: mapFailed, styleMode, setStyleMode } = useMapLibreMap("live-map", {
    onLoad: handleMapLoad,
    onStyleReload: handleStyleReload,
  });

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

  const handleTrackMessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      if (!d?.lat || !d?.lon) return;
      if (d.lat === 0 && d.lon === 0) return;

      const lngLat = [d.lon, d.lat]; // MapLibre/GeoJSON order: [lng, lat]
      setLastUpdate(new Date(d.recorded_at || Date.now()));
      setCurrentSpeed(mpsToKmh(d.speed_mps));

      const pushResult = pushTrailPoint(pointsRef.current, [d.lat, d.lon], rejectionStreakRef.current);
      pointsRef.current = pushResult.points;
      rejectionStreakRef.current = pushResult.rejectionStreak;
      mapRef.current?.getSource("trail")?.setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: pointsRef.current.map(([lat, lon]) => [lon, lat]),
        },
      });

      const map = mapRef.current;
      if (!map) return;

      if (!markerRef.current) {
        const el = createVehicleMarkerElement({
          live: !isOffline,
          headingDeg: d.heading_deg,
          size: TRACK_MARKER_SIZE,
        });
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);
        map.setCenter(lngLat);
        map.setZoom(16);
      } else {
        updateVehicleMarkerElement(markerRef.current.getElement(), {
          live: !isOffline,
          headingDeg: d.heading_deg,
          size: TRACK_MARKER_SIZE,
        });
        smoothMarkerMove(markerRef.current, lngLat);
        if (follow) map.panTo(lngLat);
      }

      map.getSource("accuracy")?.setData({
        type: "Feature",
        properties: { accuracy_m: d.accuracy_m ?? null },
        geometry: circlePolygon(lngLat, d.accuracy_m || 10),
      });
    } catch {}
  };

  const sseStatus = useEventSourceWithBackoff(
    `${API_BASE_URL}/api/vehicles/${id}/location/stream`,
    handleTrackMessage,
    { enabled: accessState === "ok" }
  );

  return (
    <div ref={containerRef} className="flex flex-col bg-black text-white" style={{ minHeight: 'calc(100vh - 180px)' }}>
      <div className="shrink-0 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-lg font-bold tracking-wide">Live Tracking</h1>
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
      </div>

      <div className="flex-1 relative bg-black" style={{ minHeight: '500px' }}>
        <div id="live-map" className="absolute inset-0" />

        {accessState === "checking" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <div className="flex items-center gap-3 bg-gray-900/90 text-gray-300 px-4 py-2 rounded-lg text-sm">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              Checking access…
            </div>
          </div>
        )}

        {accessState === "denied" && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-gray-900/95">
            <div className="text-center px-6 py-5 max-w-xs">
              <p className="text-gray-200 font-semibold mb-1">Access denied</p>
              <p className="text-gray-400 text-sm">You don't have access to this vehicle.</p>
            </div>
          </div>
        )}

        {accessState === "ok" && mapFailed && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-gray-900/95">
            <div className="text-center px-6 py-5 max-w-xs">
              <p className="text-gray-200 font-semibold mb-1">Map unavailable</p>
              <p className="text-gray-400 text-sm">Having trouble loading the map. Retrying…</p>
            </div>
          </div>
        )}

        {accessState === "ok" && !mapFailed && (
          <>
            <div className="absolute top-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[220px]">
              <div className="font-bold text-sm truncate">
                {vehicleInfo?.vehicle_reg_no || `Vehicle #${id}`}
              </div>
              {(vehicleInfo?.make || vehicleInfo?.model) && (
                <div className="text-gray-400 text-xs truncate">
                  {[vehicleInfo?.make, vehicleInfo?.model].filter(Boolean).join(" ")}
                </div>
              )}
            </div>

            <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1.5">
              {/* Solid dark backdrop (matching the identity card / stat strip)
                  instead of a low-opacity tinted background — a translucent
                  tint reads fine against a dark map but washes out to near-
                  invisible against Liberty's light cream basemap. Colour is
                  carried by the text/border instead, so it stays legible on
                  any basemap style. */}
              {sseStatus === "reconnecting" ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-amber-400 border border-amber-500/50 text-xs font-semibold">
                  ⚠ Reconnecting…
                </span>
              ) : isLive ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-emerald-300 border border-emerald-500/60 text-xs font-semibold">
                  <span className="animate-pulse">●</span>
                  <Wifi size={12} /> LIVE
                </span>
              ) : isOffline ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-gray-400 border border-gray-600/60 text-xs font-semibold">
                  <WifiOff size={12} /> OFFLINE
                </span>
              ) : age == null ? (
                <span className="px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-gray-400 border border-gray-600/60 text-xs font-semibold">
                  Waiting for signal…
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-amber-400 border border-amber-500/50 text-xs font-semibold">
                  Last seen {Math.round(age / 1000)}s ago
                </span>
              )}

              {liveStats?.alarmCount > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm text-red-300 border border-red-500/60 text-xs font-semibold">
                  <AlertTriangle size={12} /> {liveStats.alarmCount} active alarm{liveStats.alarmCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[64px]">
                <div className="text-gray-400 text-[10px]">SPEED</div>
                <div className="font-bold text-sm">
                  {currentSpeed ?? "–"}<span className="text-[10px] text-gray-400"> km/h</span>
                </div>
              </div>
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[64px]">
                <div className="text-gray-400 text-[10px]">BATTERY</div>
                <div className="font-bold text-sm text-amber-400">
                  {liveStats?.soc_percent != null ? Math.round(liveStats.soc_percent) : "–"}<span className="text-[10px] text-gray-400">%</span>
                </div>
              </div>
              {liveStats?.battery_status && (
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[72px]">
                  <div className="text-gray-400 text-[10px]">STATUS</div>
                  <div className="font-bold text-xs text-blue-400 flex items-center justify-center gap-1">
                    {liveStats.battery_status === "Charging" && <Zap size={11} />}
                    {liveStats.battery_status}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {accessState === "ok" && !mapFailed && (
          <button
            onClick={() => {
              setFollow(true);
              if (markerRef.current && mapRef.current) {
                // bearing/pitch: 0 resets a right-click-drag rotation/tilt
                // too — setCenter/setZoom alone would leave those untouched.
                // duration capped for the same reason Fleet Map's Reset
                // view caps it — without one, a huge camera jump (e.g.
                // recentering after zooming way out) can take several
                // seconds by MapLibre's own default distance-scaled
                // animation, which reads as the button not working.
                mapRef.current.easeTo({
                  center: markerRef.current.getLngLat(),
                  zoom: 16,
                  bearing: 0,
                  pitch: 0,
                  duration: 1200,
                });
              }
            }}
            className={`absolute bottom-20 right-4 z-[1000] px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg ${
              follow
                ? 'bg-emerald-600/80 text-white backdrop-blur-sm'
                : 'bg-white/90 text-gray-800 hover:bg-white backdrop-blur-sm'
            }`}
          >
            {follow ? '📍 Following' : 'Recenter'}
          </button>
        )}

        <div className="absolute bottom-4 right-4 z-[1000]">
          <a
            href="https://www.intute.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors duration-200 shadow-lg text-sm"
          >
            Intute.ai
          </a>
        </div>
      </div>
    </div>
  );
}
