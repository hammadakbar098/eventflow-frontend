import Link from "next/link";
import { Globe2, MapPin, Monitor, Users, type LucideIcon } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";
import type {
  EventCategory,
  EventFormat,
  EventStatus,
  Tag,
  VenueSummary,
} from "../types/event.types";
import {
  EVENT_FORMAT_LABELS,
  EVENT_STATUS_LABELS,
  eventLocation,
  formatEventDate,
} from "../utils/event-display";

export const EVENT_FORMAT_ICONS: Record<EventFormat, LucideIcon> = {
  PHYSICAL: Users,
  ONLINE: Monitor,
  HYBRID: Globe2,
};

export function EventFormatBadge({
  format,
  className,
}: {
  format: EventFormat;
  className?: string;
}) {
  const Icon = EVENT_FORMAT_ICONS[format];
  return (
    <span className={cn("event-chip", className)}>
      <Icon size={13} aria-hidden="true" />
      {EVENT_FORMAT_LABELS[format]}
    </span>
  );
}
// Status styling lives in events.css, keyed by the backend lifecycle value.
export function EventStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("event-chip event-status", className)}
      data-status={status}
    >
      <span className="event-status-dot" aria-hidden="true" />
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}
export function EventCategoryBadge({
  category,
}: {
  category?: EventCategory | null;
}) {
  return category ? (
    <span className="event-chip event-chip-muted">{category.name}</span>
  ) : null;
}
export function EventTags({
  tags,
  limit,
  linkToExplore = false,
}: {
  tags: Tag[];
  limit?: number;
  linkToExplore?: boolean;
}) {
  const visible = limit ? tags.slice(0, limit) : tags;
  if (!visible.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Event tags">
      {visible.map((tag) => (
        <li key={tag.id}>
          {linkToExplore ? (
            <Link
              href={`${ROUTES.EXPLORE}?tagId=${encodeURIComponent(tag.id)}`}
              className="event-chip event-chip-muted min-h-11"
            >
              {tag.name}
            </Link>
          ) : (
            <span className="event-chip event-chip-muted">{tag.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
export function EventDate({
  startAt,
  timezone,
  long = false,
}: {
  startAt: string;
  timezone: string;
  long?: boolean;
}) {
  return (
    <time dateTime={startAt}>
      {formatEventDate(startAt, timezone, long ? "long" : "short")}
    </time>
  );
}
export function EventLocation({
  format,
  venue,
}: {
  format: EventFormat;
  venue?: VenueSummary | null;
}) {
  const Icon = format === "ONLINE" ? Monitor : MapPin;
  return (
    <span className="inline-flex items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      {eventLocation(format, venue)}
    </span>
  );
}
