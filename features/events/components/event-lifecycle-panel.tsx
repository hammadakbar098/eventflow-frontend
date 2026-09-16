"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  Info,
  PauseCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  useCancelEventMutation,
  useCompleteEventMutation,
  useDeleteEventMutation,
  usePostponeEventMutation,
  usePublishEventMutation,
  useRescheduleEventMutation,
} from "../hooks/use-event-mutations";
import type { EventStatus, OrganizerEvent } from "../types/event.types";
import { toSchedulePayload } from "../utils/event-form";
import {
  eventLifecycle,
  type EventLifecycleAction,
} from "../utils/event-lifecycle";
import {
  ConfirmLifecycleDialog,
  ReasonLifecycleDialog,
  RescheduleDialog,
} from "./event-lifecycle-dialogs";

const statusCopy: Record<EventStatus, { title: string; body: string }> = {
  DRAFT: {
    title: "Still a draft.",
    body: "Only you can see this event. Publish it when the details feel ready.",
  },
  SCHEDULED: {
    title: "Scheduled.",
    body: "This event is lined up and waiting to go live.",
  },
  PUBLISHED: {
    title: "Live on EventFlow.",
    body: "People can discover this event on Explore.",
  },
  SOLD_OUT: {
    title: "Sold out.",
    body: "This event is on Explore and fully booked.",
  },
  POSTPONED: {
    title: "On hold.",
    body: "This event is hidden from Explore until you choose new dates.",
  },
  CANCELLED: {
    title: "Cancelled.",
    body: "This event is closed and no longer listed on Explore.",
  },
  COMPLETED: {
    title: "Wrapped up.",
    body: "This event has ended and is closed for changes.",
  },
};

const successNotice: Partial<Record<EventLifecycleAction, string>> = {
  publish: "Your event is live on Explore.",
  postpone: "Event postponed. It’s hidden from Explore until you reschedule.",
  reschedule: "New dates saved. Your event is live again.",
  cancel: "Event cancelled.",
  complete: "Event marked as completed.",
};

