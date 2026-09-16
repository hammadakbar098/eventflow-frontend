import type { Page, Route } from "@playwright/test";
import type {
  EventSummary,
  PaginatedEvents,
  PublicEvent,
} from "../../../features/events/types/event.types";

export const categories = [
  {
    id: "cfd5601c-e691-40b8-82a6-ba931750cf04",
    name: "Technology",
    slug: "technology",
    description: "Ideas worth sharing.",
  },
  {
    id: "722bc563-b0b9-497c-8915-4a3b712614f5",
    name: "Community",
    slug: "community",
    description: null,
  },
];
export const tags = [
  { id: "ed17f55e-d2ed-4ecb-b91a-cb48e0114a62", name: "AI", slug: "ai" },
  {
    id: "03546a59-6e6b-41e9-a203-b27c2130c20c",
    name: "Networking",
    slug: "networking",
  },
];
export const detail: PublicEvent = {
  id: "b697a68f-dc04-4c01-8e58-de9e98c06d44",
  title: "Future of AI Conference",
  slug: "future-of-ai",
  description:
    "A conversation about ideas that bring us together.\n\nMeet the people shaping what comes next.",
  status: "PUBLISHED",
  format: "HYBRID",
  startAt: "2026-11-20T17:00:00.000Z",
  endAt: "2026-11-20T20:00:00.000Z",
  timezone: "Europe/Berlin",
  capacity: 300,
  createdAt: "2026-09-15T07:47:10.301Z",
  updatedAt: "2026-09-15T08:00:57.105Z",
  organizer: {
    id: "15ff5833-a323-4cba-8367-36ef2340e902",
    firstName: "Alex",
    lastName: "Morgan",
  },
  category: categories[0],
  venue: {
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
  media: [],
  tags,
  onlineDetails: { platform: "Microsoft Teams" },
};
export const summary: EventSummary = {
  id: detail.id,
  title: detail.title,
  slug: detail.slug,
  format: detail.format,
  startAt: detail.startAt,
  endAt: detail.endAt,
  timezone: detail.timezone,
  capacity: detail.capacity,
  category: detail.category,
  venue: detail.venue,
  tags,
  coverImage: null,
};
export function listing(
  page = 1,
  overrides?: Partial<PaginatedEvents>,
): PaginatedEvents {
  return {
    data:
      page === 1
        ? [summary]
        : [
            {
              ...summary,
              id: "second-event",
              slug: "shared-table",
              title: "The Shared Table",
            },
          ],
    pagination: { page, limit: 12, total: 25, totalPages: 3 },
    ...overrides,
  };
}
export async function mockReferences(page: Page) {
  await page.route("**/backend/api/event-categories", (route) =>
    route.fulfill({ json: categories }),
  );
  await page.route("**/backend/api/tags*", (route) => {
    const search =
      new URL(route.request().url()).searchParams
        .get("search")
        ?.toLowerCase() ?? "";
    return route.fulfill({
      json: tags.filter((tag) => tag.name.toLowerCase().includes(search)),
    });
  });
}
export async function mockEvents(
  page: Page,
  respond?: (route: Route) => Promise<void>,
) {
  await mockReferences(page);
  await page.route(
    /\/backend\/api\/events(?:\?|$)/,
    respond ??
      ((route) =>
        route.fulfill({
          json: listing(
            Number(
              new URL(route.request().url()).searchParams.get("page") ?? 1,
            ),
          ),
        })),
  );
  await page.route("**/backend/api/events/future-of-ai", (route) =>
    route.fulfill({ json: detail }),
  );
}
