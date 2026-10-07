import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre coordinate order is [lng, lat] (GeoJSON order), NOT Leaflet's
// [lat, lng] — every caller of this hook needs to convert at the boundary.
export const INDIA_CENTER = [78.9629, 20.5937];

// Two selectable basemaps. "map" (Bright, via OpenFreeMap — free, no key)
// is the default; "satellite" (Esri World Imagery — free, no key) is a
// fallback for locations where OpenStreetMap simply has little/no data
// mapped (common at rural/industrial sites this fleet operates in), where
// no vector style can show detail that was never tagged in the source data
// — real aerial imagery shows the ground regardless.
//
// Bright (not Liberty) — Liberty's style omits a fill for
// `landuse=industrial` polygons entirely (checked its style JSON: only
// residential/pitch/track/cemetery/hospital/school get a landuse fill),
// so industrial/mining site boundaries — exactly what this fleet's
// vehicles sit inside — were invisible. Bright does render that class,
// confirmed by rendering both at a real vehicle's coordinates.
const MAP_STYLES = {
  map: "https://tiles.openfreemap.org/styles/bright",
  satellite: {
    version: 8,
    sources: {
      "esri-satellite": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri, Maxar, Earthstar Geographics",
        // Esri's real imagery resolution varies hugely by location — rural/
        // industrial sites (where this fleet operates) often have no
        // captured imagery past z18, and Esri's tile server doesn't signal
        // that via a 404: it returns the exact same "Map data not yet
        // available" placeholder image for every zoom beyond what it has,
        // which looked broken when a user zoomed in past it (confirmed by
        // fetching real tiles: z19/z20/z21 at a real vehicle's coordinates
        // came back byte-for-byte identical). Declaring maxzoom here makes
        // MapLibre stop requesting new tiles past z18 and instead upscale
        // the last real one — a normal "zoomed in further than the photo's
        // detail" look, not a blank error state.
        maxzoom: 18,
      },
    },
    layers: [
      { id: "esri-satellite-layer", type: "raster", source: "esri-satellite" },
    ],
  },
};

const LOAD_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 5_000;

// MapLibre has no "style.load" event (a plausible-sounding name that does
// NOT exist in its public event list — `load`, `styledata`, `idle`, etc.
// do). `styledata`+isStyleLoaded() polling — the idiom usually recommended
// for this — turned out unreliable here too: `styledata` doesn't
// necessarily fire again at the exact moment `isStyleLoaded()` flips true,
// so the listener can go uncalled. `idle` (no pending style/source loads,
// nothing left to render) is slower to fire but actually reliable, and
// "slightly slower" costs nothing here — the callers (re-adding a trail
// source, boosting a paint colour, refetching markers) aren't latency
// sensitive.
function onceStyleLoaded(map, callback) {
  map.once("idle", callback);
}

const SITE_FILL_COLOR = "#c9a3d9";
const SITE_FILL_OPACITY = 0.5;

// Bright's own `landuse-industrial` fill is a pale cream at low opacity —
// present, but too subtle to read as a distinct site boundary at a glance.
// Boosted here to a bolder violet, matching the convention classic OSM
// "Standard" cartography uses for industrial landuse (the look this app's
// old raster basemap had, before the MapLibre migration).
//
// Bright also has no layer at all for `landuse=quarry` or
// `landuse=construction` — relevant since this fleet runs excavators and
// other mining-style equipment, and a site may be tagged one of those
// classes in OSM rather than "industrial". The underlying vector data
// (OpenMapTiles' `landuse` source-layer, same source Bright's own
// `landuse-industrial` layer reads from) already carries those classes —
// Bright's style author just never added a layer to paint them. Adding one
// here, right below the existing industrial layer so both read as the same
// kind of "site boundary" fill.
//
// Both no-op safely on the satellite style, which has neither the
// `landuse-industrial` layer nor the `openmaptiles` source at all.
function boostIndustrialLanduse(map) {
  if (map.getLayer("landuse-industrial")) {
    map.setPaintProperty("landuse-industrial", "fill-color", SITE_FILL_COLOR);
    map.setPaintProperty("landuse-industrial", "fill-opacity", SITE_FILL_OPACITY);

    if (!map.getLayer("landuse-quarry-construction") && map.getSource("openmaptiles")) {
      map.addLayer(
        {
          id: "landuse-quarry-construction",
          type: "fill",
          source: "openmaptiles",
          "source-layer": "landuse",
          filter: [
            "all",
            ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false],
            ["match", ["get", "class"], ["quarry", "construction"], true, false],
          ],
          paint: {
            "fill-color": SITE_FILL_COLOR,
            "fill-opacity": SITE_FILL_OPACITY,
          },
        },
        "landuse-industrial"
      );
    }
  }
}

