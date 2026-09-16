import type {
  EventFormValues,
  EventMediaFormValues,
  RescheduleFormValues,
  VenueFormValues,
} from "../schemas/event-form.schema";
import type {
  EventMediaPayload,
  EventMediaType,
  EventPayload,
  EventSchedulePayload,
  EventUpdatePayload,
  OrganizerEvent,
  VenuePayload,
} from "../types/event.types";
import {
  browserTimeZone,
  isoToZonedDateTime,
  zonedDateTimeToIso,
} from "./event-time";

export const EMPTY_VENUE_FORM: VenueFormValues = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "",
  latitude: "",
  longitude: "",
};

export function eventFormDefaults(
  overrides: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    title: "",
    description: "",
    categoryId: "",
    format: "PHYSICAL",
    startAt: "",
    endAt: "",
    timezone: browserTimeZone(),
    capacity: "",
    venueId: "",
    tagIds: [],
    ...overrides,
    onlineDetails: {
      platform: "",
      accessUrl: "",
      accessCode: "",
      accessInstructions: "",
      ...overrides.onlineDetails,
    },
  };
}

const optional = (value: string) => value.trim() || undefined;

function toInstant(local: string, timeZone: string) {
  const iso = zonedDateTimeToIso(local, timeZone);
  if (!iso) throw new Error("INVALID_EVENT_SCHEDULE");
  return iso;
}

/** Maps the organizer event onto form values, in the event's own timezone. */
export function eventToFormValues(event: OrganizerEvent): EventFormValues {
  const online = event.onlineDetails;
  return eventFormDefaults({
    title: event.title,
    description: event.description,
    categoryId: event.category?.id ?? "",
    format: event.format,
    startAt: isoToZonedDateTime(event.startAt, event.timezone),
    endAt: isoToZonedDateTime(event.endAt, event.timezone),
    timezone: event.timezone,
    capacity: event.capacity == null ? "" : String(event.capacity),
    venueId: event.venue?.id ?? "",
    tagIds: event.tags.map((tag) => tag.id),
    onlineDetails: {
      platform: online?.platform ?? "",
      accessUrl: online?.accessUrl ?? "",
      accessCode: online?.accessCode ?? "",
      accessInstructions: online?.accessInstructions ?? "",
    },
  });
}

/**
 * Builds the API body from validated form values. Hidden format sections keep
 * their values for switching back, but never reach the request.
 */
export function toEventPayload(values: EventFormValues): EventPayload {
  const { format, onlineDetails } = values;
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    format,
    categoryId: values.categoryId,
    startAt: toInstant(values.startAt, values.timezone),
    endAt: toInstant(values.endAt, values.timezone),
    timezone: values.timezone,
    ...(values.capacity.trim() && { capacity: Number(values.capacity) }),
    ...(format !== "ONLINE" && { venueId: values.venueId }),
    tagIds: [...new Set(values.tagIds)],
    ...(format !== "PHYSICAL" && {
      onlineDetails: {
        platform: onlineDetails.platform.trim(),
        accessUrl: onlineDetails.accessUrl.trim(),
        accessCode: optional(onlineDetails.accessCode),
        accessInstructions: optional(onlineDetails.accessInstructions),
      },
    }),
  };
}

export function toVenuePayload(values: VenueFormValues): VenuePayload {
  return {
    name: values.name.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: optional(values.addressLine2),
    city: values.city.trim(),
    state: optional(values.state),
    postalCode: values.postalCode.trim(),
    countryCode: values.countryCode.trim().toUpperCase(),
    ...(values.latitude.trim() && { latitude: Number(values.latitude) }),
    ...(values.longitude.trim() && { longitude: Number(values.longitude) }),
  };
}

type DirtyFlags =
  boolean | undefined | DirtyFlags[] | { [key: string]: DirtyFlags };
export type EventFormDirtyFields = Partial<
  Record<keyof EventFormValues, DirtyFlags>
>;

// React Hook Form reports arrays and objects as nested flags.
function isDirty(flag: DirtyFlags | undefined): boolean {
  if (!flag) return false;
  if (flag === true) return true;
  return Object.values(flag).some(isDirty);
}

/**
 * Builds a PATCH body containing only what changed. The API keeps omitted
 * fields, clears capacity/venue/online details on `null`, and rejects format
 * changes that leave a stale venue or online details behind.
 */
export function toEventUpdatePayload(
  values: EventFormValues,
  initial: EventFormValues,
  dirtyFields: EventFormDirtyFields,
): EventUpdatePayload {
  const changed = (field: keyof EventFormValues) => isDirty(dirtyFields[field]);
  const payload: EventUpdatePayload = {};
  const { format, onlineDetails: online } = values;

  if (changed("title")) payload.title = values.title.trim();
  if (changed("description")) payload.description = values.description.trim();
  if (changed("categoryId")) payload.categoryId = values.categoryId;
  // Instants depend on all three fields, so they always travel together.
  if (changed("startAt") || changed("endAt") || changed("timezone"))
    Object.assign(payload, toSchedulePayload(values));
  if (changed("capacity"))
    payload.capacity = values.capacity.trim() ? Number(values.capacity) : null;
  if (changed("tagIds")) payload.tagIds = [...new Set(values.tagIds)];
  if (format !== initial.format) payload.format = format;

  if (format === "ONLINE") {
    if (initial.format !== "ONLINE") payload.venueId = null;
  } else if (changed("venueId") || initial.format === "ONLINE") {
    payload.venueId = values.venueId;
  }

  if (format === "PHYSICAL") {
    if (initial.format !== "PHYSICAL") payload.onlineDetails = null;
  } else if (changed("onlineDetails") || initial.format === "PHYSICAL") {
    // Nested nulls are ignored by the API; an empty string clears a value.
    const clearable = (value: string, previous: string) =>
      value.trim() || (previous.trim() ? "" : undefined);
    const previous =
      initial.format === "PHYSICAL"
        ? { accessCode: "", accessInstructions: "" }
        : initial.onlineDetails;
    payload.onlineDetails = {
      platform: online.platform.trim(),
      accessUrl: online.accessUrl.trim(),
      accessCode: clearable(online.accessCode, previous.accessCode),
      accessInstructions: clearable(
        online.accessInstructions,
        previous.accessInstructions,
      ),
    };
  }
  return payload;
}

export function toSchedulePayload(
  values: RescheduleFormValues,
): EventSchedulePayload {
  return {
    startAt: toInstant(values.startAt, values.timezone),
    endAt: toInstant(values.endAt, values.timezone),
    timezone: values.timezone,
  };
}

export const EMPTY_MEDIA_FORM: EventMediaFormValues = {
  storageKey: "",
  altText: "",
  mimeType: "",
  originalName: "",
  width: "",
  height: "",
  sizeBytes: "",
};

export function toEventMediaPayload(
  values: EventMediaFormValues,
  type: EventMediaType,
): EventMediaPayload {
  const number = (value: string) => (value.trim() ? Number(value) : undefined);
  return {
    type,
    storageKey: values.storageKey.trim(),
    mimeType: values.mimeType,
    altText: values.altText.trim(),
    originalName: optional(values.originalName),
    width: number(values.width),
    height: number(values.height),
    sizeBytes: number(values.sizeBytes),
  };
}
