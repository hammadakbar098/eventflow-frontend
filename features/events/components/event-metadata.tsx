import Link from "next/link";
import { Globe2, MapPin, Monitor, Users } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";
import type {
  EventCategory,
  EventFormat,
  Tag,
  VenueSummary,
} from "../types/event.types";
import {
  EVENT_FORMAT_LABELS,
  eventLocation,
  formatEventDate,
} from "../utils/event-display";

export function EventFormatBadge({
  format,
  className,
}: {
  format: EventFormat;
  className?: string;
}) {
  const Icon =
    format === "ONLINE" ? Monitor : format === "HYBRID" ? Globe2 : Users;
  return (
    <span className={cn("event-chip", className)}>
      <Icon size={13} aria-hidden="true" />
      {EVENT_FORMAT_LABELS[format]}
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
