export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/+$/,
  "",
);
export const API_PROXY_PREFIX = "/backend";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
  },
  EVENTS: {
    LIST: "/api/events",
    DETAIL: (slug: string) => `/api/events/${encodeURIComponent(slug)}`,
  },
  EVENT_CATEGORIES: "/api/event-categories",
  TAGS: "/api/tags",
} as const;
