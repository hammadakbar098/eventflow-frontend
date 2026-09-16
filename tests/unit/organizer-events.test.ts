import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  createEventFormSchema,
  venueFormSchema,
  type EventFormValues,
} from "../../features/events/schemas/event-form.schema";
import {
  eventReferenceSchema,
  paginatedOrganizerEventsSchema,
  paginatedVenuesSchema,
} from "../../features/events/schemas/event.schema";
import {
  eventFormDefaults,
  toEventPayload,
  toVenuePayload,
  EMPTY_VENUE_FORM,
} from "../../features/events/utils/event-form";
import {
  isoToZonedDateTime,
  isValidTimeZone,
  zonedDateTimeToIso,
} from "../../features/events/utils/event-time";
import {
  hasMyEventFilters,
  myEventFilterParams,
  parseMyEventFilters,
} from "../../features/events/utils/event-filters";
import {
  eventMutationFeedback,
  venueMutationFeedback,
} from "../../features/events/utils/event-error";
import { eventKeys } from "../../features/events/hooks/event-keys";

// Contracts: Nest CreateEventDto, CreateVenueDto, MyEventsQueryDto and the
// running API's /events/mine, /venues and POST /events responses. Synthetic data.
const categoryId = "44444444-4444-4444-8444-444444444444";
const venueId = "55555555-5555-4555-8555-555555555555";
const tagId = "11111111-1111-4111-8111-111111111111";

function values(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return eventFormDefaults({
    title: "  An evening of ideas ",
    description: "\n  First paragraph.\n\nSecond paragraph.  \n",
    categoryId,
    startAt: "2099-11-20T18:00",
    endAt: "2099-11-20T21:00",
    timezone: "Europe/Berlin",
    capacity: "300",
    venueId,
    tagIds: [tagId, tagId],
    ...overrides,
    onlineDetails: {
      platform: " Microsoft Teams ",
      accessUrl: " https://teams.microsoft.com/l/meetup-join/example ",
      accessCode: "",
      accessInstructions: "  ",
      ...overrides.onlineDetails,
    },
  });
}

function messages(
  result: ReturnType<ReturnType<typeof createEventFormSchema>["safeParse"]>,
) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      issue.path.join("."),
      issue.message,
    ]),
  );
}

function axiosError(status: number | null, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    "Request failed",
    code,
    config,
    {},
    status === null
      ? undefined
      : { status, statusText: "", headers: {}, config, data },
  );
}

test("event times convert from the event timezone, including daylight saving", () => {
  assert.equal(
    zonedDateTimeToIso("2026-11-20T18:00", "Europe/Berlin"),
    "2026-11-20T17:00:00.000Z",
  );
  assert.equal(
    zonedDateTimeToIso("2027-07-01T18:00", "Europe/Berlin"),
    "2027-07-01T16:00:00.000Z",
  );
  assert.equal(
    zonedDateTimeToIso("2027-01-01T00:00", "Asia/Kathmandu"),
    "2026-12-31T18:15:00.000Z",
  );
  // Clocks skip this hour, and 31 February does not exist.
  assert.equal(zonedDateTimeToIso("2027-03-28T02:30", "Europe/Berlin"), null);
  assert.equal(zonedDateTimeToIso("2027-02-31T10:00", "UTC"), null);
  assert.equal(zonedDateTimeToIso("2027-06-01T12:00", "Mars/Base"), null);
  assert.equal(zonedDateTimeToIso("not-a-date", "UTC"), null);
  assert.equal(
    isoToZonedDateTime("2027-07-01T16:00:00.000Z", "Europe/Berlin"),
    "2027-07-01T18:00",
  );
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone(""), false);
});

test("the event form reports every missing field at once", () => {
  const schema = createEventFormSchema("create");
  const result = schema.safeParse(eventFormDefaults({ timezone: "UTC" }));
  assert.deepEqual(messages(result), {
    title: "Give your event a title.",
    description: "Tell people what to expect.",
    categoryId: "Choose a category.",
    startAt: "Choose when your event starts.",
    endAt: "Choose when your event ends.",
    venueId: "Choose a venue, or add a new one.",
  });
  assert.deepEqual(
    messages(schema.safeParse(values({ title: "   ", description: " \n " }))),
    {
      title: "Give your event a title.",
      description: "Tell people what to expect.",
    },
  );
  assert.equal(
    messages(schema.safeParse(values({ title: "x".repeat(201) }))).title,
    "Keep the title to 200 characters or fewer.",
  );
});

