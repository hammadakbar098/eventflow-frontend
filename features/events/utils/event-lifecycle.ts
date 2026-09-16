import type { EventStatus, OrganizerEvent } from "../types/event.types";

export type EventLifecycleAction =
  "publish" | "postpone" | "reschedule" | "cancel" | "complete" | "delete";

// Statuses that behave as live, published events on the API.
const LIVE_STATUSES: EventStatus[] = ["PUBLISHED", "SOLD_OUT", "SCHEDULED"];

/**
 * Mirrors the rules verified against the Nest API. Visibility is a UX hint;
 * the API still decides, and its rejections are shown to the organizer.
 */
export function eventLifecycle(
  event: Pick<OrganizerEvent, "status" | "startAt" | "endAt">,
  now: number,
) {
  const started = Date.parse(event.startAt) <= now;
  const ended = Date.parse(event.endAt) < now;
  const live = LIVE_STATUSES.includes(event.status);
  const actions = new Set<EventLifecycleAction>();

  if (event.status === "DRAFT") {
    actions.add("publish");
    actions.add("delete");
  }
  if (live && !started) actions.add("postpone");
  if (live && ended) actions.add("complete");
  if (event.status === "POSTPONED") actions.add("reschedule");
  if (live || event.status === "POSTPONED") actions.add("cancel");

  return {
    actions,
    editable: event.status === "DRAFT",
    // Publishing a draft whose start has passed is rejected by the API.
    publishBlocked: event.status === "DRAFT" && started,
    happeningNow: live && started && !ended,
    publiclyVisible:
      event.status === "PUBLISHED" || event.status === "SOLD_OUT",
  };
}
