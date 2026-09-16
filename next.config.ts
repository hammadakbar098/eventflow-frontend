import type { NextConfig } from "next";
import { API_BASE_URL, API_ENDPOINTS, API_PROXY_PREFIX } from "./constants/api";
import { MEDIA_BASE_URL } from "./constants/media";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: MEDIA_BASE_URL ? [new URL(`${MEDIA_BASE_URL}/**`)] : [],
  },
  async rewrites() {
    // The existing Nest backend has no CORS middleware. Proxy only known API
    // endpoints, keeping the browser same-origin and the upstream configurable.
    if (!API_BASE_URL) return [];
    const url = new URL(API_BASE_URL);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
    }
    const endpoints = [
      ...Object.values(API_ENDPOINTS.AUTH),
      API_ENDPOINTS.EVENTS.LIST,
      `${API_ENDPOINTS.EVENTS.LIST}/:slug`,
      API_ENDPOINTS.EVENT_CATEGORIES,
      API_ENDPOINTS.TAGS,
    ];
    return endpoints.map((endpoint) => ({
      source: `${API_PROXY_PREFIX}${endpoint}`,
      destination: `${API_BASE_URL}${endpoint}`,
    }));
  },
};

export default nextConfig;