/**
 * Creates and owns a MapLibre map instance mounted on `elementId`. Retries
 * automatically if the style fails to load within LOAD_TIMEOUT_MS (e.g. an
 * OpenFreeMap outage), matching the reconnect philosophy already used for
 * this app's SSE connections — a flaky third party never permanently
 * strands the user.
 *
 * `onLoad(map)` fires once per successful NEW map instance — initial mount
 * or a failure-retry (since a failed map is fully removed, not reused).
 * Callers that add their own sources/layers/markers must do so inside
 * `onLoad`, not at call time, because MapLibre requires the style to be
 * loaded first. A caller whose `onLoad` also resets marker state (correct
 * for a genuinely new map instance) should NOT rely on `onLoad` firing for
 * a plain basemap switch — see `onStyleReload` below for that case, which
 * deliberately does not touch marker state since the map instance and its
 * markers (plain DOM overlays, independent of the style) are unchanged.
 *
 * `onStyleReload(map)` fires after `setStyleMode()` switches the basemap on
 * the SAME map instance. `setStyle()` wipes any custom GeoJSON
 * sources/layers a caller added (e.g. a trail line), so callers that need
 * those re-added after a switch do it here, not in `onLoad`.
 *
 * Both callbacks are read via refs internally, so passing fresh functions
 * each render does not tear down the map or re-trigger anything.
 *
 * Returns `{ mapRef, failed, styleMode, setStyleMode }`: `mapRef.current`
 * is null until the map is first created; `failed` is true while a retry
 * is pending; `styleMode` is `"map"` or `"satellite"`.
 */
export function useMapLibreMap(elementId, { center = INDIA_CENTER, zoom = 5, onLoad, onStyleReload } = {}) {
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [styleMode, setStyleModeState] = useState("map");
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const onStyleReloadRef = useRef(onStyleReload);
  onStyleReloadRef.current = onStyleReload;
  // Read by init() so a failure-retry re-creates the map with whatever
  // style the user currently has selected, not always the initial default.
  const styleModeRef = useRef("map");

  useEffect(() => {
    let cancelled = false;
    let loadTimeout;
    let retryTimeout;

    function init() {
      const map = new maplibregl.Map({
        container: elementId,
        style: MAP_STYLES[styleModeRef.current],
        center,
        zoom,
        attributionControl: false,
        // Default MapLibre scroll-zoom anchors around wherever the cursor
        // currently is, re-measured on every wheel tick — if the cursor
        // isn't perfectly still (easy when it's sitting over a small
        // marker or a boundary edge), the anchor drifts with it, so
        // zooming back out can land somewhere unexpected. Anchoring to the
        // map's center instead makes zoom direction predictable regardless
        // of what's under the cursor.
        scrollZoom: { around: "center" },
      });
      mapRef.current = map;

      // The old Leaflet pages had explicit tap +/- zoom buttons — lost in
      // the MapLibre migration (only scroll-wheel/pinch remained). Restoring
      // with MapLibre's built-in control; no compass/rotate button, since
      // the old UI never had one and this app doesn't use map rotation.
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

      loadTimeout = setTimeout(() => {
        if (cancelled) return;
        setFailed(true);
        map.remove();
        mapRef.current = null;
        retryTimeout = setTimeout(init, RETRY_DELAY_MS);
      }, LOAD_TIMEOUT_MS);

      map.once("load", () => {
        // mapRef.current !== map guards against a load event firing after
        // the load-timeout path already removed this instance and retried.
        if (cancelled || mapRef.current !== map) return;
        clearTimeout(loadTimeout);
        setFailed(false);
        boostIndustrialLanduse(map);
        onLoadRef.current?.(map);
      });
    }

    init();

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      clearTimeout(retryTimeout);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Deliberately only re-running on elementId change (mount/unmount in
    // practice) — center/zoom are just initial-view defaults, and the
    // callbacks are already read via refs, same pattern as
    // useEventSourceWithBackoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  const setStyleMode = useCallback((mode) => {
    if (!MAP_STYLES[mode]) return;
    styleModeRef.current = mode;
    setStyleModeState(mode);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(MAP_STYLES[mode]);
    onceStyleLoaded(map, () => {
      boostIndustrialLanduse(map);
      onStyleReloadRef.current?.(map);
    });
  }, []);

  return { mapRef, failed, styleMode, setStyleMode };
}
