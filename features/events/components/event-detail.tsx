"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ROUTES } from "@/constants/routes";
import { useEvent } from "../hooks/use-events";
import { getEventCover, getEventGallery } from "../utils/event-display";
import { isEventNotFound } from "../utils/event-error";
import { EventDetailContent, EventDetailFacts } from "./event-detail-content";
import { EventDetailSkeleton } from "./event-detail-skeleton";
import { EventGallery } from "./event-gallery";
import { EventImage } from "./event-image";
import {
  EventCategoryBadge,
  EventDate,
  EventFormatBadge,
  EventLocation,
} from "./event-metadata";
import { EventErrorState, EventNotFoundState } from "./event-state";

export function EventDetail({ slug }: { slug: string }) {
  const query = useEvent(slug);

  if (query.isPending) return <EventDetailSkeleton />;

  if (query.isError) {
    return (
      <div className="site-container event-detail">
        <BackToEvents />
        {isEventNotFound(query.error) ? (
          <EventNotFoundState />
        ) : (
          <>
            <h1 className="sr-only">Event details</h1>
            <EventErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
              title="This moment needs a moment."
            />
          </>
        )}
      </div>
    );
  }

  const event = query.data;

  return (
    <article
      className="site-container event-detail"
      aria-labelledby="event-title"
    >
      <BackToEvents />
      <Reveal>
        <header className="event-detail-heading">
          <div className="event-detail-heading-copy">
            <div className="event-detail-badges">
              <EventCategoryBadge category={event.category} />
              <EventFormatBadge format={event.format} />
              {event.status === "SOLD_OUT" && (
                <span className="event-chip event-chip-muted">Sold out</span>
              )}
            </div>
            <h1 id="event-title">{event.title}</h1>
          </div>
          <div className="event-detail-heading-meta">
            <p className="eyebrow">A date to remember</p>
            <p className="event-detail-heading-date">
              <EventDate startAt={event.startAt} timezone={event.timezone} />
            </p>
            <p className="event-detail-heading-location">
              <EventLocation format={event.format} venue={event.venue} />
            </p>
          </div>
        </header>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="event-detail-cover">
          <EventImage
            image={getEventCover(event)}
            alt={event.title}
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1536px) calc(100vw - 96px), 1440px"
            preload
          />
        </div>
      </Reveal>
      <div className="event-detail-body">
        <EventDetailContent event={event} />
        <EventDetailFacts event={event} />
      </div>
      <EventGallery images={getEventGallery(event)} title={event.title} />
      <div className="event-detail-explore-more">
        <p>
          There’s more to <em>experience.</em>
        </p>
        <Link href={ROUTES.EXPLORE} className="text-link min-h-11">
          Explore events
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function BackToEvents() {
  return (
    <div className="event-detail-backrow">
      <Link href={ROUTES.EXPLORE}>
        <ArrowLeft size={15} aria-hidden="true" />
        Back to events
      </Link>
      <span className="eyebrow">Worth showing up for</span>
    </div>
  );
}