export function EventLifecyclePanel({
  event,
  now,
}: {
  event: OrganizerEvent;
  now: number;
}) {
  const { slug } = event;
  const router = useRouter();
  const lifecycle = eventLifecycle(event, now);
  const { actions } = lifecycle;
  const [open, setOpen] = useState<EventLifecycleAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const publish = usePublishEventMutation(slug);
  const postpone = usePostponeEventMutation(slug);
  const reschedule = useRescheduleEventMutation(slug);
  const cancel = useCancelEventMutation(slug);
  const complete = useCompleteEventMutation(slug);
  const remove = useDeleteEventMutation(slug);

  function openDialog(
    action: EventLifecycleAction,
    trigger: HTMLButtonElement,
  ) {
    triggerRef.current = trigger;
    setNotice(null);
    setOpen(action);
  }

  function closeDialog() {
    setOpen(null);
    // The trigger may disappear once the status changes; fall back to the heading.
    const trigger = triggerRef.current;
    if (trigger?.isConnected && !trigger.disabled) trigger.focus();
    else headingRef.current?.focus();
  }

  const finish = (action: EventLifecycleAction) => (close: () => void) => {
    setNotice(successNotice[action] ?? null);
    close();
  };

  const primary = actions.has("publish")
    ? { action: "publish" as const, label: "Publish event" }
    : actions.has("reschedule")
      ? { action: "reschedule" as const, label: "Reschedule event" }
      : actions.has("complete")
        ? { action: "complete" as const, label: "Mark as completed" }
        : null;

  return (
    <section
      className="event-detail-facts manage-lifecycle"
      aria-labelledby="lifecycle-heading"
    >
      <p className="eyebrow">Event lifecycle</p>
      <h2 id="lifecycle-heading" ref={headingRef} tabIndex={-1}>
        {statusCopy[event.status].title}
      </h2>
      <p className="manage-lifecycle-note">{statusCopy[event.status].body}</p>
      {notice && (
        <p role="status" className="manage-lifecycle-notice">
          <CircleCheck size={17} aria-hidden="true" />
          {notice}
        </p>
      )}

      {primary || actions.has("postpone") ? (
        <div className="manage-lifecycle-actions">
          {primary && (
            <Button
              className="w-full justify-between"
              disabled={
                primary.action === "publish" && lifecycle.publishBlocked
              }
              onClick={(click) =>
                openDialog(primary.action, click.currentTarget)
              }
            >
              {primary.label}
              {primary.action === "reschedule" ? (
                <CalendarClock size={18} aria-hidden="true" />
              ) : (
                <ArrowUpRight size={18} aria-hidden="true" />
              )}
            </Button>
          )}
          {actions.has("postpone") && (
            <Button
              variant="secondary"
              className="w-full justify-between"
              onClick={(click) => openDialog("postpone", click.currentTarget)}
            >
              Postpone event
              <PauseCircle size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : null}

      {lifecycle.publishBlocked && (
        <p className="manage-lifecycle-hint">
          <Info size={15} aria-hidden="true" />
          <span>
            The start time has passed.{" "}
            <Link href={ROUTES.EDIT_EVENT(slug)}>Choose new dates</Link> to
            publish this event.
          </span>
        </p>
      )}
      {lifecycle.happeningNow && (
        <p className="manage-lifecycle-hint">
          <Info size={15} aria-hidden="true" />
          <span>
            Happening now. You can mark it as completed once it has ended.
          </span>
        </p>
      )}

      {actions.has("delete") || actions.has("cancel") ? (
        <div className="manage-lifecycle-danger">
          {actions.has("delete") ? (
            <button
              type="button"
              onClick={(click) => openDialog("delete", click.currentTarget)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete draft
            </button>
          ) : (
            <button
              type="button"
              onClick={(click) => openDialog("cancel", click.currentTarget)}
            >
              <XCircle size={15} aria-hidden="true" />
              Cancel event
            </button>
          )}
        </div>
      ) : (
        !primary && (
          <p className="manage-lifecycle-hint">
            <Info size={15} aria-hidden="true" />
            <span>No further lifecycle actions for this event.</span>
          </p>
        )
      )}

      {open === "publish" && (
        <ConfirmLifecycleDialog
          slug={slug}
          action="publish"
          pending={publish.isPending}
          request={() => publish.mutateAsync()}
          onDone={finish("publish")}
          onClose={closeDialog}
          copy={{
            eyebrow: "Ready for the world",
            title: "Publish this event?",
            description: `Publishing makes “${event.title}” visible on Explore. Only drafts can be edited, so check the details first.`,
            confirm: "Publish event",
            pending: "Publishing…",
            dismiss: "Keep as draft",
          }}
        />
      )}
      {open === "postpone" && (
        <ReasonLifecycleDialog
          slug={slug}
          action="postpone"
          pending={postpone.isPending}
          request={(values) => postpone.mutateAsync(values)}
          onDone={finish("postpone")}
          onClose={closeDialog}
          copy={{
            eyebrow: "A change of plans",
            title: "Postpone this event?",
            description:
              "The event is hidden from Explore until you reschedule it with new dates.",
            confirm: "Postpone event",
            pending: "Postponing…",
            dismiss: "Keep dates",
          }}
        />
      )}
      {open === "reschedule" && (
        <RescheduleDialog
          event={event}
          pending={reschedule.isPending}
          request={(values) =>
            reschedule.mutateAsync(toSchedulePayload(values))
          }
          onDone={finish("reschedule")}
          onClose={closeDialog}
        />
      )}
      {open === "cancel" && (
        <ReasonLifecycleDialog
          slug={slug}
          action="cancel"
          pending={cancel.isPending}
          request={(values) => cancel.mutateAsync(values)}
          onDone={finish("cancel")}
          onClose={closeDialog}
          copy={{
            eyebrow: "This can’t be undone",
            title: "Cancel this event?",
            description:
              "Cancelling closes the event for good and removes it from Explore.",
            confirm: "Cancel event",
            pending: "Cancelling…",
            dismiss: "Keep event",
            destructive: true,
          }}
        />
      )}
      {open === "complete" && (
        <ConfirmLifecycleDialog
          slug={slug}
          action="complete"
          pending={complete.isPending}
          request={() => complete.mutateAsync()}
          onDone={finish("complete")}
          onClose={closeDialog}
          copy={{
            eyebrow: "That’s a wrap",
            title: "Mark this event as completed?",
            description:
              "Completed events are closed and can’t be changed afterwards.",
            confirm: "Mark as completed",
            pending: "Completing…",
            dismiss: "Not yet",
          }}
        />
      )}
      {open === "delete" && (
        <ConfirmLifecycleDialog
          slug={slug}
          action="delete"
          // Stays busy until the page has navigated away from the deleted event.
          pending={remove.isPending || remove.isSuccess}
          request={() => remove.mutateAsync()}
          onDone={() => router.replace(ROUTES.MY_EVENTS)}
          onClose={closeDialog}
          copy={{
            eyebrow: "Draft",
            title: "Delete this draft?",
            description: "This action will remove it from your active events.",
            confirm: "Delete",
            pending: "Deleting…",
            dismiss: "Cancel",
            destructive: true,
          }}
        />
      )}
    </section>
  );
}
