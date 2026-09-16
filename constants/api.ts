export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/+$/,
  "",
);
export const API_PROXY_PREFIX = "/backend";

type EventLifecycleEndpoint =
  "publish" | "postpone" | "reschedule" | "cancel" | "complete";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    LOGOUT_ALL: "/api/auth/logout-all",
  },
  USERS: {
    ME: "/api/users/me",
  },
  EVENTS: {
    LIST: "/api/events",
    MINE: "/api/events/mine",
    DETAIL: (slug: string) => `/api/events/${encodeURIComponent(slug)}`,
    MINE_DETAIL: (slug: string) =>
      `/api/events/mine/${encodeURIComponent(slug)}`,
    LIFECYCLE: (slug: string, action: EventLifecycleEndpoint) =>
      `/api/events/mine/${encodeURIComponent(slug)}/${action}`,
    MEDIA: (slug: string) =>
      `/api/events/mine/${encodeURIComponent(slug)}/media`,
    MEDIA_ITEM: (slug: string, mediaId: string) =>
      `/api/events/mine/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`,
    MEDIA_REORDER: (slug: string) =>
      `/api/events/mine/${encodeURIComponent(slug)}/media/reorder`,
  },
  EVENT_CATEGORIES: "/api/event-categories",
  TAGS: "/api/tags",
  VENUES: "/api/venues",
} as const;
