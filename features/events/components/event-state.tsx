"use client";

import { ArrowLeft, CircleAlert, SearchX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { eventErrorMessage } from "../utils/event-error";

export function EventErrorState({
  error,
  onRetry,
  title = "A little pause in the flow.",
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div role="alert" className="event-state">
      <CircleAlert size={32} strokeWidth={1.3} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{eventErrorMessage(error)}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
export function EventEmptyState({
  onClear,
  filtered,
}: {
  onClear: () => void;
  filtered: boolean;
}) {
  return (
    <div className="event-state">
      <SearchX size={36} strokeWidth={1.2} aria-hidden="true" />
      <h2>{filtered ? "Nothing here. Yet." : "Good things are on the way."}</h2>
      <p>
        {filtered
          ? "No events match your filters. Try a different search or make a little more room."
          : "There are no upcoming events to explore right now. Check back soon for something worth showing up for."}
      </p>
      {filtered && (
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
export function EventNotFoundState() {
  return (
    <div className="event-state min-h-[60vh]">
      <SearchX size={40} strokeWidth={1.2} aria-hidden="true" />
      <p className="eyebrow">Event not found</p>
      <h1>This moment has moved.</h1>
      <p>
        The event may no longer be available. There are more experiences to
        discover.
      </p>
      <ButtonLink href={ROUTES.EXPLORE}>
        <ArrowLeft size={16} aria-hidden="true" />
        Explore events
      </ButtonLink>
    </div>
  );
}
