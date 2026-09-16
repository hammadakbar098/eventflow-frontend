import { apiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/constants/api";
import {
  eventCategorySchema,
  paginatedEventsSchema,
  publicEventSchema,
  tagSchema,
} from "../schemas/event.schema";
import { eventFilterParams } from "../utils/event-filters";
import type { EventFilters } from "../types/event.types";

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