test("format rules require only the details that format needs", () => {
  const schema = createEventFormSchema("create");
  assert.equal(schema.safeParse(values({ format: "PHYSICAL" })).success, true);
  assert.deepEqual(
    messages(
      schema.safeParse(
        values({
          format: "ONLINE",
          venueId: "",
          onlineDetails: {
            platform: " ",
            accessUrl: "",
            accessCode: "c".repeat(101),
            accessInstructions: "",
          },
        }),
      ),
    ),
    {
      "onlineDetails.platform": "Add the platform people will join on.",
      "onlineDetails.accessUrl": "Add the link people will use to join.",
      "onlineDetails.accessCode":
        "Keep the access code to 100 characters or fewer.",
    },
  );
  for (const accessUrl of ["teams", "ftp://example.com", "https://localhost"])
    assert.equal(
      messages(
        schema.safeParse(
          values({
            format: "HYBRID",
            onlineDetails: {
              platform: "Zoom",
              accessUrl,
              accessCode: "",
              accessInstructions: "",
            },
          }),
        ),
      )["onlineDetails.accessUrl"],
      "Enter a full link, starting with https://",
    );
  assert.deepEqual(
    Object.keys(
      messages(schema.safeParse(values({ format: "HYBRID", venueId: "" }))),
    ),
    ["venueId"],
  );
});

test("schedule and capacity validation match the API", () => {
  const create = createEventFormSchema("create");
  const edit = createEventFormSchema("edit");
  assert.equal(
    messages(create.safeParse(values({ endAt: "2099-11-20T18:00" }))).endAt,
    "The event must end after it starts.",
  );
  const past = values({
    startAt: "2001-01-01T10:00",
    endAt: "2001-01-01T12:00",
  });
  assert.equal(
    messages(create.safeParse(past)).startAt,
    "Choose a start time in the future.",
  );
  assert.equal(edit.safeParse(past).success, true);
  assert.match(
    messages(create.safeParse(values({ startAt: "2099-03-29T02:30" }))).startAt,
    /doesn’t exist in the selected timezone/,
  );
  assert.equal(
    messages(create.safeParse(values({ timezone: "Mars/Base" }))).timezone,
    "Choose a valid timezone.",
  );
  for (const [capacity, message] of [
    ["0", "Capacity must be at least 1 person."],
    ["-4", "Capacity must be at least 1 person."],
    ["1.5", "Capacity must be a whole number."],
    ["abc", "Capacity must be a whole number."],
    ["2147483648", "Capacity must be 2,147,483,647 people or fewer."],
  ])
    assert.equal(
      messages(create.safeParse(values({ capacity }))).capacity,
      message,
    );
  assert.equal(create.safeParse(values({ capacity: "" })).success, true);
});

test("payloads drop details hidden by the chosen format", () => {
  const hybrid = values({
    format: "HYBRID",
    onlineDetails: {
      platform: "Zoom",
      accessUrl: "https://zoom.us/j/1",
      accessCode: " AI2099 ",
      accessInstructions: "Join early.",
    },
  });
  assert.deepEqual(toEventPayload(hybrid), {
    title: "An evening of ideas",
    description: "First paragraph.\n\nSecond paragraph.",
    format: "HYBRID",
    categoryId,
    startAt: "2099-11-20T17:00:00.000Z",
    endAt: "2099-11-20T20:00:00.000Z",
    timezone: "Europe/Berlin",
    capacity: 300,
    venueId,
    tagIds: [tagId],
    onlineDetails: {
      platform: "Zoom",
      accessUrl: "https://zoom.us/j/1",
      accessCode: "AI2099",
      accessInstructions: "Join early.",
    },
  });
  const online = toEventPayload({ ...hybrid, format: "ONLINE", capacity: "" });
  assert.equal("venueId" in online, false);
  assert.equal("capacity" in online, false);
  assert.equal(online.onlineDetails?.platform, "Zoom");
  const physical = toEventPayload({ ...hybrid, format: "PHYSICAL" });
  assert.equal("onlineDetails" in physical, false);
  assert.equal(physical.venueId, venueId);
  const sparse = toEventPayload(values({ format: "ONLINE" }));
  assert.deepEqual(sparse.onlineDetails, {
    platform: "Microsoft Teams",
    accessUrl: "https://teams.microsoft.com/l/meetup-join/example",
    accessCode: undefined,
    accessInstructions: undefined,
  });
  assert.throws(() => toEventPayload(values({ startAt: "2099-03-29T02:30" })));
});

