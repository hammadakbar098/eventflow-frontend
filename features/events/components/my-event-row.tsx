import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ROUTES } from "@/constants/routes";
import type { OrganizerEventSummary } from "../types/event.types";
import { EVENT_STATUS_LABELS, formatEventTime } from "../utils/event-display";
import { EventImage } from "./event-image";
import {
  EventCategoryBadge,
  EventDate,
  EventFormatBadge,
  EventLocation,
  EventStatusBadge,
} from "./event-metadata";

// Organizer rows reuse the public card anatomy, adding lifecycle and management.
function MyEventRow({ event }: { event: OrganizerEventSummary }) {
  return (
    <Link
      href={ROUTES.MANAGE_EVENT(event.slug)}
      className="explore-event-card my-event-row"
      aria-label={`Manage ${event.title}, ${EVENT_STATUS_LABELS[event.status]}`}
    >
      <div className="explore-card-image">
        <EventImage
          image={event.coverImage}
          alt={event.title}
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 220px, 270px"
        />
        {event.category && (
          <div className="explore-card-category">
            <EventCategoryBadge category={event.category} />
          </div>
        )}
      </div>
      <div className="explore-card-content">
        <div className="explore-card-date">
          <CalendarDays size={14} aria-hidden="true" />
          <EventDate startAt={event.startAt} timezone={event.timezone} />
          <span aria-hidden="true">·</span>
          <span>{formatEventTime(event.startAt, event.timezone)}</span>
        </div>
        <h3>{event.title}</h3>
        <div className="explore-card-location">
          <EventLocation format={event.format} venue={event.venue} />
        </div>
        <div className="explore-card-tags">
          <EventFormatBadge format={event.format} />
        </div>
      </div>
      <div className="my-event-row-aside">
        <EventStatusBadge status={event.status} />
        <span className="my-event-row-manage">
          Manage
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function MyEventList({ events }: { events: OrganizerEventSummary[] }) {
  return (
    <ul className="my-event-list" aria-label="Your events">
      {events.map((event, index) => (
        <li key={event.id}>
          <Reveal delay={Math.min(index, 3) * 0.055}>
            <MyEventRow event={event} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export function MyEventListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your events"
      className="my-event-list"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} aria-hidden="true" className="my-event-row">
          <div className="event-skeleton aspect-[4/3] rounded-[10px]" />
          <div className="space-y-4">
            <div className="event-skeleton h-3 w-36 rounded" />
            <div className="event-skeleton h-7 w-4/5 rounded" />
            <div className="event-skeleton h-4 w-1/2 rounded" />
            <div className="event-skeleton h-7 w-24 rounded-full" />
          </div>
          <div className="my-event-row-aside">
            <div className="event-skeleton h-8 w-24 rounded-full" />
            <div className="event-skeleton h-11 w-28 rounded-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">Gathering your events.</span>
    </div>
  );
}
