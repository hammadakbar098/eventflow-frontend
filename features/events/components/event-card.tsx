import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { EventSummary } from "../types/event.types";
import { EventImage } from "./event-image";
import {
  EventCategoryBadge,
  EventDate,
  EventFormatBadge,
  EventLocation,
  EventTags,
} from "./event-metadata";

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      href={ROUTES.EVENT(event.slug)}
      className="explore-event-card"
      aria-label={`View ${event.title}`}
    >
      <div className="explore-card-image">
        <EventImage
          image={event.coverImage}
          alt={event.title}
          sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
        />
        {event.category && (
          <div className="explore-card-category">
            <EventCategoryBadge category={event.category} />
          </div>
        )}
        <span className="explore-card-arrow" aria-hidden="true">
          <ArrowUpRight size={22} strokeWidth={1.5} />
        </span>
      </div>
      <div className="explore-card-content">
        <div className="explore-card-date">
          <CalendarDays size={14} aria-hidden="true" />
          <EventDate startAt={event.startAt} timezone={event.timezone} />
        </div>
        <h3>{event.title}</h3>
        <div className="explore-card-location">
          <EventLocation format={event.format} venue={event.venue} />
        </div>
        <div className="explore-card-tags">
          <EventFormatBadge format={event.format} />
          <EventTags tags={event.tags} limit={2} />
        </div>
      </div>
    </Link>
  );
}
