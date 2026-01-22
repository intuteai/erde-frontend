import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.marker.slideto";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

/* =========================
   LIVE THRESHOLDS
========================= */
const LIVE_THRESHOLD_MS = 15_000;
const OFFLINE_THRESHOLD_MS = 5 * 60_000;
const MAX_POINTS = 100;

/* =========================
   FIX DEFAULT ICONS
========================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* =========================
   HELPERS
========================= */
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

const accuracyColor = (m) =>
  m == null ? "#6b7280" : m < 10 ? "#22c55e" : m < 50 ? "#facc15" : "#ef4444";

const formatTs = (d) =>
  d
    ? d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "–";

export default function VehicleLiveTrack() {
  const { id } = useParams();
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyRef = useRef(null);
  const pathRef = useRef(null);
  const eventSourceRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [follow, setFollow] = useState(true);
  const [sseError, setSseError] = useState(null);

  /* =========================
     LIVE STATE
  ========================= */
  const now = Date.now();
  const age = lastUpdate ? now - lastUpdate.getTime() : null;

  const isLive = age != null && age < LIVE_THRESHOLD_MS;
  const isOffline = age != null && age > OFFLINE_THRESHOLD_MS;

  /* =========================
     MAP INIT
  ========================= */
  useEffect(() => {
    mapRef.current = L.map("live-map", {
      center: [20.5937, 78.9629],
      zoom: 5,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(mapRef.current);

    mapRef.current.on("dragstart", () => setFollow(false));

    pathRef.current = L.polyline([], {
      color: "#22c55e",
      weight: 4,
      opacity: 0.8,
    }).addTo(mapRef.current);

    // IMPORTANT: fix flex-layout rendering
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 0);

    return () => mapRef.current?.remove();
  }, []);

  /* =========================
     SSE CONNECTION
  ========================= */
  useEffect(() => {
    if (!id) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = user?.token;
    if (!token) return;

    const url = `${API_BASE_URL}/api/vehicles/${id}/location/stream?token=${token}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (!d?.lat || !d?.lon) return;
        if (d.lat === 0 && d.lon === 0) return;

        const latLng = [d.lat, d.lon];
        setLastUpdate(new Date(d.recorded_at || Date.now()));

        setPoints((prev) => {
          if (prev.length) {
            const dist = haversine(prev[prev.length - 1], latLng);
            if (dist > 2) return prev; // anti-teleport
          }

          const next = [...prev.slice(-MAX_POINTS + 1), latLng];
          pathRef.current?.setLatLngs(next);
          return next;
        });

        const arrowIcon = L.divIcon({
          className: "vehicle-arrow",
          html: `
            <div style="
              transform: rotate(${d.heading_deg || 0}deg);
              font-size: 36px;
              font-weight: 900;
              color: ${isOffline ? "#6b7280" : "#22c55e"};
              text-shadow: 0 0 6px rgba(0,0,0,0.85);
            ">➤</div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        if (!markerRef.current) {
          markerRef.current = L.marker(latLng, { icon: arrowIcon }).addTo(mapRef.current);
          mapRef.current.setView(latLng, 16);
        } else {
          markerRef.current.setIcon(arrowIcon);
          markerRef.current.slideTo(latLng, { duration: 1000 });
          if (follow) mapRef.current.panTo(latLng);
        }

        if (accuracyRef.current) accuracyRef.current.remove();
        accuracyRef.current = L.circle(latLng, {
          radius: d.accuracy_m || 10,
          color: accuracyColor(d.accuracy_m),
          fillOpacity: 0.15,
        }).addTo(mapRef.current);

        setSseError(null);
      } catch {}
    };

    es.onerror = () => setSseError("Live stream disconnected");

    return () => es.close();
  }, [id, follow, isOffline]);

  /* =========================
     UI
  ========================= */
  return (
    <div className="flex flex-col bg-black text-white" style={{ minHeight: 'calc(100vh - 180px)' }}>
      {/* ================= HEADER ================= */}
      <div className="shrink-0 px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-xl font-bold text-center tracking-wide">
          Live Tracking
        </h1>

        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {isLive ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-500/60 font-semibold">
              <span className="animate-pulse">●</span>
              <Wifi size={14} /> LIVE
            </span>
          ) : isOffline ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-700/40 text-gray-400 border border-gray-600/60 font-semibold">
              <WifiOff size={14} /> OFFLINE
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">
              Last seen {Math.round(age / 1000)}s ago
            </span>
          )}
        </div>

        <div className="mt-1 text-xs text-center text-gray-400">
          Updated: {formatTs(lastUpdate)}
          {sseError && <span className="ml-2 text-amber-400">⚠ {sseError}</span>}
        </div>
      </div>

      {/* ================= MAP ================= */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        <div id="live-map" className="absolute inset-0" />
        
        {/* Recenter Button - Top Right */}
        <button
          onClick={() => {
            setFollow(true);
            if (points.length && mapRef.current) {
              mapRef.current.setView(points[points.length - 1], 16);
            }
          }}
          className={`absolute top-4 right-4 z-[1000] px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg ${
            follow 
              ? 'bg-emerald-600/80 text-white backdrop-blur-sm' 
              : 'bg-white/90 text-gray-800 hover:bg-white backdrop-blur-sm'
          }`}
        >
          {follow ? '📍 Following' : 'Recenter'}
        </button>
        
        {/* Intute.ai Branding */}
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
      
      <style>{`
        .leaflet-control-attribution {
          display: none !important;
        }
        .leaflet-container {
          z-index: 1;
        }
      `}</style>
    </div>
  );
}