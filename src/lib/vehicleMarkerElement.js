// Rotating-arrow marker for a vehicle's live position — shared between the
// single-vehicle live-track page and the fleet map. MapLibre markers are
// plain DOM elements (unlike Leaflet's divIcon), and MapLibre sets the
// `transform` CSS property directly on whatever element you pass it (to
// handle positioning) — so we must NOT put our own rotation transform on
// that same element, or we'd fight MapLibre for control of it. Instead we
// create an outer element (MapLibre's to position) wrapping an inner one
// (ours, for rotation/colour).
export function createVehicleMarkerElement({ live, headingDeg = 0, size = 36 }) {
  const outer = document.createElement("div");
  outer.style.width = `${size}px`;
  outer.style.height = `${size}px`;

  const inner = document.createElement("div");
  outer.appendChild(inner);

  updateVehicleMarkerElement(outer, { live, headingDeg, size });
  return outer;
}

// Updates an existing marker element in place (colour/rotation/size)
// without recreating it, so the DOM node stays stable across live-data
// updates. `outer` must be an element created by createVehicleMarkerElement.
//
// The arrow is a real inline SVG path (not a text glyph) — a Unicode
// arrow character renders with slightly different shape/weight across
// browsers and OSes, which looked crude up close. The SVG's own dark
// stroke keeps it readable against both the light Liberty basemap and
// satellite imagery, so no separate drop-shadow is needed.
export function updateVehicleMarkerElement(outer, { live, headingDeg = 0, size = 36 }) {
  const inner = outer.firstChild;
  const color = live ? "#22c55e" : "#6b7280";

  inner.style.width = `${size}px`;
  inner.style.height = `${size}px`;
  inner.style.display = "flex";
  inner.style.alignItems = "center";
  inner.style.justifyContent = "center";
  inner.style.transform = `rotate(${headingDeg || 0}deg)`;
  inner.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 2 L20 20 L12 15 L4 20 Z" fill="${color}" stroke="#0a0a0a" stroke-width="1.2" stroke-linejoin="round" /></svg>`;
}
