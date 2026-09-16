import type { ReactNode } from "react";
import {
  CalendarDays,
  CircleSlash,
  Clock3,
  Globe2,
  LockKeyhole,
  MapPin,
  Monitor,
  PauseCircle,
  Tags,
  Users,
} from "lucide-react";
import type { OrganizerEvent } from "../types/event.types";
import {
  countryName,
  EVENT_FORMAT_LABELS,
  eventTimeZone,
  formatEventDate,
  formatEventTime,
} from "../utils/event-display";
import { EventTags } from "./event-metadata";

const dateAndTime = (iso: string, timezone: string) =>
  `${formatEventDate(iso, timezone, "long")} · ${formatEventTime(iso, timezone)}`;

function Fact({
  icon,
  label,
  children,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function HistoryNote({ event }: { event: OrganizerEvent }) {
  const note =
    event.status === "CANCELLED"
      ? {
          icon: CircleSlash,
          title: "Cancelled",
          at: event.cancelledAt,
          reason: event.cancellationReason,
        }
      : event.status === "POSTPONED"
        ? {
            icon: PauseCircle,
            title: "Postponed",
            at: event.postponedAt,
            reason: event.postponementReason,
          }
        : null;
  if (!note) return null;
  const Icon = note.icon;
  return (
    <section className="event-detail-location-card manage-history-note">
      <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
      <div>
        <h2>
          {note.title}
          {note.at && ` on ${formatEventDate(note.at, event.timezone, "long")}`}
        </h2>
        <p>{note.reason?.trim() || "No reason was recorded."}</p>
      </div>
    </section>
  );
}

export function ManageEventOverview({ event }: { event: OrganizerEvent }) {
  return (
    <div className="event-detail-story">
      <HistoryNote event={event} />
      <section
        className="event-detail-section"
        aria-labelledby="overview-experience-heading"
      >
        <p className="eyebrow">The experience</p>
        <h2 id="overview-experience-heading">
          A little more <em>about it.</em>
        </h2>
        <p className="event-detail-description">
          {event.description.trim() || "No description yet."}
        </p>
        <div className="mt-7">
          {event.tags.length ? (
            <EventTags tags={event.tags} />
          ) : (
            <p className="manage-event-muted">
              <Tags size={15} aria-hidden="true" /> No tags yet.
            </p>
          )}
        </div>
      </section>
      <section
        className="event-detail-section"
        aria-labelledby="overview-essentials-heading"
      >
        <p className="eyebrow">At a glance</p>
        <h2 id="overview-essentials-heading">
          The <em>essentials.</em>
        </h2>
        <dl className="manage-event-facts">
          <Fact
            icon={<CalendarDays size={16} aria-hidden="true" />}
            label="Starts"
          >
            {dateAndTime(event.startAt, event.timezone)}
          </Fact>
          <Fact icon={<Clock3 size={16} aria-hidden="true" />} label="Ends">
            {dateAndTime(event.endAt, event.timezone)}
          </Fact>
          <Fact icon={<Globe2 size={16} aria-hidden="true" />} label="Timezone">
            {eventTimeZone(event.timezone).replaceAll("_", " ")}
          </Fact>
          <Fact icon={<Users size={16} aria-hidden="true" />} label="Capacity">
            {event.capacity != null
              ? `${event.capacity.toLocaleString("en-GB")} ${event.capacity === 1 ? "person" : "people"}`
              : "No limit set"}
          </Fact>
          <Fact label="Format">{EVENT_FORMAT_LABELS[event.format]}</Fact>
          <Fact label="Category">{event.category?.name ?? "Not set"}</Fact>
        </dl>
      </section>
    </div>
  );
}

export function ManageEventDetails({ event }: { event: OrganizerEvent }) {
  const { venue, onlineDetails: online } = event;
  const created = dateAndTime(event.createdAt, event.timezone);
  const updated = dateAndTime(event.updatedAt, event.timezone);

  return (
    <div className="event-detail-story">
      {event.format !== "ONLINE" && (
        <section
          className="event-detail-section"
          aria-labelledby="details-venue-heading"
        >
          <p className="eyebrow">Where we meet</p>
          <h2 id="details-venue-heading">
            Find your <em>way.</em>
          </h2>
          <div className="event-detail-location-grid">
            <div className="event-detail-location-card">
              <MapPin size={22} strokeWidth={1.4} aria-hidden="true" />
              <div>
                <h3>{venue?.name.trim() || "No venue selected"}</h3>
                {venue ? (
                  <address>
                    {venue.addressLine1 && <span>{venue.addressLine1}</span>}
                    {venue.addressLine2 && <span>{venue.addressLine2}</span>}
                    <span>
                      {[venue.postalCode, venue.city].filter(Boolean).join(" ")}
                    </span>
                    <span>
                      {[venue.state, countryName(venue.countryCode)]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </address>
                ) : (
                  <p>Choose a venue in Edit event before you publish.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {event.format !== "PHYSICAL" && (
        <section
          className="event-detail-section"
          aria-labelledby="details-online-heading"
        >
          <p className="eyebrow manage-private-eyebrow">
            Online access
            <span className="event-chip event-chip-muted">
              <LockKeyhole size={12} aria-hidden="true" /> Private
            </span>
          </p>
          <h2 id="details-online-heading">
            Join from <em>anywhere.</em>
          </h2>
          {online ? (
            <dl className="manage-event-facts manage-event-access">
              <Fact
                icon={<Monitor size={16} aria-hidden="true" />}
                label="Platform"
              >
                {online.platform}
              </Fact>
              <Fact label="Access code">
                {online.accessCode?.trim() || "None"}
              </Fact>
              <Fact label="Joining link">
                <a
                  href={online.accessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="manage-event-link"
                >
                  {online.accessUrl}
                </a>
              </Fact>
              <Fact label="Joining instructions">
                <span className="manage-event-prewrap">
                  {online.accessInstructions?.trim() || "None"}
                </span>
              </Fact>
            </dl>
          ) : (
            <p className="manage-event-muted">
              Add online access in Edit event before you publish.
            </p>
          )}
          <div className="event-detail-ticket-note manage-private-note">
            <LockKeyhole size={20} strokeWidth={1.4} aria-hidden="true" />
            <div>
              <h3>Only you can see these details.</h3>
              <p>
                Joining links, codes and instructions never appear on your
                public event page.
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        className="event-detail-section"
        aria-labelledby="details-record-heading"
      >
        <p className="eyebrow">The record</p>
        <h2 id="details-record-heading">
          Behind the <em>scenes.</em>
        </h2>
        <dl className="manage-event-facts">
          <Fact label="Event address">/events/{event.slug}</Fact>
          <Fact label="Organizer">
            {[event.organizer?.firstName, event.organizer?.lastName]
              .filter(Boolean)
              .join(" ") || "You"}
          </Fact>
          <Fact label="Created">{created}</Fact>
          <Fact label="Last updated">{updated}</Fact>
        </dl>
      </section>
    </div>
  );
}
