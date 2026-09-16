import { test } from "node:test";
import assert from "node:assert/strict";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import {
  eventSummarySchema,
  paginatedEventsSchema,
  publicEventSchema,
} from "../../features/events/schemas/event.schema";
import {
  eventFilterParams,
  eventFiltersSearchParams,
  hasEventFilters,
  normalizeFilterDate,
  parseEventFilters,
} from "../../features/events/utils/event-filters";
import {
  eventLocation,
  eventTimeZone,
  formatEventDate,
  formatEventTime,
  getEventCover,
  getEventGallery,
} from "../../features/events/utils/event-display";

// Contracts: Nest EventQueryDto, EventsService.findPublicUpcoming/findPublicBySlug,
// and EventReferencesService. All records below are synthetic public responses.
const firstTag = "11111111-1111-4111-8111-111111111111";
const secondTag = "22222222-2222-4222-8222-222222222222";
const legacyTag = "33333333-3333-1333-8333-333333333333";
const categoryId = "44444444-4444-4444-8444-444444444444";
const summary = {
  id: "event-one",
  title: "An evening of ideas",
  slug: "an-evening-of-ideas",
  format: "HYBRID",
  startAt: "2027-06-01T17:00:00.000Z",
  endAt: "2027-06-01T19:00:00.000Z",
  timezone: "Europe/Berlin",
  capacity: 120,
  category: { id: categoryId, name: "Talks", slug: "talks" },
  tags: [{ id: firstTag, name: "Design", slug: "design" }],
  venue: {
    id: "venue-one",
    name: "The Assembly",
    city: "Berlin",
    countryCode: "DE",
  },
  coverImage: null,
};
const detail = {
  ...summary,
  description: "An evening for exchanging ideas.",
  status: "PUBLISHED",
  createdAt: "2026-09-16T09:00:00.000Z",
  updatedAt: "2026-09-16T09:00:00.000Z",
  venue: {
    ...summary.venue,
    addressLine1: "1 Example Street",
    addressLine2: null,
    state: "Berlin",
    postalCode: "10115",
    latitude: "52.5321",
    longitude: "13.3849",
  },
  organizer: { id: "organizer-one", firstName: "Alex", lastName: "Morgan" },
  media: [],
  onlineDetails: { platform: "Zoom" },
};

test("invalid URL values cannot produce a rejected pagination or filter request", () => {
  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "2e3",
    "9007199254740992",
  ]) {
    assert.deepEqual(
      parseEventFilters(new URLSearchParams({ page: value, limit: value })),
      {
        page: 1,
        limit: 12,
      },
      value,
    );
  }
  assert.deepEqual(
    parseEventFilters(new URLSearchParams({ page: "3", limit: "50" })),
    { page: 3, limit: 50 },
  );
  assert.equal(parseEventFilters(new URLSearchParams("limit=51")).limit, 12);
  assert.deepEqual(
    parseEventFilters(
      new URLSearchParams({
        search: "  ",
        city: "",
        format: "IN_PERSON",
        countryCode: "Germany",
        categoryId: "category-one",
        tagId: "not-a-uuid",
        tagIds: "bad-id",
        startFrom: "2026-02-30",
        startTo: "tomorrow",
      }),
    ),
    { page: 1, limit: 12 },
  );
});

test("URL filters normalize useful values within Nest's request limits", () => {
  const filters = parseEventFilters(
    new URLSearchParams({
      page: "02",
      limit: "24",
      search: "  Evening ideas  ",
      city: "  Berlin ",
      countryCode: " de ",
      format: "hybrid",
      categoryId,
    }),
  );
  assert.deepEqual(filters, {
    page: 2,
    limit: 24,
    search: "Evening ideas",
    city: "Berlin",
    countryCode: "DE",
    format: "HYBRID",
    categoryId,
  });
  const longText = parseEventFilters(
    new URLSearchParams({ search: "x".repeat(101), city: "y".repeat(101) }),
  );
  assert.equal(longText.search, "x".repeat(100));
  assert.equal(longText.city, "y".repeat(100));
  assert.equal(hasEventFilters({ page: 4, limit: 24 }), false);
  assert.equal(hasEventFilters(filters), true);
});

