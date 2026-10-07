// Animates a MapLibre marker smoothly from its current position to a new
// one over `durationMs`, replacing what the Leaflet `slideTo` plugin used
// to do (MapLibre has no built-in equivalent). Cancels any in-progress
// animation for the same marker before starting a new one, so a fast burst
// of live updates doesn't stack multiple competing animation loops.
const activeAnimations = new WeakMap(); // marker -> requestAnimationFrame id

export function smoothMarkerMove(marker, [toLng, toLat], durationMs = 1000) {
  const existingFrame = activeAnimations.get(marker);
  if (existingFrame != null) cancelAnimationFrame(existingFrame);

  const { lng: fromLng, lat: fromLat } = marker.getLngLat();
  const start = performance.now();

  function step(now) {
    const t = Math.min((now - start) / durationMs, 1);
    const lng = fromLng + (toLng - fromLng) * t;
    const lat = fromLat + (toLat - fromLat) * t;
    marker.setLngLat([lng, lat]);

    if (t < 1) {
      activeAnimations.set(marker, requestAnimationFrame(step));
    } else {
      activeAnimations.delete(marker);
    }
  }

  activeAnimations.set(marker, requestAnimationFrame(step));
}
