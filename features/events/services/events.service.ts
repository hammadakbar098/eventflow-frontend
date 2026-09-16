import { apiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/constants/api";
import {
  eventCategorySchema,
  eventReferenceSchema,
  organizerEventSchema,
  organizerMediaSchema,
  paginatedEventsSchema,
  paginatedOrganizerEventsSchema,
  paginatedVenuesSchema,
  publicEventSchema,
  tagSchema,
  venueSchema,
} from "../schemas/event.schema";
import { eventFilterParams, myEventFilterParams } from "../utils/event-filters";
import type {
  EventFilters,
  EventMediaOrderItem,
  EventMediaPayload,
  EventMediaUpdatePayload,
  EventPayload,
  EventReasonPayload,
  EventSchedulePayload,
  EventUpdatePayload,
  MyEventFilters,
  OnlineDetailsPayload,
  VenuePayload,
} from "../types/event.types";

const publicRequest = (signal?: AbortSignal) => ({
  signal,
  headers: { Authorization: undefined },
});

export async function getEvents(filters: EventFilters, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.EVENTS.LIST, {
    ...publicRequest(signal),
    params: eventFilterParams(filters),
  });
  return paginatedEventsSchema.parse(data);
}
export async function getEvent(slug: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(
    API_ENDPOINTS.EVENTS.DETAIL(slug),
    publicRequest(signal),
  );
  return publicEventSchema.parse(data);
}
export async function getEventCategories(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(
    API_ENDPOINTS.EVENT_CATEGORIES,
    publicRequest(signal),
  );
  return eventCategorySchema.array().parse(data);
}
export async function getTags(search = "", signal?: AbortSignal) {
  const query = search.trim().slice(0, 100);
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.TAGS, {
    ...publicRequest(signal),
    params: query ? { search: query } : undefined,
  });
  return tagSchema.array().parse(data);
}
export async function getVenues(search = "", signal?: AbortSignal) {
  const query = search.trim().slice(0, 100);
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.VENUES, {
    ...publicRequest(signal),
    params: { page: 1, limit: 20, ...(query && { search: query }) },
  });
  return paginatedVenuesSchema.parse(data);
}

// Organizer requests rely on the client's in-memory bearer token.
export async function getMyEvents(
  filters: MyEventFilters,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.EVENTS.MINE, {
    signal,
    params: myEventFilterParams(filters),
  });
  return paginatedOrganizerEventsSchema.parse(data);
}
export async function createEvent(payload: EventPayload) {
  // Deliberate allowlist: the Nest DTO rejects unknown properties.
  const { data } = await apiClient.post<unknown>(API_ENDPOINTS.EVENTS.LIST, {
    title: payload.title,
    description: payload.description,
    format: payload.format,
    categoryId: payload.categoryId,
    startAt: payload.startAt,
    endAt: payload.endAt,
    timezone: payload.timezone,
    capacity: payload.capacity,
    venueId: payload.venueId,
    tagIds: payload.tagIds,
    onlineDetails: payload.onlineDetails && {
      platform: payload.onlineDetails.platform,
      accessUrl: payload.onlineDetails.accessUrl,
      accessCode: payload.onlineDetails.accessCode,
      accessInstructions: payload.onlineDetails.accessInstructions,
    },
  });
  return eventReferenceSchema.parse(data);
}
export async function createVenue(payload: VenuePayload) {
  const { data } = await apiClient.post<unknown>(API_ENDPOINTS.VENUES, {
    name: payload.name,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    city: payload.city,
    state: payload.state,
    postalCode: payload.postalCode,
    countryCode: payload.countryCode,
    latitude: payload.latitude,
    longitude: payload.longitude,
  });
  return venueSchema.parse(data);
}

export async function getMyEvent(slug: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(
    API_ENDPOINTS.EVENTS.MINE_DETAIL(slug),
    { signal },
  );
  return organizerEventSchema.parse(data);
}

const onlineDetailsBody = (details: OnlineDetailsPayload) => ({
  platform: details.platform,
  accessUrl: details.accessUrl,
  accessCode: details.accessCode,
  accessInstructions: details.accessInstructions,
});

export async function updateEvent(slug: string, payload: EventUpdatePayload) {
  // PATCH semantics: undefined keys are dropped by JSON, explicit nulls remain.
  const { data } = await apiClient.patch<unknown>(
    API_ENDPOINTS.EVENTS.MINE_DETAIL(slug),
    {
      title: payload.title,
      description: payload.description,
      format: payload.format,
      categoryId: payload.categoryId,
      startAt: payload.startAt,
      endAt: payload.endAt,
      timezone: payload.timezone,
      capacity: payload.capacity,
      venueId: payload.venueId,
      tagIds: payload.tagIds,
      onlineDetails:
        payload.onlineDetails && onlineDetailsBody(payload.onlineDetails),
    },
  );
  return eventReferenceSchema.parse(data);
}

async function transition(
  slug: string,
  action: "publish" | "postpone" | "reschedule" | "cancel" | "complete",
  body?: object,
) {
  const { data } = await apiClient.patch<unknown>(
    API_ENDPOINTS.EVENTS.LIFECYCLE(slug, action),
    body,
  );
  return eventReferenceSchema.parse(data);
}
export const publishEvent = (slug: string) => transition(slug, "publish");
export const completeEvent = (slug: string) => transition(slug, "complete");
export const postponeEvent = (slug: string, { reason }: EventReasonPayload) =>
  transition(slug, "postpone", { reason });
export const cancelEvent = (slug: string, { reason }: EventReasonPayload) =>
  transition(slug, "cancel", { reason });
export const rescheduleEvent = (
  slug: string,
  { startAt, endAt, timezone }: EventSchedulePayload,
) => transition(slug, "reschedule", { startAt, endAt, timezone });

export async function deleteEvent(slug: string) {
  await apiClient.delete(API_ENDPOINTS.EVENTS.MINE_DETAIL(slug));
}

// Media endpoints store metadata for files already in media storage.
export async function addEventMedia(slug: string, payload: EventMediaPayload) {
  const { data } = await apiClient.post<unknown>(
    API_ENDPOINTS.EVENTS.MEDIA(slug),
    {
      type: payload.type,
      storageKey: payload.storageKey,
      originalName: payload.originalName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      width: payload.width,
      height: payload.height,
      altText: payload.altText,
    },
  );
  return organizerMediaSchema.parse(data);
}
export async function updateEventMedia(
  slug: string,
  mediaId: string,
  { altText }: EventMediaUpdatePayload,
) {
  const { data } = await apiClient.patch<unknown>(
    API_ENDPOINTS.EVENTS.MEDIA_ITEM(slug, mediaId),
    { altText },
  );
  return organizerMediaSchema.parse(data);
}
export async function reorderEventMedia(
  slug: string,
  items: EventMediaOrderItem[],
) {
  const { data } = await apiClient.patch<unknown>(
    API_ENDPOINTS.EVENTS.MEDIA_REORDER(slug),
    { items: items.map(({ mediaId, sortOrder }) => ({ mediaId, sortOrder })) },
  );
  return organizerMediaSchema.array().parse(data);
}
export async function removeEventMedia(slug: string, mediaId: string) {
  await apiClient.delete(API_ENDPOINTS.EVENTS.MEDIA_ITEM(slug, mediaId));
}
