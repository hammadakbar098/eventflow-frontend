import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  eventMediaFormSchema,
  eventReasonFormSchema,
  inferImageMimeType,
  isStorageKey,
  rescheduleFormSchema,
  type EventFormValues,
} from "../../features/events/schemas/event-form.schema";
import {
  eventReferenceSchema,
  organizerEventSchema,
} from "../../features/events/schemas/event.schema";
import type { OrganizerEvent } from "../../features/events/types/event.types";
import {
  EMPTY_MEDIA_FORM,
  eventToFormValues,
  toEventMediaPayload,
  toEventUpdatePayload,
  type EventFormDirtyFields,
} from "../../features/events/utils/event-form";
import { eventLifecycle } from "../../features/events/utils/event-lifecycle";
import {
  lifecycleMutationFeedback,
  mediaMutationFeedback,
} from "../../features/events/utils/event-error";
import { eventKeys } from "../../features/events/hooks/event-keys";

// Contracts verified against the running Nest API: GET/PATCH /events/mine/:slug,
// lifecycle transitions and media metadata endpoints. Synthetic data only.
const venueId = "55555555-5555-4555-8555-555555555555";
const otherVenueId = "66666666-6666-4666-8666-666666666666";
const tagId = "11111111-1111-4111-8111-111111111111";

const event: OrganizerEvent = {
  id: "event-one",
  title: "An evening of ideas",
  slug: "an-evening-of-ideas",
  description: "Line one.\n\nLine two.",
  status: "DRAFT",
  format: "HYBRID",
  startAt: "2099-11-20T17:00:00.000Z",
  endAt: "2099-11-20T20:00:00.000Z",
  timezone: "Europe/Berlin",
  capacity: 300,
  cancelledAt: null,
  cancellationReason: null,
  postponedAt: null,
  postponementReason: null,
  createdAt: "2026-09-16T09:14:37.588Z",
  updatedAt: "2026-09-16T09:14:37.588Z",
  organizer: { id: "organizer", firstName: "Alex", lastName: "Morgan" },
  category: { id: "category", name: "Talks", slug: "talks" },
  venue: {
    id: venueId,
    name: "Riverside Hall",
    addressLine1: "Street 1",
    addressLine2: null,
    city: "Bamberg",
    state: null,
    postalCode: "96047",
    countryCode: "DE",
    latitude: "49.8917",
    longitude: null,
  },
  onlineDetails: {
    platform: "Zoom",
    accessUrl: "https://zoom.us/j/1",
    accessCode: "CODE",
    accessInstructions: null,
  },
  media: [],
  tags: [{ id: tagId, name: "AI", slug: "ai" }],
};

const initial = eventToFormValues(event);
const edit = (
  changes: Partial<EventFormValues>,
  dirty: EventFormDirtyFields,
  from: EventFormValues = initial,
) =>
  toEventUpdatePayload(
    {
      ...from,
      ...changes,
      onlineDetails: { ...from.onlineDetails, ...changes.onlineDetails },
    },
    from,
    dirty,
  );

test("edit form values come from the private event in its own timezone", () => {
  assert.deepEqual(initial, {
    title: "An evening of ideas",
    description: "Line one.\n\nLine two.",
    categoryId: "category",
    format: "HYBRID",
    startAt: "2099-11-20T18:00",
    endAt: "2099-11-20T21:00",
    timezone: "Europe/Berlin",
    capacity: "300",
    venueId,
    tagIds: [tagId],
    onlineDetails: {
      platform: "Zoom",
      accessUrl: "https://zoom.us/j/1",
      accessCode: "CODE",
      accessInstructions: "",
    },
  });
  const online = eventToFormValues({
    ...event,
    format: "ONLINE",
    venue: null,
    capacity: null,
    category: null,
  });
  assert.equal(online.venueId, "");
  assert.equal(online.capacity, "");
  assert.equal(online.categoryId, "");
});

