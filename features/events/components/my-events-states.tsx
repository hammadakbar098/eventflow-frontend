"use client";

import { ArrowUpRight, CalendarPlus, SearchX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function MyEventsEmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  if (filtered)
    return (
      <div className="event-state">
        <SearchX size={36} strokeWidth={1.2} aria-hidden="true" />
        <h2>No events match your filters.</h2>
        <p>
          Try a different search, status or format. Or clear your filters to see
          everything you’ve created.
        </p>
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  return (
    <div className="event-state">
      <CalendarPlus size={36} strokeWidth={1.2} aria-hidden="true" />
      <p className="eyebrow">Start with a spark</p>
      <h2>You haven’t created any events yet.</h2>
      <p>
        Every great gathering starts somewhere. Draft your first event now, and
        share it with the world when it feels ready.
      </p>
      <ButtonLink href={ROUTES.CREATE_EVENT}>
        Create your first event
        <ArrowUpRight size={17} aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}
