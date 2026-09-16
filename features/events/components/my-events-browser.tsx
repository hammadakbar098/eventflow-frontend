"use client";

import { useEffect } from "react";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import { SessionRequiredState } from "@/features/auth/components/session-required-state";
import { isSessionError } from "@/features/auth/utils/auth-error";
import { useMyEventFilters } from "../hooks/use-event-filters";
import { useMyEvents } from "../hooks/use-events";
import { EVENT_STATUS_LABELS } from "../utils/event-display";
import { hasMyEventFilters } from "../utils/event-filters";
import { EventErrorState } from "./event-state";
import { EventPagination } from "./event-pagination";
import { MyEventList, MyEventListSkeleton } from "./my-event-row";
import { MyEventsEmptyState } from "./my-events-states";
import { MyEventsFilters } from "./my-events-filters";

export function MyEventsBrowser() {
  const controls = useMyEventFilters();
  const {
    filters,
    textValues,
    textPending,
    updateFilters,
    updateText,
    clearFilters,
    goToPage,
  } = controls;
  const query = useMyEvents(filters);
  const pagination = query.data?.pagination;
  const filtered = hasMyEventFilters(filters);
  const updating = query.isFetching || textPending;
  const outOfRange =
    !!pagination &&
    !query.isPlaceholderData &&
    filters.page > Math.max(1, pagination.totalPages);
  const total = pagination?.total ?? 0;

  useEffect(() => {
    if (outOfRange && pagination)
      goToPage(Math.max(1, pagination.totalPages), true);
  }, [outOfRange, pagination, goToPage]);

  return (
    <div className="site-container explore-browser">
      <form
        className="explore-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateFilters({ search: textValues.search });
        }}
      >
        <Search size={22} strokeWidth={1.6} aria-hidden="true" />
        <label className="sr-only" htmlFor="my-event-search">
          Search your events
        </label>
        <input
          id="my-event-search"
          type="search"
          name="search"
          placeholder="Search your events by title…"
          value={textValues.search}
          onChange={(event) => updateText("search", event.target.value)}
          maxLength={100}
          autoComplete="off"
        />
        {textValues.search && (
          <button
            type="button"
            className="explore-search-clear"
            aria-label="Clear search"
            onClick={() => updateFilters({ search: undefined })}
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          className="explore-search-submit"
          aria-label="Submit event search"
        >
          <ArrowRight size={22} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </form>
      <MyEventsFilters controls={controls} />
      <section
        className="explore-results"
        aria-labelledby="my-events-results-title"
        aria-busy={updating || outOfRange}
      >
        <div className="explore-results-heading">
          <div>
            <h2 id="my-events-results-title">
              {filters.status
                ? `${EVENT_STATUS_LABELS[filters.status]} events`
                : "Everything you’re hosting"}
            </h2>
            <p role="status" aria-live="polite">
              {query.isPending ? (
                "Gathering your events…"
              ) : query.isError ? (
                "We couldn’t load your events."
              ) : updating || outOfRange ? (
                <>
                  <LoaderCircle
                    size={12}
                    aria-hidden="true"
                    className="animate-spin"
                  />{" "}
                  Updating your events…
                </>
              ) : (
                `${total} ${total === 1 ? "event" : "events"} ${filtered ? "match your filters" : "in your workspace"}`
              )}
            </p>
          </div>
        </div>
        {query.isPending ? (
          <MyEventListSkeleton />
        ) : query.isError ? (
          isSessionError(query.error) ? (
            <SessionRequiredState expired />
          ) : (
            <EventErrorState
              error={query.error}
              onRetry={() => {
                void query.refetch();
              }}
              title="Your events are taking a moment."
            />
          )
        ) : query.data?.data.length ? (
          <div
            className={
              query.isPlaceholderData ? "explore-updating-grid" : undefined
            }
          >
            <MyEventList events={query.data.data} />
          </div>
        ) : outOfRange ? (
          <MyEventListSkeleton />
        ) : (
          <MyEventsEmptyState filtered={filtered} onClear={clearFilters} />
        )}
        {pagination && pagination.totalPages > 1 && !query.isError && (
          <EventPagination
            page={filters.page}
            totalPages={pagination.totalPages}
            disabled={updating || query.isPlaceholderData || outOfRange}
            onPageChange={(page) => goToPage(page)}
          />
        )}
      </section>
    </div>
  );
}
