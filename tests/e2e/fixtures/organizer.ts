import { expect, type Page, type Route } from "@playwright/test";
import type {
  EventStatus,
  OrganizerEvent,
  OrganizerEventSummary,
  PaginatedOrganizerEvents,
  Venue,
} from "../../../features/events/types/event.types";
import { categories, detail, summary } from "./events";

export const organizer = {
  id: "15ff5833-a323-4cba-8367-36ef2340e902",
  email: "alex@example.com",
  firstName: "Alex",
  lastName: "Morgan",
  role: "USER",
};

const statuses: EventStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "SCHEDULED",
  "POSTPONED",
  "SOLD_OUT",
  "CANCELLED",
  "COMPLETED",
];

export function organizerEvent(
  index: number,
  overrides: Partial<OrganizerEventSummary> = {},
): OrganizerEventSummary {
  return {
    ...summary,
    id: `organizer-event-${index}`,
    slug: `organizer-event-${index}`,
    title: `${summary.title} ${index + 1}`,
    format: (["HYBRID", "PHYSICAL", "ONLINE"] as const)[index % 3],
    venue: index % 3 === 2 ? null : summary.venue,
    status: statuses[index % statuses.length],
    createdAt: "2026-09-15T07:47:10.301Z",
    updatedAt: "2026-09-15T08:00:57.105Z",
    ...overrides,
  };
}

export function organizerListing(
  page = 1,
  overrides: Partial<PaginatedOrganizerEvents> = {},
): PaginatedOrganizerEvents {
  return {
    data: Array.from({ length: page === 1 ? 4 : 2 }, (_, index) =>
      organizerEvent(index + (page - 1) * 12),
    ),
    pagination: { page, limit: 12, total: 14, totalPages: 2 },
    ...overrides,
  };
}

export const venues: Venue[] = [
  {
    id: "91915ee4-1c34-43ac-ae08-3c4764b56553",
    name: "Riverside Hall",
    addressLine1: "Nürnberger Str. 1",
    addressLine2: null,
    city: "Bamberg",
    state: null,
    postalCode: "96050",
    countryCode: "DE",
    latitude: null,
    longitude: null,
  },
  {
    id: "91c53626-e857-4471-a2f6-08c95102420f",
    name: "Eventflow Conference Center",
    addressLine1: "Lange Str. 20",
    addressLine2: null,
    city: "Bamberg",
    state: null,
    postalCode: "96047",
    countryCode: "DE",
    latitude: "49.8917",
    longitude: "10.8868",
  },
];

export async function mockMyEvents(
  page: Page,
  respond?: (route: Route) => Promise<void>,
) {
  await page.route(
    /\/backend\/api\/events\/mine(?:\?|$)/,
    respond ??
      ((route) =>
        route.fulfill({
          json: organizerListing(
            Number(
              new URL(route.request().url()).searchParams.get("page") ?? 1,
            ),
          ),
        })),
  );
}

export async function mockOrganizerReferences(page: Page) {
  await page.route("**/backend/api/event-categories", (route) =>
    route.fulfill({ json: categories }),
  );
  await page.route(/\/backend\/api\/venues(?:\?|$)/, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const search =
      new URL(route.request().url()).searchParams
        .get("search")
        ?.toLowerCase() ?? "";
    const data = venues.filter((venue) =>
      `${venue.name} ${venue.city}`.toLowerCase().includes(search),
    );
    return route.fulfill({
      json: {
        data,
        pagination: {
          page: 1,
          limit: 20,
          total: data.length,
          totalPages: data.length ? 1 : 0,
        },
      },
    });
  });
}

/** Signs in through the real login form; the session exists only in memory. */
export async function signIn(page: Page) {
  await page.route("**/backend/api/auth/login", (route) =>
    route.fulfill({
      json: {
        user: organizer,
        accessToken: "organizer-access-token",
        refreshToken: "organizer-refresh-token",
      },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill(organizer.email);
  await page.getByLabel("Password", { exact: true }).fill("Example123$");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/events(?:\?|$)/);
}

/** A private organizer event, as returned by GET /api/events/mine/:slug. */
export function organizerDetail(
  overrides: Partial<OrganizerEvent> = {},
): OrganizerEvent {
  return {
    ...detail,
    slug: "organizer-event-0",
    title: "Future of AI Conference 1",
    status: "DRAFT",
    format: "HYBRID",
    startAt: "2099-11-20T17:00:00.000Z",
    endAt: "2099-11-20T20:00:00.000Z",
    cancelledAt: null,
    cancellationReason: null,
    postponedAt: null,
    postponementReason: null,
    venue: venues[0],
    onlineDetails: {
      platform: "Microsoft Teams",
      accessUrl: "https://teams.microsoft.com/l/meetup-join/example",
      accessCode: "AI2099",
      accessInstructions: "Join 10 minutes early.",
    },
    media: [
      {
        id: "7a4d2f3e-1c1f-4d7e-9a0b-000000000001",
        type: "COVER",
        storageKey: "/images/event-conference.jpg",
        altText: "A conference room ready for guests",
        width: 1600,
        height: 900,
        sortOrder: 0,
        originalName: "cover.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 245000,
      },
      {
        id: "7a4d2f3e-1c1f-4d7e-9a0b-000000000002",
        type: "GALLERY",
        storageKey: "/images/event-crowd.jpg",
        altText: "A crowd beneath the lights",
        width: 1200,
        height: 800,
        sortOrder: 0,
        originalName: "crowd.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 180000,
      },
      {
        id: "7a4d2f3e-1c1f-4d7e-9a0b-000000000003",
        type: "GALLERY",
        storageKey: "/images/event-dinner.jpg",
        altText: null,
        width: null,
        height: null,
        sortOrder: 1,
        originalName: null,
        mimeType: "image/jpeg",
        sizeBytes: null,
      },
      {
        id: "7a4d2f3e-1c1f-4d7e-9a0b-000000000004",
        type: "GALLERY",
        storageKey: "/images/event-art.jpg",
        altText: "A detailed classical painting",
        width: 1200,
        height: 900,
        sortOrder: 2,
        originalName: "art.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 210000,
      },
    ],
    ...overrides,
  };
}

/** Serves one private event; the handler can replace the default GET. */
export async function mockMyEvent(
  page: Page,
  event: () => OrganizerEvent,
  respond?: (route: Route) => Promise<void>,
) {
  await page.route(
    new RegExp(`/backend/api/events/mine/${event().slug}(?:[/?].*)?$`),
    respond ??
      ((route) =>
        route.request().method() === "GET"
          ? route.fulfill({ json: event() })
          : route.fallback()),
  );
}
