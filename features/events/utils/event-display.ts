import type {
  EventFormat,
  EventMedia,
  EventStatus,
  VenueSummary,
} from "../types/event.types";

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  PHYSICAL: "In person",
  ONLINE: "Online",
  HYBRID: "Hybrid",
};
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  SOLD_OUT: "Sold out",
  CANCELLED: "Cancelled",
  POSTPONED: "Postponed",
  COMPLETED: "Completed",
};
export function eventTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}
export function formatEventDate(
  iso: string,
  timezone: string,
  style: "short" | "long" = "short",
) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: eventTimeZone(timezone),
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    ...(style === "long" && { weekday: "long" }),
  }).format(date);
}
export function formatEventTime(iso: string, timezone: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Time to be confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: eventTimeZone(timezone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}
export function countryName(code: string) {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase(),
      ) || code
    );
  } catch {
    return code;
  }
}
export function eventLocation(
  format: EventFormat,
  venue?: VenueSummary | null,
) {
  if (format === "ONLINE") return "Online event";
  const location = venue
    ? [venue.city, countryName(venue.countryCode)].filter(Boolean).join(", ")
    : "Venue to be announced";
  return format === "HYBRID" ? `${location} + online` : location;
}
export function getEventCover<Media extends EventMedia>(event: {
  media: Media[];
}) {
  return (
    event.media
      .filter((media) => media.type === "COVER")
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null
  );
}
export function getEventGallery<Media extends EventMedia>(event: {
  media: Media[];
}) {
  return event.media
    .filter((media) => media.type === "GALLERY")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
