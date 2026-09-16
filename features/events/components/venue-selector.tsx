"use client";

import { useId, useRef, useState } from "react";
import { Check, MapPin, Plus, Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/utils/cn";
import { useVenues } from "../hooks/use-events";
import type { Venue } from "../types/event.types";
import { countryName } from "../utils/event-display";
import { CreateVenueDialog } from "./create-venue-dialog";

function venueAddress(venue: Venue) {
  return [
    venue.addressLine1,
    [venue.postalCode, venue.city].filter(Boolean).join(" "),
    countryName(venue.countryCode),
  ]
    .filter(Boolean)
    .join(", ");
}

export function VenueSelector({
  value,
  onChange,
  initialVenue = null,
  error,
  inputRef,
}: {
  value: string;
  onChange: (venueId: string) => void;
  initialVenue?: Venue | null;
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [knownVenue, setKnownVenue] = useState<Venue | null>(initialVenue);
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const debouncedSearch = useDebouncedValue(search);
  const venues = useVenues(debouncedSearch);
  const searching = venues.isFetching || search !== debouncedSearch;
  const selected =
    value &&
    (knownVenue?.id === value
      ? knownVenue
      : venues.data?.data.find((venue) => venue.id === value));
  const listVisible = !value || browsing;

  function choose(venue: Venue) {
    setKnownVenue(venue);
    setBrowsing(false);
    onChange(venue.id);
  }

  return (
    <fieldset
      className="event-venue-picker"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend>
        Venue <span>Where people will meet.</span>
      </legend>
      {value && (
        <div className="event-venue-selected">
          <MapPin size={20} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="eyebrow">Selected venue</p>
            <strong>{selected ? selected.name : "Selected venue"}</strong>
            {selected && <span>{venueAddress(selected)}</span>}
          </div>
          <button
            type="button"
            className="text-link min-h-11"
            aria-expanded={browsing}
            aria-controls={`${id}-options`}
            onClick={() => setBrowsing(!browsing)}
          >
            {browsing ? "Keep this venue" : "Change venue"}
          </button>
        </div>
      )}
      {listVisible && (
        <div id={`${id}-options`}>
          <label className="sr-only" htmlFor={`${id}-search`}>
            Search venues
          </label>
          <div className="explore-tag-search event-venue-search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={inputRef}
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Search by venue name or city…"
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(error) && !value}
            />
          </div>
          {venues.isError ? (
            <p className="explore-reference-error" role="status">
              Venues couldn’t load.{" "}
              <button
                type="button"
                onClick={() => {
                  void venues.refetch();
                }}
              >
                Try again
              </button>
            </p>
          ) : (
            <ul
              className="event-venue-options"
              aria-label="Venues"
              aria-busy={searching}
            >
              {venues.data?.data.map((venue) => {
                const active = venue.id === value;
                return (
                  <li key={venue.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      disabled={venues.isPlaceholderData}
                      className={cn(
                        "event-venue-option",
                        active && "is-selected",
                      )}
                      onClick={() => choose(venue)}
                    >
                      <span>
                        <strong>{venue.name}</strong>
                        <span>{venueAddress(venue)}</span>
                      </span>
                      {active && <Check size={16} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="event-venue-footer">
            <p className="explore-tag-status" role="status" aria-live="polite">
              {searching
                ? "Finding venues…"
                : venues.data?.data.length === 0
                  ? "No venues found. You can add it in a moment."
                  : "Can’t find your venue?"}
            </p>
            <button
              ref={addTriggerRef}
              type="button"
              className="event-venue-add"
              aria-haspopup="dialog"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} aria-hidden="true" />
              Add a new venue
            </button>
          </div>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="explore-date-error">
          {error}
        </p>
      )}
      {creating && (
        <CreateVenueDialog
          initialName={search}
          onCreated={(venue) => {
            setSearch("");
            choose(venue);
          }}
          onClose={() => {
            setCreating(false);
            addTriggerRef.current?.focus();
          }}
        />
      )}
    </fieldset>
  );
}