test("single tags permit UUID versions accepted by Nest while multiple tags require unique v4 UUIDs", () => {
  const params = new URLSearchParams({ tagId: legacyTag });
  params.append("tagIds", `${secondTag}, ${firstTag},${legacyTag},bad-id`);
  params.append("tagIds", firstTag);
  const filters = parseEventFilters(params);
  assert.equal(filters.tagId, legacyTag);
  assert.deepEqual(filters.tagIds, [firstTag, secondTag]);
  const serialized = eventFilterParams(filters);
  assert.equal(serialized.tagId, legacyTag);
  assert.equal(serialized.tagIds, `${firstTag},${secondTag}`);
  const url = eventFiltersSearchParams(filters);
  assert.deepEqual(url.getAll("tagIds"), [`${firstTag},${secondTag}`]);
  assert.equal(url.has("tagIds[]"), false);
  assert.deepEqual(parseEventFilters(url), filters);
  assert.deepEqual(
    parseEventFilters(new URLSearchParams({ tagIds: firstTag })).tagIds,
    [firstTag],
  );
});

test("date-only filters use UTC day boundaries including the final millisecond", () => {
  assert.deepEqual(
    parseEventFilters(
      new URLSearchParams({
        startFrom: "2028-02-29",
        startTo: "2028-02-29",
      }),
    ),
    {
      page: 1,
      limit: 12,
      startFrom: "2028-02-29T00:00:00.000Z",
      startTo: "2028-02-29T23:59:59.999Z",
    },
  );
  assert.equal(
    normalizeFilterDate("2026-09-16", true),
    "2026-09-16T23:59:59.999Z",
  );
  for (const date of [
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-09-00",
    "2026-09-16T25:00:00Z",
    "2026-09-16T12:00:00",
    "next Tuesday",
  ]) {
    assert.equal(normalizeFilterDate(date), undefined, date);
  }
});

test("explicit ISO offsets preserve the instant, even across calendar days", () => {
  assert.equal(
    normalizeFilterDate("2026-09-16T00:30:00+02:00"),
    "2026-09-15T22:30:00.000Z",
  );
  assert.equal(
    normalizeFilterDate("2026-09-16T23:30:00-04:00", true),
    "2026-09-17T03:30:00.000Z",
  );
  assert.equal(
    normalizeFilterDate("2026-09-16T12:30:00.123Z", true),
    "2026-09-16T12:30:00.123Z",
  );
});

test("reversed date ranges drop the invalid upper bound instead of sending a backend 400", () => {
  assert.equal(
    parseEventFilters(new URLSearchParams("startTo=2000-01-01")).startTo,
    undefined,
  );
  const reversed = parseEventFilters(
    new URLSearchParams({ startFrom: "2027-06-03", startTo: "2027-06-01" }),
  );
  assert.equal(reversed.startFrom, "2027-06-03T00:00:00.000Z");
  assert.equal(reversed.startTo, undefined);
  assert.equal(eventFiltersSearchParams(reversed).has("startTo"), false);
  // Lexical input order is misleading: compare normalized instants instead.
  const sameDay = parseEventFilters(
    new URLSearchParams({
      startFrom: "2027-06-01T23:30:00-04:00",
      startTo: "2027-06-02T00:30:00+02:00",
    }),
  );
  assert.equal(sameDay.startTo, undefined);
});

test("event dates use the event timezone instead of the viewer's calendar day", () => {
  assert.equal(
    formatEventDate("2026-06-01T23:30:00Z", "Europe/Berlin"),
    "2 Jun 2026",
  );
  assert.equal(
    formatEventDate("2026-09-16T00:30:00Z", "America/Los_Angeles"),
    "15 Sept 2026",
  );
  assert.equal(
    formatEventDate("2026-06-01T23:30:00Z", "Europe/Berlin", "long"),
    "Tuesday, 2 June 2026",
  );
});

test("event times respect both skipped and repeated Berlin daylight-saving hours", () => {
  assert.match(
    formatEventTime("2026-03-29T00:30:00Z", "Europe/Berlin"),
    /^01:30 /,
  );
  assert.match(
    formatEventTime("2026-03-29T01:30:00Z", "Europe/Berlin"),
    /^03:30 /,
  );
  const summer = formatEventTime("2026-10-25T00:30:00Z", "Europe/Berlin");
  const winter = formatEventTime("2026-10-25T01:30:00Z", "Europe/Berlin");
  assert.match(summer, /^02:30 /);
  assert.match(winter, /^02:30 /);
  assert.notEqual(
    summer,
    winter,
    "Repeated clock times must identify distinct timezone offsets",
  );
  assert.equal(eventTimeZone("Unknown/Zone"), "UTC");
  assert.match(
    formatEventTime("2026-09-16T00:30:00Z", "Unknown/Zone"),
    /^00:30 /,
  );
  assert.equal(
    formatEventDate("not-a-date", "Europe/Berlin"),
    "Date to be confirmed",
  );
  assert.equal(
    formatEventTime("not-a-date", "Europe/Berlin"),
    "Time to be confirmed",
  );
});