test("PATCH bodies contain only changed fields and use null to clear", () => {
  assert.deepEqual(edit({}, {}), {});
  // Unchanged arrays are reported as nested false flags.
  assert.deepEqual(edit({}, { tagIds: [false], onlineDetails: {} }), {});
  assert.deepEqual(
    edit(
      { title: "  Renamed  ", capacity: "", tagIds: [] },
      { title: true, capacity: true, tagIds: [true] },
    ),
    { title: "Renamed", capacity: null, tagIds: [] },
  );
  assert.deepEqual(edit({ capacity: "500" }, { capacity: true }), {
    capacity: 500,
  });
  // Instants depend on the timezone, so the schedule always travels together.
  assert.deepEqual(edit({ timezone: "America/New_York" }, { timezone: true }), {
    startAt: "2099-11-20T23:00:00.000Z",
    endAt: "2099-11-21T02:00:00.000Z",
    timezone: "America/New_York",
  });
});

test("format changes clear stale venues and online details explicitly", () => {
  assert.deepEqual(edit({ format: "ONLINE" }, { format: true }), {
    format: "ONLINE",
    venueId: null,
  });
  assert.deepEqual(edit({ format: "PHYSICAL" }, { format: true }), {
    format: "PHYSICAL",
    onlineDetails: null,
  });

  const onlineInitial = eventToFormValues({
    ...event,
    format: "ONLINE",
    venue: null,
  });
  assert.deepEqual(
    edit(
      { format: "PHYSICAL", venueId: otherVenueId },
      { format: true, venueId: true },
      onlineInitial,
    ),
    { format: "PHYSICAL", venueId: otherVenueId, onlineDetails: null },
  );
  assert.deepEqual(
    edit(
      { format: "HYBRID", venueId: otherVenueId },
      { format: true, venueId: true },
      onlineInitial,
    ),
    { format: "HYBRID", venueId: otherVenueId },
  );

  const physicalInitial = eventToFormValues({
    ...event,
    format: "PHYSICAL",
    onlineDetails: null,
  });
  assert.deepEqual(
    edit(
      {
        format: "HYBRID",
        onlineDetails: {
          platform: " Teams ",
          accessUrl: "https://teams.example.com/j",
          accessCode: "",
          accessInstructions: "",
        },
      },
      { format: true, onlineDetails: { platform: true, accessUrl: true } },
      physicalInitial,
    ),
    {
      format: "HYBRID",
      onlineDetails: {
        platform: "Teams",
        accessUrl: "https://teams.example.com/j",
        accessCode: undefined,
        accessInstructions: undefined,
      },
    },
  );
});

test("clearing an access field sends an empty string, because nested nulls are ignored", () => {
  assert.deepEqual(
    edit(
      {
        onlineDetails: {
          platform: "Zoom",
          accessUrl: "https://zoom.us/j/1",
          accessCode: "",
          accessInstructions: "Arrive early",
        },
      },
      { onlineDetails: { accessCode: true, accessInstructions: true } },
    ),
    {
      onlineDetails: {
        platform: "Zoom",
        accessUrl: "https://zoom.us/j/1",
        accessCode: "",
        accessInstructions: "Arrive early",
      },
    },
  );
});

test("lifecycle actions follow the API's status and timing rules", () => {
  const at = (status: OrganizerEvent["status"], now: string) =>
    eventLifecycle({ ...event, status }, Date.parse(now));
  const before = "2099-11-20T10:00:00.000Z";
  const during = "2099-11-20T18:00:00.000Z";
  const after = "2099-11-21T10:00:00.000Z";
  const list = (result: ReturnType<typeof at>) => [...result.actions].sort();

  assert.deepEqual(list(at("DRAFT", before)), ["delete", "publish"]);
  assert.equal(at("DRAFT", before).editable, true);
  assert.equal(at("DRAFT", after).publishBlocked, true);
  assert.deepEqual(list(at("PUBLISHED", before)), ["cancel", "postpone"]);
  assert.equal(at("PUBLISHED", before).publiclyVisible, true);
  assert.deepEqual(list(at("PUBLISHED", during)), ["cancel"]);
  assert.equal(at("PUBLISHED", during).happeningNow, true);
  assert.deepEqual(list(at("PUBLISHED", after)), ["cancel", "complete"]);
  assert.deepEqual(list(at("POSTPONED", after)), ["cancel", "reschedule"]);
  assert.equal(at("POSTPONED", before).publiclyVisible, false);
  assert.deepEqual(list(at("CANCELLED", after)), []);
  assert.deepEqual(list(at("COMPLETED", after)), []);
  for (const status of ["PUBLISHED", "POSTPONED", "COMPLETED"] as const)
    assert.equal(at(status, before).editable, false);
});

