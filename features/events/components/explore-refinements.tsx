"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { EventFilterControls } from "../hooks/use-event-filters";
import { useTags } from "../hooks/use-events";
import { normalizeFilterDate } from "../utils/event-filters";

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
  const id = useId();
  const [search, setSearch] = useState("");
  const [knownNames, setKnownNames] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search);
  const allTags = useTags();
  const tags = useTags(debouncedSearch);
  const { filters, updateFilters } = controls;
  const selectedIds = [
    ...new Set([
      ...(filters.tagId ? [filters.tagId] : []),
      ...(filters.tagIds ?? []),
    ]),
  ];
  const searching = tags.isFetching || search !== debouncedSearch;

  function toggleTag(tagId: string, name?: string) {
    if (name) setKnownNames((previous) => ({ ...previous, [tagId]: name }));
    const selected = selectedIds.includes(tagId)
      ? selectedIds.filter((value) => value !== tagId)
      : [...selectedIds, tagId];
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
  }

  function tagName(tagId: string) {
    return (
      knownNames[tagId] ??
      allTags.data?.find((tag) => tag.id === tagId)?.name ??
      tags.data?.find((tag) => tag.id === tagId)?.name ??
      "Selected tag"
    );
  }

  return (
    <fieldset className="explore-tag-filter">
      <legend>
        Tags <span>Follow what interests you.</span>
      </legend>
      {selectedIds.length > 0 && (
        <div className="explore-selected-tags" aria-label="Selected tags">
          {selectedIds.map((tagId) => (
            <button
              type="button"
              key={tagId}
              onClick={() => toggleTag(tagId)}
              aria-label={`Remove ${tagName(tagId)} tag`}
            >
              {tagName(tagId)}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <label className="sr-only" htmlFor={`${id}-search`}>
        Search tags
      </label>
      <div className="explore-tag-search">
        <Search size={16} aria-hidden="true" />
        <input
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search interests…"
          maxLength={100}
          autoComplete="off"
        />
      </div>
      {tags.isError ? (
        <p className="explore-reference-error" role="status">
          Tags couldn’t load.{" "}
          <button
            type="button"
            onClick={() => {
              void tags.refetch();
            }}
          >
            Try again
          </button>
        </p>
      ) : (
        <>
          <div className="explore-tag-options" aria-busy={searching}>
            {tags.data?.map((tag) => (
              <label
                key={tag.id}
                className={`explore-tag-option${selectedIds.includes(tag.id) ? " is-selected" : ""}`}
              >
                <input
                  type="checkbox"
                  name="event-tags"
                  value={tag.id}
                  checked={selectedIds.includes(tag.id)}
                  disabled={tags.isPlaceholderData}
                  onChange={() => toggleTag(tag.id, tag.name)}
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
          <p className="explore-tag-status" role="status" aria-live="polite">
            {searching
              ? "Finding interests…"
              : tags.data?.length === 0
                ? "No tags found. Try another interest."
                : `${selectedIds.length ? `${selectedIds.length} selected. ` : ""}Choose one or more interests.`}
          </p>
        </>
      )}
    </fieldset>
  );
}
