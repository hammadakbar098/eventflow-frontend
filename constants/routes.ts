export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FEATURES: "/#features",
  HOW_IT_WORKS: "/#how-it-works",
  EXPLORE: "/events",
  INSPIRATION: "/#explore",
  EVENT: (slug: string) => `/events/${encodeURIComponent(slug)}`,
} as const;

// Set to "/dashboard" when the authenticated area and session lifecycle exist.
export const AUTH_SUCCESS_REDIRECT: string | null = null;
