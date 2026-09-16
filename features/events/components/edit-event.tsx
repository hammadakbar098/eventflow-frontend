"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useUpdateEventMutation } from "../hooks/use-event-mutations";
import type { OrganizerEvent } from "../types/event.types";
import { EVENT_STATUS_LABELS } from "../utils/event-display";
import { eventToFormValues } from "../utils/event-form";
import { EventForm } from "./event-form";
import {
  EventFormSkeleton,
  OrganizerEventGate,
} from "./organizer-event-states";
import { EventFormPageHeader, OrganizerBackRow } from "./organizer-page-header";

export function EditEvent({ slug }: { slug: string }) {
  return (
    <OrganizerEventGate slug={slug} skeleton={<EventFormSkeleton />}>
      {(event) =>
        event.status === "DRAFT" ? (
          <EditEventForm event={event} />
        ) : (
          <NotEditable event={event} />
        )
      }
    </OrganizerEventGate>
  );
}

function EditEventForm({ event }: { event: OrganizerEvent }) {
  const router = useRouter();
  const mutation = useUpdateEventMutation(event.slug);
  // Captured once: the form compares later edits against these values.
  const defaultValues = useMemo(() => eventToFormValues(event), [event]);
  const manageHref = ROUTES.MANAGE_EVENT(event.slug);

  return (
    <div className="site-container event-detail event-form-page">
      <OrganizerBackRow
        href={manageHref}
        label="Back to event"
        eyebrow="Still a draft"
      />
      <EventFormPageHeader
        eyebrow="Edit event"
        title={
          <>
            Refine the
            <br />
            <em>details.</em>
          </>
        }
        note={
          <>
            {event.title}
            <br />
            Only the details you change are saved.
          </>
        }
      />
      <EventForm
        mode="edit"
        defaultValues={defaultValues}
        initialVenue={event.venue ?? null}
        initialTags={event.tags}
        cancelHref={manageHref}
        onSubmit={async (payload) => {
          const updated = await mutation.mutateAsync(payload);
          router.replace(ROUTES.MANAGE_EVENT(updated.slug));
        }}
      />
    </div>
  );
}

function NotEditable({ event }: { event: OrganizerEvent }) {
  const manageHref = ROUTES.MANAGE_EVENT(event.slug);
  return (
    <div className="site-container event-detail">
      <OrganizerBackRow
        href={manageHref}
        label="Back to event"
        eyebrow={EVENT_STATUS_LABELS[event.status]}
      />
      <div className="event-state min-h-[60vh]">
        <LockKeyhole size={36} strokeWidth={1.2} aria-hidden="true" />
        <p className="eyebrow">{EVENT_STATUS_LABELS[event.status]}</p>
        <h1>This event can’t be edited.</h1>
        <p>
          Only drafts can be edited. Once an event is published, its details
          stay as they are and you manage its lifecycle instead.
        </p>
        <ButtonLink href={manageHref}>
          Manage event <ArrowUpRight size={17} aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  );
}