test("venue input is trimmed, uppercased and never sends NaN coordinates", () => {
  const input = {
    ...EMPTY_VENUE_FORM,
    name: " Eventflow Conference Center ",
    addressLine1: " Lange Str. 20 ",
    city: " Bamberg ",
    postalCode: " 96047 ",
    countryCode: " de ",
    latitude: " 49.8917 ",
    longitude: "10.8868",
  };
  const parsed = venueFormSchema.parse(input);
  assert.equal(parsed.countryCode, "DE");
  assert.deepEqual(toVenuePayload(parsed), {
    name: "Eventflow Conference Center",
    addressLine1: "Lange Str. 20",
    addressLine2: undefined,
    city: "Bamberg",
    state: undefined,
    postalCode: "96047",
    countryCode: "DE",
    latitude: 49.8917,
    longitude: 10.8868,
  });
  const withoutCoordinates = toVenuePayload(
    venueFormSchema.parse({ ...input, latitude: "", longitude: "" }),
  );
  assert.equal("latitude" in withoutCoordinates, false);
  assert.equal("longitude" in withoutCoordinates, false);
  const invalid = venueFormSchema.safeParse({
    ...EMPTY_VENUE_FORM,
    name: "  ",
    countryCode: "DEU",
    latitude: "91",
    longitude: "abc",
  });
  assert.deepEqual(
    Object.fromEntries(
      invalid.error!.issues.map((issue) => [issue.path[0], issue.message]),
    ),
    {
      name: "Enter the venue name.",
      addressLine1: "Enter the street address.",
      city: "Enter the city.",
      postalCode: "Enter the postal code.",
      countryCode: "Use a two-letter country code, like DE.",
      latitude: "Latitude must be a number between -90 and 90.",
      longitude: "Longitude must be a number between -180 and 180.",
    },
  );
  assert.equal(
    venueFormSchema.safeParse({ ...input, longitude: "" }).error?.issues[0]
      .message,
    "Add both coordinates, or leave both empty.",
  );
});

test("organizer filters parse backend statuses and canonicalize the URL", () => {
  const filters = parseMyEventFilters(
    new URLSearchParams(
      "status=published&format=hybrid&search=%20conference%20&page=2&limit=99",
    ),
  );
  assert.deepEqual(filters, {
    page: 2,
    limit: 12,
    search: "conference",
    status: "PUBLISHED",
    format: "HYBRID",
  });
  assert.deepEqual(myEventFilterParams(filters), {
    page: "2",
    limit: "12",
    search: "conference",
    status: "PUBLISHED",
    format: "HYBRID",
  });
  for (const status of [
    "SCHEDULED",
    "SOLD_OUT",
    "POSTPONED",
    "CANCELLED",
    "COMPLETED",
  ])
    assert.equal(
      parseMyEventFilters(new URLSearchParams({ status })).status,
      status,
    );
  const invalid = parseMyEventFilters(
    new URLSearchParams("status=ARCHIVED&format=IRL&page=0"),
  );
  assert.deepEqual(invalid, { page: 1, limit: 12 });
  assert.equal(hasMyEventFilters(invalid), false);
  assert.equal(hasMyEventFilters({ ...invalid, status: "DRAFT" }), true);
  assert.deepEqual(eventKeys.mineList(invalid).slice(0, 2), eventKeys.mine());
  assert.deepEqual(
    eventKeys.venueSearch(" hall ").slice(0, 2),
    eventKeys.venues(),
  );
  assert.deepEqual(eventKeys.venueSearch(" hall "), [
    "events",
    "venues",
    "hall",
  ]);
});

