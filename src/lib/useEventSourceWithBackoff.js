import { useEffect, useRef, useState } from "react";
import { refreshAccessToken } from "./authRefresh";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/**
 * Opens an EventSource and manages reconnection with exponential backoff
 * (1s, 2s, 4s, ... capped at 30s), resetting to the base delay after every
 * successful open. The browser's native EventSource already retries
 * automatically, but always after a fixed ~3s delay with no backoff and no
 * way to surface connection state to the UI — this replaces that with an
 * explicit reconnect loop so a sustained outage doesn't hammer the server,
 * and so callers can show a "reconnecting" indicator.
 *
 * EventSource can't see *why* a connection failed — no HTTP status is ever
 * exposed to `onerror`. In practice the two causes are an expired access
 * token (the only thing keeping a long-open tab "alive" — very common) or a
 * genuine network blip. So on every error this refreshes the access token
 * before reconnecting: harmless when the token was still valid (refresh
 * just re-issues it), and the only way to recover when it wasn't — a stale
 * token would otherwise reconnect forever and 401 forever, with the UI
 * stuck on "Reconnecting..." indefinitely (confirmed live on production).
 * If refresh itself comes back 401, the session is genuinely over — retrying
 * would just repeat that forever, so this gives up and signals the app to
 * send the user back to login via an `auth:logout` window event (mirroring
 * the existing `auth:login` event dispatched by LoginModal).
 *
 * `onMessage` is read via a ref on every call, so passing a fresh function
 * each render (closing over current props/state) does NOT tear down and
 * reopen the connection — only a change to `url` or `enabled` does that.
 *
 * @param {string} url
 * @param {(e: MessageEvent) => void} onMessage
 * @param {{ enabled?: boolean }} [options] - set enabled:false to hold off
 *   opening a connection at all (e.g. while an access check is pending).
 * @returns {"connecting"|"open"|"reconnecting"|"disabled"} current status
 */
export function useEventSourceWithBackoff(url, onMessage, { enabled = true } = {}) {
  const [status, setStatus] = useState(enabled ? "connecting" : "disabled");
  const timeoutRef = useRef(null);
  const delayRef = useRef(BASE_DELAY_MS);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !url) {
      setStatus("disabled");
      return;
    }

    let cancelled = false;
    let es = null;

    function scheduleReconnect() {
      const delay = delayRef.current;
      delayRef.current = Math.min(delay * 2, MAX_DELAY_MS);
      timeoutRef.current = setTimeout(connect, delay);
    }

    function connect() {
      if (cancelled) return;

      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        if (cancelled) return;
        delayRef.current = BASE_DELAY_MS; // reset backoff after a real connection
        setStatus("open");
      };

      es.onmessage = (e) => {
        if (cancelled) return;
        onMessageRef.current?.(e);
      };

      es.onerror = () => {
        if (cancelled) return;
        es.close();
        setStatus("reconnecting");

        refreshAccessToken()
          .then(() => {
            if (cancelled) return;
            // Token's good (or just got re-issued) — give reconnecting a
            // fresh, short run rather than carrying over a possibly-long
            // backoff accumulated before the refresh fixed things.
            delayRef.current = BASE_DELAY_MS;
            timeoutRef.current = setTimeout(connect, BASE_DELAY_MS);
          })
          .catch((err) => {
            if (cancelled) return;
            if (err.response?.status === 401) {
              // Refresh token is also invalid/expired — the session is
              // genuinely over. This is the one case where retrying is
              // pointless: every future attempt would 401 the same way.
              clearTimeout(timeoutRef.current);
              setStatus("disabled");
              window.dispatchEvent(new CustomEvent("auth:logout"));
              return;
            }
            // Refresh didn't even get a response (offline, DNS, server
            // down) — not an auth problem, fall back to normal backoff.
            scheduleReconnect();
          });
      };
    }

    setStatus("connecting");
    delayRef.current = BASE_DELAY_MS;
    connect();

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      es?.close();
    };
  }, [url, enabled]);

  return status;
}
