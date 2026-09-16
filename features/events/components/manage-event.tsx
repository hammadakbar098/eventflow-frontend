"use client";

import { useCallback, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, PencilLine } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useNow } from "@/hooks/use-now";
import { easeOutExpo } from "@/animations/variants";
import type { OrganizerEvent } from "../types/event.types";
import { getEventCover } from "../utils/event-display";
import { eventLifecycle } from "../utils/event-lifecycle";
import { EventImage } from "./event-image";
import { EventLifecyclePanel } from "./event-lifecycle-panel";
import { EventMediaManager } from "./event-media-manager";
import {
  EventCategoryBadge,
  EventDate,
  EventFormatBadge,
  EventLocation,
  EventStatusBadge,
} from "./event-metadata";
import { EventPillIndicator } from "./event-pill-indicator";
import { ManageEventDetails, ManageEventOverview } from "./manage-event-panels";
import {
  ManageEventSkeleton,
  OrganizerEventGate,
} from "./organizer-event-states";
import { OrganizerBackRow } from "./organizer-page-header";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "media", label: "Media" },
  { value: "details", label: "Details" },
] as const;
type ManageTab = (typeof tabs)[number]["value"];

// Tabs live in the URL (?tab=media) so a view can be shared or restored.
function useManageTab() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab =
    tabs.find((option) => option.value === requested)?.value ?? "overview";
  const setTab = useCallback((next: ManageTab) => {
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);
  return [tab, setTab] as const;
}

export function ManageEvent({ slug }: { slug: string }) {
  return (
    <OrganizerEventGate slug={slug} skeleton={<ManageEventSkeleton />}>
      {(event) => <ManageEventView event={event} />}
    </OrganizerEventGate>
  );
}

function ManageEventView({ event }: { event: OrganizerEvent }) {
  const now = useNow();
  const reduced = useReducedMotion();
  const [tab, setTab] = useManageTab();
  const lifecycle = eventLifecycle(event, now);

  function selectWithKeyboard(keyEvent: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((option) => option.value === tab);
    const next =
      keyEvent.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : keyEvent.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : keyEvent.key === "Home"
            ? 0
            : keyEvent.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    keyEvent.preventDefault();
    setTab(tabs[next].value);
    document.getElementById(`manage-tab-${tabs[next].value}`)?.focus();
  }

  return (
    <article
      className="site-container event-detail manage-event"
      aria-labelledby="event-title"
    >
      <OrganizerBackRow
        href={ROUTES.MY_EVENTS}
        label="Back to my events"
        eyebrow="Your organizer workspace"
      />
      <Reveal>
        <header className="event-detail-heading">
          <div className="event-detail-heading-copy">
            <div className="event-detail-badges">
              {/* Re-keyed so a lifecycle change reads as a fresh arrival. */}
              <motion.span
                key={event.status}
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: easeOutExpo }}
              >
                <EventStatusBadge status={event.status} />
              </motion.span>
              <EventFormatBadge format={event.format} />
              <EventCategoryBadge category={event.category} />
            </div>
            <h1 id="event-title">{event.title}</h1>
          </div>
          <div className="event-detail-heading-meta">
            <p className="eyebrow">
              {lifecycle.happeningNow ? "Happening now" : "A date to remember"}
            </p>
            <p className="event-detail-heading-date">
              <EventDate startAt={event.startAt} timezone={event.timezone} />
            </p>
            <p className="event-detail-heading-location">
              <EventLocation format={event.format} venue={event.venue} />
            </p>
            {(lifecycle.editable || lifecycle.publiclyVisible) && (
              <div className="manage-event-heading-actions">
                {lifecycle.editable && (
                  <ButtonLink
                    href={ROUTES.EDIT_EVENT(event.slug)}
                    variant="secondary"
                  >
                    Edit event <PencilLine size={16} aria-hidden="true" />
                  </ButtonLink>
                )}
                {lifecycle.publiclyVisible && (
                  <Link href={ROUTES.EVENT(event.slug)} className="text-link">
                    View public page{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
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

      <div
        className="event-pill-row manage-event-tabs"
        role="tablist"
        aria-label="Manage event"
        onKeyDown={selectWithKeyboard}
      >
        {tabs.map((option) => {
          const selected = option.value === tab;
          return (
            <button
              key={option.value}
              id={`manage-tab-${option.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="manage-event-panel"
              tabIndex={selected ? 0 : -1}
              className="event-pill"
              onClick={() => setTab(option.value)}
            >
              {selected && (
                <EventPillIndicator layoutId="manage-event-tab-indicator" />
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="event-detail-body manage-event-body">
        <div
          id="manage-event-panel"
          role="tabpanel"
          aria-labelledby={`manage-tab-${tab}`}
          className="manage-event-panel"
        >
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, ease: easeOutExpo }}
          >
            {tab === "media" ? (
              <EventMediaManager event={event} />
            ) : tab === "details" ? (
              <ManageEventDetails event={event} />
            ) : (
              <ManageEventOverview event={event} />
            )}
          </motion.div>
        </div>
        <aside className="event-detail-aside manage-event-aside">
          <EventLifecyclePanel event={event} now={now} />
        </aside>
      </div>
    </article>
  );
}
