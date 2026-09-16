import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";
import { API_BASE_URL, API_ENDPOINTS, API_PROXY_PREFIX } from "@/constants/api";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Requests that must never trigger a session refresh (auth endpoints). */
    skipSessionRefresh?: boolean;
    /** Set once a request has been retried after refreshing. */
    sessionRetried?: boolean;
  }
}

// One client for every service. Browser requests use the Next.js upstream proxy.
export const apiClient = axios.create({
  baseURL: typeof window === "undefined" ? API_BASE_URL : API_PROXY_PREFIX,
  timeout: 15_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (!API_BASE_URL) throw new Error("API_NOT_CONFIGURED");
  return config;
});

// Tokens deliberately live only in memory: nothing is written to browser storage,
// so a full page reload ends the session.
type SessionChange = "signed-in" | "refreshed" | "signed-out";
let accessToken: string | null = null;
let refreshToken: string | null = null;
const accessTokenListeners = new Set<(change: SessionChange) => void>();

function applyTokens(
  tokens: { accessToken: string | null; refreshToken?: string | null },
  change: SessionChange,
) {
  accessToken = tokens.accessToken;
  if (tokens.refreshToken !== undefined) refreshToken = tokens.refreshToken;
  if (accessToken)
    apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  else delete apiClient.defaults.headers.common.Authorization;
  accessTokenListeners.forEach((listener) => listener(change));
}

export function setAccessToken(token: string | null) {
  applyTokens(
    { accessToken: token, refreshToken: token ? undefined : null },
    token ? "signed-in" : "signed-out",
  );
}

export function setSession(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  applyTokens(tokens, "signed-in");
}

export function clearSession() {
  applyTokens({ accessToken: null, refreshToken: null }, "signed-out");
}

// The token itself never leaves this module; consumers only observe presence.
export function hasAccessToken() {
  return accessToken !== null;
}

export function getRefreshToken() {
  return refreshToken;
}

/** Listeners learn whether the session started, rotated or ended. */
export function subscribeToAccessToken(
  listener: (change: SessionChange) => void,
) {
  accessTokenListeners.add(listener);
  return () => {
    accessTokenListeners.delete(listener);
  };
}

const refreshedTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
let refreshing: Promise<string | null> | null = null;

// Single flight: concurrent 401s share one refresh, so rotation never races.
function refreshSession() {
  const token = refreshToken;
  if (!token) return Promise.resolve(null);
  refreshing ??= apiClient
    .post<unknown>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken: token },
      { skipSessionRefresh: true, headers: { Authorization: undefined } },
    )
    .then(({ data }) => {
      const tokens = refreshedTokensSchema.parse(data);
      applyTokens(tokens, "refreshed");
      return tokens.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// An expired access token is refreshed once and the request retried once.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
  const config = error.config as InternalAxiosRequestConfig | undefined;
  const sent = config && AxiosHeaders.from(config.headers).get("Authorization");
  if (!config || !sent || config.skipSessionRefresh || config.sessionRetried)
    throw error;
  // Another request may already have refreshed while this one was in flight.
  const next =
    accessToken && `Bearer ${accessToken}` !== sent
      ? accessToken
      : await refreshSession();
  if (!next) throw error;
  config.sessionRetried = true;
  config.headers.set("Authorization", `Bearer ${next}`);
  return apiClient(config);
});
