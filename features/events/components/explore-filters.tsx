"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trapDialogFocus } from "@/utils/trap-dialog-focus";
import type { EventFilterControls } from "../hooks/use-event-filters";
import { useEventCategories } from "../hooks/use-events";
import { eventFilterParams, hasEventFilters } from "../utils/event-filters";
import { EVENT_FORMAT_LABELS } from "../utils/event-display";
import type { EventFormat } from "../types/event.types";
import { ExploreRefinements } from "./explore-refinements";

type CategoriesQuery = ReturnType<typeof useEventCategories>;

function PrimaryFilters({
  controls,
  categories,
}: {
  controls: EventFilterControls;
  categories: CategoriesQuery;
}) {
  const id = useId();
  const { filters, updateFilters } = controls;
  const unknownCategory =
    filters.categoryId &&
    !categories.data?.some((category) => category.id === filters.categoryId);

  return (
    <div className="explore-primary-filters">
      <div className="explore-filter-field">
        <label htmlFor={`${id}-category`}>Category</label>
        <div className="explore-select-wrap">
          <select
            id={`${id}-category`}
            value={filters.categoryId ?? ""}
            disabled={categories.isPending || categories.isError}
            onChange={(event) =>
              updateFilters({ categoryId: event.target.value || undefined })
            }
          >
            <option value="">
              {categories.isPending ? "Loading categories…" : "All categories"}
            </option>
            {unknownCategory && (
              <option value={filters.categoryId}>Selected category</option>
            )}
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
      </div>
      <div className="explore-filter-field">
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
            <option value="">Any way to join</option>
            {Object.entries(EVENT_FORMAT_LABELS).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function CategoryError({ categories }: { categories: CategoriesQuery }) {
  return categories.isError ? (
    <p className="explore-reference-error" role="status">
      Categories couldn’t load.{" "}
      <button
        type="button"
        onClick={() => {
          void categories.refetch();
        }}
      >
        Try again
      </button>
    </p>
  ) : null;
}

export function ExploreFilters({
  controls,
}: {
  controls: EventFilterControls;
}) {
  const categories = useEventCategories();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeCount = Object.keys(eventFilterParams(controls.filters)).filter(
    (key) => key !== "page" && key !== "limit" && key !== "search",
  ).length;
  const filtered = hasEventFilters(controls.filters) || controls.textPending;

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function closeMobile() {
    dialogRef.current?.close();
  }

  return (
    <div className="explore-filters">
      <div className="explore-desktop-filters">
        <div className="explore-filter-toolbar">
          <PrimaryFilters controls={controls} categories={categories} />
          <button
            type="button"
            className={`explore-filter-toggle${expanded ? " is-open" : ""}`}
            aria-label="Filters"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded(!expanded)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters{activeCount > 0 && <span>{activeCount}</span>}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {filtered && (
            <button
              type="button"
              className="explore-clear-filters"
              onClick={controls.clearFilters}
            >
              Clear filters <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        <CategoryError categories={categories} />
        {expanded && (
          <div id={panelId} className="explore-refinements-panel">
            <ExploreRefinements key={controls.resetKey} controls={controls} />
          </div>
        )}
      </div>
      <div className="explore-mobile-filter-toolbar">
        <button
          ref={triggerRef}
          type="button"
          className="explore-filter-toggle"
          aria-label="Filters"
          aria-haspopup="dialog"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          Filters{activeCount > 0 && <span>{activeCount}</span>}
        </button>
        {filtered ? (
          <button
            type="button"
            className="explore-clear-filters"
            onClick={controls.clearFilters}
          >
            Clear filters <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <span>Make it your kind of thing.</span>
        )}
      </div>
      <dialog
        ref={dialogRef}
        className="explore-filter-dialog"
        aria-labelledby={`${panelId}-title`}
        onKeyDown={trapDialogFocus}
        onClose={() => {
          setMobileOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobile();
        }}
      >
        {mobileOpen && (
          <div className="explore-filter-dialog-inner">
            <div className="explore-dialog-heading">
              <div>
                <p className="eyebrow">A little more you</p>
                <h2 id={`${panelId}-title`}>Find your flow.</h2>
              </div>
              <button
                type="button"
                className="explore-dialog-close"
                aria-label="Close filters"
                onClick={closeMobile}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <p className="explore-dialog-description">
              Filters update your results as you go.
            </p>
            <PrimaryFilters controls={controls} categories={categories} />
            <CategoryError categories={categories} />
            <ExploreRefinements key={controls.resetKey} controls={controls} />
            <div className="explore-dialog-actions">
              <Button variant="secondary" onClick={controls.clearFilters}>
                Clear filters
              </Button>
              <Button
                onClick={() => {
                  controls.updateFilters({});
                  closeMobile();
                }}
              >
                Show experiences
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