test("public schema accepts backend nulls and absent media without inventing event assets", () => {
  const event = publicEventSchema.parse({
    ...detail,
    media: undefined,
    category: null,
    venue: null,
    organizer: null,
    onlineDetails: null,
    capacity: null,
  });
  assert.deepEqual(event.media, []);
  assert.equal(getEventCover(event), null);
  assert.deepEqual(getEventGallery(event), []);
  assert.equal(
    eventSummarySchema.parse({ ...summary, coverImage: undefined }).coverImage,
    undefined,
  );
  assert.equal(eventSummarySchema.parse(summary).coverImage, null);
  assert.equal(eventLocation("PHYSICAL", null), "Venue to be announced");
  assert.equal(eventLocation("ONLINE", null), "Online event");
  assert.equal(
    eventLocation("HYBRID", summary.venue),
    "Berlin, Germany + online",
  );
});

test("gallery order and cover selection never reorder cached API data", () => {
  const event = publicEventSchema.parse({
    ...detail,
    media: [
      {
        id: "gallery-last",
        type: "GALLERY",
        storageKey: "last.jpg",
        sortOrder: 9,
      },
      { id: "cover", type: "COVER", storageKey: "cover.jpg", sortOrder: 0 },
      {
        id: "gallery-first",
        type: "GALLERY",
        storageKey: "first.jpg",
        sortOrder: 1,
      },
      {
        id: "gallery-middle",
        type: "GALLERY",
        storageKey: "middle.jpg",
        sortOrder: 4,
      },
    ],
  });
  const originalOrder = event.media.map((image) => image.id);
  Object.freeze(event.media);
  assert.equal(getEventCover(event)?.id, "cover");
  assert.deepEqual(
    getEventGallery(event).map((image) => image.id),
    ["gallery-first", "gallery-middle", "gallery-last"],
  );
  assert.deepEqual(
    event.media.map((image) => image.id),
    originalOrder,
  );
});

test("runtime parsing excludes private event, organizer and online access fields at every level", () => {
  const secret = "private-contract-marker";
  const event = publicEventSchema.parse({
    ...detail,
    internalNotes: secret,
    accessUrl: secret,
    onlineDetails: {
      platform: "Zoom",
      accessUrl: secret,
      accessCode: secret,
      accessInstructions: secret,
      nested: { accessUrl: secret },
    },
    organizer: {
      ...detail.organizer,
      email: secret,
      passwordHash: secret,
      role: secret,
    },
    category: { ...summary.category, internalNotes: secret },
    tags: [{ ...summary.tags[0], internalNotes: secret }],
    venue: { ...detail.venue, contactEmail: secret },
    media: [
      {
        id: "public-photo",
        type: "GALLERY",
        storageKey: "photo.jpg",
        sortOrder: 0,
        signedUploadUrl: secret,
      },
    ],
  });
  assert.deepEqual(event.onlineDetails, { platform: "Zoom" });
  assert.deepEqual(event.organizer, detail.organizer);
  assert.equal(event.venue?.latitude, "52.5321");
  assert.equal(event.media[0].storageKey, "photo.jpg");
  assert.doesNotMatch(JSON.stringify(event), /private-contract-marker/);
  assert.equal(
    "coverImage" in event,
    false,
    "Detail uses media, not the list-only coverImage field",
  );
  const list = paginatedEventsSchema.parse({
    data: [
      {
        ...summary,
        onlineDetails: { accessUrl: secret },
        organizer: { email: secret },
      },
    ],
    pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    internalNotes: secret,
  });
  assert.doesNotMatch(JSON.stringify(list), /private-contract-marker/);
});

test("malformed public responses and nonpublic event statuses fail before reaching the UI", () => {
  for (const status of ["DRAFT", "CANCELLED", "POSTPONED", "COMPLETED"]) {
    assert.equal(
      publicEventSchema.safeParse({ ...detail, status }).success,
      false,
      status,
    );
  }
  assert.equal(
    publicEventSchema.safeParse({ ...detail, status: "SOLD_OUT" }).success,
    true,
  );
  assert.equal(
    paginatedEventsSchema.safeParse({
      data: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    }).success,
    true,
  );
  assert.equal(
    paginatedEventsSchema.safeParse({
      data: [summary],
      pagination: { page: 0, limit: 12, total: 1, totalPages: 1 },
    }).success,
    false,
  );
  assert.equal(
    paginatedEventsSchema.safeParse({
      data: [{ ...summary, format: "IN_PERSON" }],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    }).success,
    false,
  );
  assert.equal(
    publicEventSchema.safeParse({ ...detail, onlineDetails: "Zoom" }).success,
    false,
  );
});

