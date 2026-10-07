import { useEffect, useRef, useState } from "react";

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

        const delay = delayRef.current;
        delayRef.current = Math.min(delay * 2, MAX_DELAY_MS);
        timeoutRef.current = setTimeout(connect, delay);
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