test("organizer responses are validated and private create details are dropped", () => {
  const listing = paginatedOrganizerEventsSchema.parse({
    data: [
      {
        id: "event-one",
        title: "Draft",
        slug: "draft",
        status: "DRAFT",
        format: "ONLINE",
        startAt: "2099-01-01T10:00:00.000Z",
        endAt: "2099-01-01T11:00:00.000Z",
        timezone: "UTC",
        capacity: null,
        createdAt: "2026-09-16T08:35:13.776Z",
        updatedAt: "2026-09-16T08:35:13.776Z",
        category: { id: categoryId, name: "Talks", slug: "talks" },
        venue: null,
        coverImage: null,
      },
    ],
    pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
  });
  assert.deepEqual(listing.data[0].tags, []);
  assert.throws(() =>
    paginatedOrganizerEventsSchema.parse({
      ...listing,
      data: [{ ...listing.data[0], status: "ARCHIVED" }],
    }),
  );
  assert.equal(
    paginatedVenuesSchema.parse({
      data: [
        {
          id: venueId,
          name: "Hall",
          addressLine1: "Street 1",
          city: "Bamberg",
          postalCode: "96047",
          countryCode: "DE",
          latitude: "49.8917",
          longitude: null,
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }).data[0].latitude,
    "49.8917",
  );
  assert.deepEqual(
    eventReferenceSchema.parse({
      id: "event-one",
      slug: "an-evening-of-ideas-2",
      status: "DRAFT",
      title: "An evening of ideas",
      onlineDetails: { accessUrl: "https://private.example", accessCode: "x" },
      tags: [{ tag: { id: tagId, name: "AI", slug: "ai" } }],
    }),
    { id: "event-one", slug: "an-evening-of-ideas-2", status: "DRAFT" },
  );
});

test("mutation errors map to safe field and form messages", () => {
  const validation = eventMutationFeedback(
    axiosError(400, {
      message: [
        "title must be shorter than or equal to 200 characters",
        "onlineDetails.accessUrl must be a URL address",
        "All tagIds's elements must be unique",
        "property internal should not exist",
      ],
    }),
  );
  assert.equal(validation.message, "Some details need another look.");
  assert.deepEqual(Object.keys(validation.fields).sort(), [
    "onlineDetails.accessUrl",
    "tagIds",
    "title",
  ]);
  assert.equal(
    JSON.stringify(validation).includes("must be a URL address"),
    false,
  );
  for (const [status, message, field] of [
    [404, "Event category not found", "categoryId"],
    [404, "Venue not found", "venueId"],
    [400, "Physical events require a venue", "venueId"],
    [400, "One or more tags are invalid or inactive", "tagIds"],
    [400, "Hybrid events require online details", "onlineDetails.platform"],
    [400, "Event end time must be after start time", "endAt"],
  ] as const)
    assert.deepEqual(
      Object.keys(
        eventMutationFeedback(axiosError(status, { message })).fields,
      ),
      [field],
    );
  const expired = eventMutationFeedback(
    axiosError(401, { message: "Unauthorized" }),
  );
  assert.equal(expired.sessionExpired, true);
  assert.match(expired.message, /session has ended/);
  assert.match(eventMutationFeedback(axiosError(403)).message, /permission/);
  assert.match(
    eventMutationFeedback(axiosError(503)).message,
    /temporarily unavailable/,
  );
  assert.match(
    eventMutationFeedback(axiosError(null)).message,
    /couldn’t connect/,
  );
  assert.match(
    eventMutationFeedback(axiosError(null, undefined, "ECONNABORTED")).message,
    /took too long/,
  );
  assert.match(
    eventMutationFeedback(new Error("API_NOT_CONFIGURED")).message,
    /temporarily unavailable/,
  );
  assert.match(
    eventMutationFeedback(
      axiosError(400, { message: "Stack trace at db.ts:12" }),
    ).message,
    /Check the details/,
  );
  assert.deepEqual(
    venueMutationFeedback(
      axiosError(400, {
        message: [
          "countryCode must match /^[A-Z]{2}$/ regular expression",
          "latitude must not be greater than 90",
        ],
      }),
    ).fields,
    {
      countryCode: "Use a two-letter country code, like DE.",
      latitude: "Latitude must be a number between -90 and 90.",
    },
  );
});

test("organizer services send the session token, allowlisted bodies and public venue lookups", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.eventflow.test";
  const { apiClient, hasAccessToken, setAccessToken, subscribeToAccessToken } =
    await import("../../lib/api/api-client");
  const { createEvent, createVenue, getMyEvents, getVenues } =
    await import("../../features/events/services/events.service");
  const originalAdapter = apiClient.defaults.adapter;
  const requests: InternalAxiosRequestConfig[] = [];
  let response: unknown;
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
  let notifications = 0;
  const unsubscribe = subscribeToAccessToken(() => notifications++);
  try {
    assert.equal(hasAccessToken(), false);
    setAccessToken("synthetic-organizer-token");
    assert.equal(hasAccessToken(), true);
    response = {
      data: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    };
    await getMyEvents({
      page: 1,
      limit: 12,
      status: "DRAFT",
      format: "ONLINE",
    });
    assert.equal(requests[0].url, "/api/events/mine");
    assert.deepEqual(requests[0].params, {
      page: "1",
      limit: "12",
      status: "DRAFT",
      format: "ONLINE",
    });
    assert.equal(
      requests[0].headers.get("Authorization"),
      "Bearer synthetic-organizer-token",
    );

    response = {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    await getVenues("  hall ");
    assert.equal(requests[1].url, "/api/venues");
    assert.deepEqual(requests[1].params, {
      page: 1,
      limit: 20,
      search: "hall",
    });
    assert.equal(requests[1].headers.get("Authorization"), undefined);

    response = { id: "event-one", slug: "server-slug", status: "DRAFT" };
    const payload = {
      ...toEventPayload(values({ format: "PHYSICAL" })),
      internalNote: "never send",
    };
    assert.deepEqual(await createEvent(payload), response);
    assert.equal(requests[2].method, "post");
    assert.equal(requests[2].url, "/api/events");
    const body = JSON.parse(requests[2].data as string);
    assert.equal("internalNote" in body, false);
    assert.equal("onlineDetails" in body, false);
    assert.equal(body.venueId, venueId);
    assert.equal(
      requests[2].headers.get("Authorization"),
      "Bearer synthetic-organizer-token",
    );

    response = {
      id: venueId,
      name: "Hall",
      addressLine1: "Street 1",
      addressLine2: null,
      city: "Bamberg",
      state: null,
      postalCode: "96047",
      countryCode: "DE",
      latitude: "49.8917",
      longitude: "10.8868",
      createdAt: "2026-09-16T08:35:13.727Z",
    };
    await createVenue({
      ...toVenuePayload(
        venueFormSchema.parse({
          ...EMPTY_VENUE_FORM,
          name: "Hall",
          addressLine1: "Street 1",
          city: "Bamberg",
          postalCode: "96047",
          countryCode: "de",
        }),
      ),
    });
    assert.deepEqual(JSON.parse(requests[3].data as string), {
      name: "Hall",
      addressLine1: "Street 1",
      city: "Bamberg",
      postalCode: "96047",
      countryCode: "DE",
    });

    response = { message: "Unexpected backend shape" };
    await assert.rejects(getMyEvents({ page: 1, limit: 12 }));
    await assert.rejects(createEvent(payload));
    setAccessToken(null);
    assert.equal(hasAccessToken(), false);
    assert.equal(apiClient.defaults.headers.common.Authorization, undefined);
    assert.equal(notifications, 2);
  } finally {
    unsubscribe();
    apiClient.defaults.adapter = originalAdapter;
    setAccessToken(null);
  }
});
