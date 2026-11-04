import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

let inflightRefresh = null;

/**
 * POSTs /api/auth/refresh, deduping concurrent callers onto a single
 * in-flight request. The axios 401 interceptor and every open SSE stream's
 * own error handler all call this independently — without dedup, one
 * access-token expiry with several streams open at once would fire a
 * refresh per stream. Resolves with the response on success. Rejects with
 * the axios error on failure; callers distinguish "refresh token invalid"
 * (err.response?.status === 401, i.e. the session is genuinely over) from
 * "no network" (!err.response, i.e. retry later) to decide whether to log
 * the user out.
 */
export function refreshAccessToken() {
  if (!inflightRefresh) {
    inflightRefresh = axios
      .post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true, _retry: true })
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}
