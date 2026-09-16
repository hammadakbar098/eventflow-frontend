import {
  CalendarDays,
  Clock3,
  MapPin,
  Monitor,
  Ticket,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import type { PublicEvent } from "../types/event.types";
import {
  countryName,
  eventTimeZone,
  formatEventTime,
} from "../utils/event-display";
import { EventDate, EventTags } from "./event-metadata";

export function EventDetailContent({ event }: { event: PublicEvent }) {
  const venue = event.format !== "ONLINE" ? event.venue : null;
  const online = event.format !== "PHYSICAL";
  const organizerName = event.organizer
    ? [event.organizer.firstName.trim(), event.organizer.lastName.trim()]
        .filter(Boolean)
        .join(" ")
    : "";
  const organizerInitials = event.organizer
    ? [
        event.organizer.firstName.trim().charAt(0),
        event.organizer.lastName.trim().charAt(0),
      ]
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="event-detail-story">
      <section
        aria-labelledby="experience-heading"
        className="event-detail-section"
      >
        <p className="eyebrow">The experience</p>
        <h2 id="experience-heading">
          A little more <em>about it.</em>
        </h2>
        <p className="event-detail-description">
          {event.description.trim()
            ? event.description
            : "The organizer hasn’t added a description yet. Check the event details for the time and place."}
        </p>
        {event.tags.length > 0 && (
          <div className="mt-7">
            <EventTags tags={event.tags} linkToExplore />
          </div>
        )}
      </section>

      <Reveal>
        <section
          aria-labelledby="location-heading"
          className="event-detail-section"
        >
          <p className="eyebrow">
            {event.format === "ONLINE" ? "Where to join" : "Where we meet"}
          </p>
          <h2 id="location-heading">
            {event.format === "ONLINE" ? (
              <>
                Join from <em>anywhere.</em>
              </>
            ) : (
              <>
                Find your <em>way.</em>
              </>
            )}
          </h2>
          <div className="event-detail-location-grid">
            {event.format !== "ONLINE" && (
              <div className="event-detail-location-card">
                <MapPin size={22} strokeWidth={1.4} aria-hidden="true" />
                <div>
                  <h3>{venue?.name.trim() || "Venue to be announced"}</h3>
                  {venue ? (
                    <address>
                      {venue.addressLine1 && <span>{venue.addressLine1}</span>}
                      {venue.addressLine2 && <span>{venue.addressLine2}</span>}
                      <span>
                        {[venue.postalCode, venue.city]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                      <span>
                        {[
                          venue.state,
                          venue.countryCode && countryName(venue.countryCode),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </address>
                  ) : (
                    <p>
                      The organizer will share the location when it’s ready.
                    </p>
                  )}
                </div>
              </div>
            )}
            {online && (
              <div className="event-detail-location-card">
                <Monitor size={22} strokeWidth={1.4} aria-hidden="true" />
                <div>
                  <h3>
                    {event.onlineDetails?.platform.trim()
                      ? `Online via ${event.onlineDetails.platform}`
                      : "Online event"}
                  </h3>
                  <p>
                    {event.onlineDetails?.platform.trim()
                      ? "An online experience you can join from wherever you are."
                      : "The online platform will be announced by the organizer."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {organizerName && (
        <section
          aria-labelledby="organizer-heading"
          className="event-detail-organizer"
        >
          <span className="event-detail-initials" aria-hidden="true">
            {organizerInitials}
          </span>
          <div>
            <h2 id="organizer-heading" className="eyebrow">
              Hosted by
            </h2>
            <p>{organizerName}</p>
          </div>
        </section>
      )}
    </div>
  );
}

export function EventDetailFacts({ event }: { event: PublicEvent }) {
  return (
    <aside className="event-detail-aside" aria-label="Event essentials">
      <section
        className="event-detail-facts"
        aria-labelledby="essentials-heading"
      >
        <p className="eyebrow">Make a moment of it</p>
        <h2 id="essentials-heading">The essentials.</h2>
        <dl className="event-detail-facts-list">
          <div>
            <dt>
              <CalendarDays size={17} aria-hidden="true" />
              Starts
            </dt>
            <dd>
              <EventDate
                startAt={event.startAt}
                timezone={event.timezone}
                long
              />
              <span>{formatEventTime(event.startAt, event.timezone)}</span>
            </dd>
          </div>
          <div>
            <dt>
              <Clock3 size={17} aria-hidden="true" />
              Ends
            </dt>
            <dd>
              <EventDate startAt={event.endAt} timezone={event.timezone} long />
              <span>{formatEventTime(event.endAt, event.timezone)}</span>
            </dd>
          </div>
          <div className="event-detail-timezone">
            <dt>Event timezone</dt>
            <dd>{eventTimeZone(event.timezone)}</dd>
          </div>
          {event.capacity != null && (
            <div>
              <dt>
                <Users size={17} aria-hidden="true" />
                Capacity
              </dt>
              <dd>
                {event.capacity.toLocaleString("en-GB")}{" "}
                {event.capacity === 1 ? "person" : "people"}
              </dd>
            </div>
          )}
        </dl>
      </section>
      <section
        className="event-detail-ticket-note"
        aria-labelledby="tickets-heading"
      >
        <Ticket size={22} strokeWidth={1.3} aria-hidden="true" />
        <div>
          <h2 id="tickets-heading">Tickets & reservations</h2>
          <p>
            {event.status === "SOLD_OUT"
              ? "This event is sold out."
              : "Booking isn’t available on EventFlow yet."}
          </p>
        </div>
      </section>
    </aside>
  );
}
