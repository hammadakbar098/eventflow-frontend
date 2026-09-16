"use client";

import { useId, useState } from "react";
import type { EventFilterControls } from "../hooks/use-event-filters";
import { normalizeFilterDate } from "../utils/event-filters";
import { TagPicker } from "./tag-picker";

export function ExploreRefinements({
  controls,
}: {
  controls: EventFilterControls;
}) {
  const id = useId();
  const { filters, textValues, updateText, updateFilters } = controls;
  const [dateIssue, setDateIssue] = useState<{
    message: string;
    source: string;
  } | null>(null);
  const from = filters.startFrom?.slice(0, 10) ?? "";
  const to = filters.startTo?.slice(0, 10) ?? "";
  const dateSource = `${filters.startFrom ?? ""}|${filters.startTo ?? ""}`;
  const dateError = dateIssue?.source === dateSource ? dateIssue.message : "";
  const today = new Date().toISOString().slice(0, 10);

  function updateDate(field: "startFrom" | "startTo", value: string) {
    setDateIssue(null);
    const date = normalizeFilterDate(value, field === "startTo");
    if (
      field === "startTo" &&
      date &&
      date < (filters.startFrom ?? new Date().toISOString())
    ) {
      setDateIssue({
        source: dateSource,
        message: filters.startFrom
          ? "Choose an end date on or after the start date."
          : "Choose today or a later end date to explore upcoming events.",
      });
      return;
    }
    if (
      field === "startFrom" &&
      date &&
      filters.startTo &&
      date > filters.startTo
    ) {
      updateFilters({ startFrom: date, startTo: undefined });
    } else updateFilters({ [field]: date });
  }

  return (
    <div className="explore-refinements">
      <div className="explore-refinement-fields">
        <div className="explore-filter-field">
          <label htmlFor={`${id}-city`}>City</label>
          <input
            id={`${id}-city`}
            type="text"
            value={textValues.city}
            placeholder="Anywhere sounds good"
            onChange={(event) => updateText("city", event.target.value)}
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>
        <div className="explore-filter-field">
          <label htmlFor={`${id}-country`}>Country</label>
          <input
            id={`${id}-country`}
            type="text"
            value={textValues.countryCode}
            placeholder="e.g. DE"
            onChange={(event) =>
              updateText("countryCode", event.target.value.toUpperCase())
            }
            maxLength={2}
            autoCapitalize="characters"
            autoComplete="country"
            aria-describedby={`${id}-country-hint`}
          />
          <span id={`${id}-country-hint`} className="explore-filter-hint">
            Two-letter country code
          </span>
        </div>
        <div className="explore-filter-field">
          <label htmlFor={`${id}-from`}>From date</label>
          <input
            id={`${id}-from`}
            type="date"
            value={from}
            max="9999-12-31"
            onChange={(event) => updateDate("startFrom", event.target.value)}
            aria-describedby={`${id}-date-hint`}
          />
        </div>
        <div className="explore-filter-field">
          <label htmlFor={`${id}-to`}>To date</label>
          <input
            id={`${id}-to`}
            type="date"
            value={to}
            min={from || today}
            max="9999-12-31"
            onChange={(event) => updateDate("startTo", event.target.value)}
            aria-describedby={`${id}-date-hint${dateError ? ` ${id}-date-error` : ""}`}
            aria-invalid={!!dateError}
          />
        </div>
      </div>
      <p id={`${id}-date-hint`} className="explore-date-hint">
        Choose dates in UTC. Event times are shown in their local timezone.
      </p>
      {dateError && (
        <p id={`${id}-date-error`} className="explore-date-error" role="alert">
          {dateError}
        </p>
      )}
      <ExploreTagFilter controls={controls} />
    </div>
  );
}

function ExploreTagFilter({ controls }: { controls: EventFilterControls }) {
  const { filters, updateFilters } = controls;
  const selectedIds = [
    ...new Set([
      ...(filters.tagId ? [filters.tagId] : []),
      ...(filters.tagIds ?? []),
    ]),
  ];

  return (
    <TagPicker
      legend="Tags"
      hint="Follow what interests you."
      selectedIds={selectedIds}
      onChange={(selected) => {
        // Nest accepts any UUID for tagId but only v4 IDs in the tagIds array.
        const singular =
          selected.length === 1
            ? selected[0]
            : selected.find((value) => value.split("-")[2]?.[0] !== "4");
        updateFilters({
          tagId: singular,
          tagIds:
            selected.length > 1
              ? selected.filter((value) => value !== singular)
              : undefined,
        });
      }}
    />
  );
}
