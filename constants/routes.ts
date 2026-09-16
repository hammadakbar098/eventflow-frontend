export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FEATURES: "/#features",
  HOW_IT_WORKS: "/#how-it-works",
  EXPLORE: "/events",
  INSPIRATION: "/#explore",
  EVENT: (slug: string) => `/events/${encodeURIComponent(slug)}`,
  DASHBOARD: "/dashboard",
  ACCOUNT: "/account",
  MY_EVENTS: "/dashboard/events",
  CREATE_EVENT: "/dashboard/events/new",
  MANAGE_EVENT: (slug: string) =>
    `/dashboard/events/${encodeURIComponent(slug)}`,
  EDIT_EVENT: (slug: string) =>
    `/dashboard/events/${encodeURIComponent(slug)}/edit`,
} as const;

// Sessions live in memory, so the workspace must be reached by in-app navigation.
export const AUTH_SUCCESS_REDIRECT: string | null = ROUTES.MY_EVENTS;