test("lifecycle and media forms validate before any request", () => {
  assert.equal(
    eventReasonFormSchema.safeParse({ reason: "   " }).error?.issues[0].message,
    "Add a short reason.",
  );
  assert.equal(
    eventReasonFormSchema.parse({ reason: "  Venue unavailable " }).reason,
    "Venue unavailable",
  );
  assert.equal(
    eventReasonFormSchema.safeParse({ reason: "r".repeat(501) }).success,
    false,
  );

  const schedule = (startAt: string, endAt: string) =>
    rescheduleFormSchema
      .safeParse({ startAt, endAt, timezone: "Europe/Berlin" })
      .error?.issues.map((issue) => issue.message);
  assert.deepEqual(schedule("2001-01-01T10:00", "2001-01-01T12:00"), [
    "Choose a start time in the future.",
  ]);
  assert.deepEqual(schedule("2099-01-01T12:00", "2099-01-01T10:00"), [
    "The event must end after it starts.",
  ]);
  assert.equal(schedule("2099-01-01T10:00", "2099-01-01T12:00"), undefined);

  for (const key of [
    "events/my-event/cover.webp",
    "/images/event-art.jpg",
    "cover.png",
  ])
    assert.equal(isStorageKey(key), true, key);
  for (const key of [
    "https://cdn.example.com/x.png",
    "//cdn.example.com/x.png",
    "../../etc/passwd",
    "events/../secret.png",
    "events/my cover.png",
    "data:image/png;base64,AAAA",
  ])
    assert.equal(isStorageKey(key), false, key);
  assert.equal(inferImageMimeType("events/a/cover.WEBP"), "image/webp");
  assert.equal(inferImageMimeType("events/a/photo.jpeg"), "image/jpeg");
  assert.equal(inferImageMimeType("events/a/vector.svg"), "");

  const invalid = eventMediaFormSchema.safeParse({
    ...EMPTY_MEDIA_FORM,
    storageKey: "https://cdn.example.com/x.png",
    mimeType: "image/svg+xml",
    width: "0",
    sizeBytes: "1.5",
  });
  assert.deepEqual(
    Object.fromEntries(
      invalid.error!.issues.map((issue) => [issue.path[0], issue.message]),
    ),
    {
      storageKey:
        "Use a storage path such as events/my-event/cover.webp, without spaces or full URLs.",
      altText: "Describe the image for people who can’t see it.",
      mimeType: "Choose JPEG, PNG, WebP, AVIF or GIF.",
      width: "Width must be a whole number above 0.",
      sizeBytes: "File size must be a whole number above 0.",
    },
  );
  const media = eventMediaFormSchema.parse({
    ...EMPTY_MEDIA_FORM,
    storageKey: " events/a/cover.webp ",
    altText: "  Main hall  ",
    mimeType: "image/webp",
    width: "1600",
  });
  assert.deepEqual(toEventMediaPayload(media, "COVER"), {
    type: "COVER",
    storageKey: "events/a/cover.webp",
    mimeType: "image/webp",
    altText: "Main hall",
    originalName: undefined,
    width: 1600,
    height: undefined,
    sizeBytes: undefined,
  });
});

