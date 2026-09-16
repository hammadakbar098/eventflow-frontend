import axios from "axios";
import { API_BASE_URL, API_PROXY_PREFIX } from "@/constants/api";

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

// Access tokens deliberately live only in memory. Persistent sessions and refresh
// require a backend refresh/logout contract, which is not implemented yet.
export function setAccessToken(token: string | null) {
  if (token)
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete apiClient.defaults.headers.common.Authorization;
}
