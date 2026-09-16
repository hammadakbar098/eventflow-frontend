"use client";

import { useEffect, useId, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import type { MyEventFilterControls } from "../hooks/use-event-filters";
import { eventStatusSchema } from "../schemas/event.schema";
import type { EventFormat, EventStatus } from "../types/event.types";
import {
  EVENT_FORMAT_LABELS,
  EVENT_STATUS_LABELS,
} from "../utils/event-display";
import { hasMyEventFilters } from "../utils/event-filters";
import { EventPillIndicator } from "./event-pill-indicator";

const statusOptions: (EventStatus | undefined)[] = [
  undefined,
  ...eventStatusSchema.options,
];

export function MyEventsFilters({
  controls,
}: {
  controls: MyEventFilterControls;
}) {
  const id = useId();
  const statusRowRef = useRef<HTMLDivElement>(null);
  const { filters, updateFilters, clearFilters, textPending } = controls;
  const filtered = hasMyEventFilters(filters) || textPending;

  // Keep the active status visible when the row scrolls on small screens.
  useEffect(() => {
    const row = statusRowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !active) return;
    const start = active.offsetLeft - row.offsetLeft;
    if (
      start < row.scrollLeft ||
      start + active.offsetWidth > row.scrollLeft + row.clientWidth
    )
      row.scrollLeft = start - 16;
  }, [filters.status]);

  return (
    <div className="my-events-toolbar">
      <div
        ref={statusRowRef}
        className="event-pill-row my-events-status-filter"
        role="group"
        aria-label="Filter by status"
      >
        {statusOptions.map((status) => {
          const active = filters.status === status;
          return (
            <button
              key={status ?? "ALL"}
              type="button"
              aria-pressed={active}
              className="event-pill"
              onClick={() => updateFilters({ status })}
            >
              {active && (
                <EventPillIndicator layoutId={`${id}-status-indicator`} />
              )}
              <span>{status ? EVENT_STATUS_LABELS[status] : "All events"}</span>
            </button>
          );
        })}
      </div>
      <div className="my-events-toolbar-end">
        <div className="explore-filter-field my-events-format-field">
          <label htmlFor={`${id}-format`}>Format</label>
          <div className="explore-select-wrap">
            <select
              id={`${id}-format`}
              value={filters.format ?? ""}
              onChange={(event) =>
                updateFilters({
                  format: (event.target.value || undefined) as
                    EventFormat | undefined,
                })
              }
            >
              <option value="">All formats</option>
              {Object.entries(EVENT_FORMAT_LABELS).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </div>
        {filtered && (
          <button
            type="button"
            className="explore-clear-filters"
            onClick={clearFilters}
          >
            Clear filters <X size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