test("private responses keep organizer-only details while references stay minimal", () => {
  const parsed = organizerEventSchema.parse({
    ...event,
    onlineDetails: { ...event.onlineDetails, id: "x", eventId: "event-one" },
    media: [
      {
        id: "media-one",
        eventId: "event-one",
        type: "GALLERY",
        storageKey: "events/a/one.webp",
        originalName: null,
        mimeType: "image/webp",
        sizeBytes: null,
        width: null,
        height: null,
        altText: null,
        sortOrder: 0,
        createdAt: "2026-09-16T09:37:50.178Z",
        updatedAt: "2026-09-16T09:37:50.178Z",
      },
    ],
  });
  assert.deepEqual(parsed.onlineDetails, event.onlineDetails);
  assert.equal("eventId" in parsed.media[0], false);
  assert.throws(() =>
    organizerEventSchema.parse({ ...event, status: "ARCHIVED" }),
  );
  assert.deepEqual(
    eventReferenceSchema.parse({
      id: "event-one",
      slug: "an-evening-of-ideas",
      status: "PUBLISHED",
      startAt: event.startAt,
      updatedAt: event.updatedAt,
    }),
    { id: "event-one", slug: "an-evening-of-ideas", status: "PUBLISHED" },
  );
  assert.deepEqual(eventKeys.mineDetail("a").slice(0, 2), eventKeys.mine());
  assert.notDeepEqual(
    eventKeys.mineDetail("a").slice(0, 3),
    eventKeys.mineLists(),
  );
});

function rejection(status: number, message: unknown) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    "Request failed",
    undefined,
    config,
    {},
    {
      status,
      statusText: "",
      headers: {},
      config,
      data: { message },
    },
  );
}

test("lifecycle and media rejections become safe, specific guidance", async () => {
  const { eventMutationFeedback } =
    await import("../../features/events/utils/event-error");
  assert.equal(
    eventMutationFeedback(rejection(400, "Only draft events can be edited"))
      .message,
    "Only drafts can be edited.",
  );
  for (const [message, expected] of [
    [
      "Event start time must be in the future",
      "Move the start time into the future in Edit event, then publish.",
    ],
    [
      "An event cannot be postponed after it starts",
      "This event has already started, so it can’t be postponed.",
    ],
    [
      "Event cannot be completed before it ends",
      "You can mark this event as completed once it has ended.",
    ],
    [
      "Events with status CANCELLED cannot be postponed",
      "This event’s status has changed, so that action isn’t available any more.",
    ],
    [
      "Only postponed events can be rescheduled",
      "This event’s status has changed, so that action isn’t available any more.",
    ],
    [
      "Draft events should be deleted, not cancelled",
      "Drafts are deleted, not cancelled.",
    ],
  ])
    assert.equal(
      lifecycleMutationFeedback(rejection(400, message), "postpone").message,
      expected,
    );
  assert.deepEqual(
    lifecycleMutationFeedback(
      rejection(400, "Event start time must be in the future"),
      "reschedule",
    ).fields,
    { startAt: "Choose a start time in the future." },
  );
  assert.deepEqual(
    lifecycleMutationFeedback(
      rejection(400, [
        "reason must be shorter than or equal to 500 characters",
      ]),
      "cancel",
    ).fields,
    { reason: "Add a reason of up to 500 characters." },
  );
  assert.match(
    mediaMutationFeedback(
      rejection(400, "Event already has a cover image"),
      "add",
    ).message,
    /already has a cover image/,
  );
  assert.equal(
    mediaMutationFeedback(rejection(404, "Event media not found"), "remove")
      .message,
    "This image has already been removed.",
  );
  assert.deepEqual(
    mediaMutationFeedback(
      rejection(400, ["mimeType must be a supported image MIME type"]),
      "add",
    ).fields,
    { mimeType: "Choose JPEG, PNG, WebP, AVIF or GIF." },
  );
});

