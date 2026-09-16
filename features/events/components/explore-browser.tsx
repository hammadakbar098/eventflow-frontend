"use client";

import { useEffect } from "react";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import { useEventFilters } from "../hooks/use-event-filters";
import { useEvents } from "../hooks/use-events";
import { hasEventFilters } from "../utils/event-filters";
import { EventGridSkeleton } from "./event-card-skeleton";
import { EventEmptyState, EventErrorState } from "./event-state";
import { EventGrid } from "./event-grid";
import { EventPagination } from "./event-pagination";
import { ExploreFilters } from "./explore-filters";

export function ExploreBrowser() {
  const controls = useEventFilters();
  const {
    filters,
    textValues,
    textPending,
    updateFilters,
    updateText,
    clearFilters,
    goToPage,
  } = controls;
  const query = useEvents(filters);
  const pagination = query.data?.pagination;
  const filtered = hasEventFilters(filters);
  const updating = query.isFetching || textPending;
  const outOfRange =
    !!pagination &&
    !query.isPlaceholderData &&
    filters.page > Math.max(1, pagination.totalPages);

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
        <label className="sr-only" htmlFor="event-search">
          Search events
        </label>
        <input
          id="event-search"
          type="search"
          name="search"
          placeholder="An interest, a place, a new experience…"
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
      <ExploreFilters controls={controls} />
      <section
        className="explore-results"
        aria-labelledby="event-results-title"
        aria-busy={updating || outOfRange}
      >
        <div className="explore-results-heading">
          <div>
            <h2 id="event-results-title">
              {filtered ? "Your next possibilities" : "Upcoming experiences"}
            </h2>
            <p role="status" aria-live="polite">
              {query.isPending ? (
                "Finding your next experience…"
              ) : query.isError ? (
                "We couldn’t load the events."
              ) : updating || outOfRange ? (
                <>
                  <LoaderCircle
                    size={12}
                    aria-hidden="true"
                    className="animate-spin"
                  />{" "}
                  Updating experiences…
                </>
              ) : (
                `${pagination?.total ?? 0} ${(pagination?.total ?? 0) === 1 ? "event" : "events"} ${filtered ? "match your filters" : "to explore"}`
              )}
            </p>
          </div>
          <div className="explore-results-options">
            <span>Next up first</span>
            <label htmlFor="events-page-limit" className="sr-only">
              Events per page
            </label>
            <select
              id="events-page-limit"
              aria-label="Events per page"
              value={filters.limit}
              onChange={(event) =>
                updateFilters({ limit: Number(event.target.value) })
              }
            >
              {![12, 24, 48].includes(filters.limit) && (
                <option value={filters.limit}>{filters.limit} per page</option>
              )}
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
            </select>
          </div>
        </div>
        {query.isPending ? (
          <EventGridSkeleton />
        ) : query.isError ? (
          <EventErrorState
            error={query.error}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : query.data?.data.length ? (
          <div
            className={
              query.isPlaceholderData ? "explore-updating-grid" : undefined
            }
          >
            <EventGrid events={query.data.data} />
          </div>
        ) : outOfRange ? (
          <EventGridSkeleton />
        ) : (
          <EventEmptyState filtered={filtered} onClear={clearFilters} />
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