test("public services use the central client, encoded slugs, comma tags and no stored bearer token", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.eventflow.test";
  const { apiClient, setAccessToken } =
    await import("../../lib/api/api-client");
  const { API_ENDPOINTS } = await import("../../constants/api");
  const { getEvents, getEvent, getEventCategories, getTags } =
    await import("../../features/events/services/events.service");
  const originalAdapter = apiClient.defaults.adapter;
  const originalAuthorization = apiClient.defaults.headers.common.Authorization;
  const requests: InternalAxiosRequestConfig[] = [];
  const controller = new AbortController();
  const slug = "design night/2027?invite=yes#details";
  let response: unknown = {
    data: [summary],
    pagination: { page: 2, limit: 12, total: 13, totalPages: 2 },
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config);
    return {
      data: response,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  apiClient.defaults.adapter = adapter;
  setAccessToken("synthetic-private-access-token");
  try {
    const page = await getEvents(
      { page: 2, limit: 12, tagId: legacyTag, tagIds: [firstTag, secondTag] },
      controller.signal,
    );
    assert.equal(page.pagination.totalPages, 2);
    assert.equal(requests[0].url, "/api/events");
    assert.deepEqual(requests[0].params, {
      page: "2",
      limit: "12",
      tagId: legacyTag,
      tagIds: `${firstTag},${secondTag}`,
    });
    response = {
      ...detail,
      onlineDetails: { platform: "Zoom", accessCode: "must-not-escape" },
    };
    assert.deepEqual((await getEvent(slug, controller.signal)).onlineDetails, {
      platform: "Zoom",
    });
    assert.equal(
      requests[1].url,
      "/api/events/design%20night%2F2027%3Finvite%3Dyes%23details",
    );
    assert.equal(API_ENDPOINTS.EVENTS.DETAIL(slug), requests[1].url);
    response = [
      {
        ...summary.category,
        description: "Talks and discussions",
        isActive: true,
      },
    ];
    assert.deepEqual(await getEventCategories(controller.signal), [
      { ...summary.category, description: "Talks and discussions" },
    ]);
    assert.equal(requests[2].url, "/api/event-categories");
    response = summary.tags;
    assert.deepEqual(
      await getTags("  design  ", controller.signal),
      summary.tags,
    );
    assert.equal(requests[3].url, "/api/tags");
    assert.deepEqual(requests[3].params, { search: "design" });
    await getTags("  ", controller.signal);
    assert.equal(requests[4].params, undefined);
    for (const request of requests) {
      assert.equal(request.method, "get");
      assert.equal(request.signal, controller.signal);
      assert.equal(request.headers.get("Authorization"), undefined);
    }
    response = { message: "Unexpected backend shape" };
    await assert.rejects(getEvents({ page: 1, limit: 12 }));
    await assert.rejects(getEvent("not-a-response"));
    await assert.rejects(getEventCategories());
    await assert.rejects(getTags());
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    if (originalAuthorization === undefined)
      delete apiClient.defaults.headers.common.Authorization;
    else
      apiClient.defaults.headers.common.Authorization = originalAuthorization;
  }
});

test("image resolution handles missing assets and stays within the configured public media host", async () => {
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL =
    "https://media.eventflow.test/events";
  const { resolveEventImage } =
    await import("../../features/events/utils/event-media");
  assert.equal(resolveEventImage(undefined), null);
  assert.equal(resolveEventImage(null), null);
  assert.equal(resolveEventImage(""), null);
  assert.equal(resolveEventImage("   "), null);
  assert.equal(
    resolveEventImage("/images/event-cover.jpg"),
    "/images/event-cover.jpg",
  );
  assert.equal(
    resolveEventImage("gallery/cover.jpg"),
    "https://media.eventflow.test/events/gallery/cover.jpg",
  );
  assert.equal(
    resolveEventImage("https://media.eventflow.test/events/cover.jpg"),
    "https://media.eventflow.test/events/cover.jpg",
  );
  for (const key of [
    "https://other.test/cover.jpg",
    "//other.test/cover.jpg",
    "javascript:alert(1)",
    "../private.jpg",
    "https://media.eventflow.test/private.jpg",
    "https://media.eventflow.test/events/cover.jpg?v=1",
    "bad\\path.jpg",
    "bad\u0000image.jpg",
  ]) {
    assert.equal(resolveEventImage(key), null, key);
  }
});