test("organizer event services use private endpoints and preserve PATCH semantics", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.eventflow.test";
  const { apiClient, setAccessToken } =
    await import("../../lib/api/api-client");
  const service = await import("../../features/events/services/events.service");
  const originalAdapter = apiClient.defaults.adapter;
  const requests: InternalAxiosRequestConfig[] = [];
  let response: unknown = event;
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
  setAccessToken("synthetic-organizer-token");
  const body = (index: number) =>
    requests[index].data === undefined
      ? undefined
      : JSON.parse(requests[index].data as string);
  try {
    const slug = "an evening/of ideas";
    const encoded = "an%20evening%2Fof%20ideas";
    await service.getMyEvent(slug);
    assert.equal(requests[0].url, `/api/events/mine/${encoded}`);
    assert.equal(
      requests[0].headers.get("Authorization"),
      "Bearer synthetic-organizer-token",
    );

    response = {
      id: "event-one",
      slug: "an-evening-of-ideas",
      status: "DRAFT",
    };
    await service.updateEvent(slug, {
      title: "Renamed",
      capacity: null,
      venueId: null,
      onlineDetails: {
        platform: "Zoom",
        accessUrl: "https://zoom.us/j/1",
        accessCode: "",
      },
      tagIds: undefined,
    });
    assert.equal(requests[1].method, "patch");
    assert.equal(requests[1].url, `/api/events/mine/${encoded}`);
    assert.deepEqual(body(1), {
      title: "Renamed",
      capacity: null,
      venueId: null,
      onlineDetails: {
        platform: "Zoom",
        accessUrl: "https://zoom.us/j/1",
        accessCode: "",
      },
    });
    await service.updateEvent(slug, {
      format: "PHYSICAL",
      onlineDetails: null,
    });
    assert.deepEqual(body(2), { format: "PHYSICAL", onlineDetails: null });

    await service.publishEvent(slug);
    await service.postponeEvent(slug, { reason: "Venue unavailable" });
    await service.rescheduleEvent(slug, {
      startAt: "2099-12-05T17:00:00.000Z",
      endAt: "2099-12-05T20:00:00.000Z",
      timezone: "Europe/Berlin",
    });
    await service.cancelEvent(slug, { reason: "No alternative venue" });
    await service.completeEvent(slug);
    assert.deepEqual(
      requests
        .slice(3, 8)
        .map((request, index) => [
          request.method,
          request.url,
          body(index + 3),
        ]),
      [
        ["patch", `/api/events/mine/${encoded}/publish`, undefined],
        [
          "patch",
          `/api/events/mine/${encoded}/postpone`,
          { reason: "Venue unavailable" },
        ],
        [
          "patch",
          `/api/events/mine/${encoded}/reschedule`,
          {
            startAt: "2099-12-05T17:00:00.000Z",
            endAt: "2099-12-05T20:00:00.000Z",
            timezone: "Europe/Berlin",
          },
        ],
        [
          "patch",
          `/api/events/mine/${encoded}/cancel`,
          { reason: "No alternative venue" },
        ],
        ["patch", `/api/events/mine/${encoded}/complete`, undefined],
      ],
    );

    response = { message: "Event deleted successfully" };
    await service.deleteEvent(slug);
    assert.deepEqual(
      [requests[8].method, requests[8].url],
      ["delete", `/api/events/mine/${encoded}`],
    );

    const media = {
      id: "media-one",
      type: "COVER",
      storageKey: "events/a/cover.webp",
      mimeType: "image/webp",
      altText: "Hall",
      sortOrder: 0,
    };
    response = media;
    await service.addEventMedia(slug, {
      type: "COVER",
      storageKey: "events/a/cover.webp",
      mimeType: "image/webp",
      altText: "Hall",
    });
    assert.equal(requests[9].url, `/api/events/mine/${encoded}/media`);
    assert.deepEqual(body(9), {
      type: "COVER",
      storageKey: "events/a/cover.webp",
      mimeType: "image/webp",
      altText: "Hall",
    });
    await service.updateEventMedia(slug, "media-one", { altText: "Main hall" });
    assert.deepEqual(
      [requests[10].method, requests[10].url, body(10)],
      [
        "patch",
        `/api/events/mine/${encoded}/media/media-one`,
        { altText: "Main hall" },
      ],
    );
    response = [media];
    await service.reorderEventMedia(slug, [
      { mediaId: "b", sortOrder: 0 },
      { mediaId: "a", sortOrder: 1 },
    ]);
    assert.deepEqual(
      [requests[11].url, body(11)],
      [
        `/api/events/mine/${encoded}/media/reorder`,
        {
          items: [
            { mediaId: "b", sortOrder: 0 },
            { mediaId: "a", sortOrder: 1 },
          ],
        },
      ],
    );
    await service.removeEventMedia(slug, "media-one");
    assert.deepEqual(
      [requests[12].method, requests[12].url],
      ["delete", `/api/events/mine/${encoded}/media/media-one`],
    );

    response = { message: "Unexpected backend shape" };
    await assert.rejects(service.getMyEvent(slug));
    await assert.rejects(service.publishEvent(slug));
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    setAccessToken(null);
  }
});
