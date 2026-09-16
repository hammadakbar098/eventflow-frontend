import { z } from "zod";
import { eventFormatSchema } from "../schemas/event.schema";
import type { EventFilters } from "../types/event.types";

export const DEFAULT_EVENT_FILTERS: EventFilters = { page: 1, limit: 12 };
type SearchParams = Pick<URLSearchParams, "get" | "getAll">;
const uuid = z.string().uuid();
const uuidV4 = z.string().uuid({ version: "v4" });
const text = (value: string | null) => value?.trim().slice(0, 100) || undefined;
const id = (value: string | null) =>
  uuid.safeParse(value).success ? value! : undefined;

function positiveInteger(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= max
    ? number
    : fallback;
}

// Date-only filters use UTC day boundaries (the backend's start bound is strict,
// and its end bound is inclusive); ISO timestamps preserve
// their instant. Strict parsing prevents Date silently rolling invalid dates over.
export function normalizeFilterDate(
  value: string | null,
  endOfDay = false,
): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      return undefined;
    return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
  }
  if (!z.iso.datetime({ offset: true }).safeParse(value).success)
    return undefined;
  return new Date(value).toISOString();
}

export function parseEventFilters(params: SearchParams): EventFilters {
  const format = eventFormatSchema.safeParse(
    params.get("format")?.toUpperCase(),
  );
  const country = params.get("countryCode")?.trim().toUpperCase();
  const tagIds = [
    ...new Set(
      params
        .getAll("tagIds")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => uuidV4.safeParse(value).success),
    ),
  ].sort();
  const startFrom = normalizeFilterDate(params.get("startFrom"));
  let startTo = normalizeFilterDate(params.get("startTo"), true);
  // Nest defaults a missing lower bound to now and rejects earlier end dates.
  if (startTo && startTo < (startFrom ?? new Date().toISOString()))
    startTo = undefined;
  return {
    page: positiveInteger(params.get("page"), 1),
    limit: positiveInteger(params.get("limit"), 12, 50),
    ...(text(params.get("search")) && { search: text(params.get("search")) }),
    ...(format.success && { format: format.data }),
    ...(id(params.get("categoryId")) && {
      categoryId: id(params.get("categoryId")),
    }),
    ...(text(params.get("city")) && { city: text(params.get("city")) }),
    ...(country && /^[A-Z]{2}$/.test(country) && { countryCode: country }),
    ...(id(params.get("tagId")) && { tagId: id(params.get("tagId")) }),
    ...(tagIds.length > 0 && { tagIds }),
    ...(startFrom && { startFrom }),
    ...(startTo && { startTo }),
  };
}

export function eventFilterParams(
  filters: EventFilters,
): Record<string, string> {
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
  };
  for (const key of [
    "search",
    "format",
    "categoryId",
    "city",
    "countryCode",
    "tagId",
    "startFrom",
    "startTo",
  ] as const) {
    const value = filters[key];
    if (value) params[key] = value;
  }
  if (filters.tagIds?.length) params.tagIds = filters.tagIds.join(",");
  return params;
}

export function eventFiltersSearchParams(filters: EventFilters) {
  return new URLSearchParams(eventFilterParams(filters));
}

export function hasEventFilters(filters: EventFilters) {
  return Object.keys(eventFilterParams(filters)).some(
    (key) => key !== "page" && key !== "limit",
  );
}
