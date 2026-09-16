"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/utils/cn";
import { useTags } from "../hooks/use-events";
import type { Tag } from "../types/event.types";

// Searchable multi-select over the shared tag queries.
export function TagPicker({
  selectedIds,
  onChange,
  legend,
  hint,
  knownTags = [],
  error,
  className,
}: {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  legend: string;
  hint: string;
  knownTags?: Tag[];
  error?: string;
  className?: string;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [knownNames, setKnownNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(knownTags.map((tag) => [tag.id, tag.name])),
  );
  const debouncedSearch = useDebouncedValue(search);
  const allTags = useTags();
  const tags = useTags(debouncedSearch);
  const searching = tags.isFetching || search !== debouncedSearch;

  function toggleTag(tagId: string, name?: string) {
    if (name) setKnownNames((previous) => ({ ...previous, [tagId]: name }));
    onChange(
      selectedIds.includes(tagId)
        ? selectedIds.filter((value) => value !== tagId)
        : [...selectedIds, tagId],
    );
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
    <fieldset
      className={cn("explore-tag-filter", className)}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend>
        {legend} <span>{hint}</span>
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
          onKeyDown={(event) => {
            // Searching must never submit a surrounding form.
            if (event.key === "Enter") event.preventDefault();
          }}
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
      {error && (
        <p id={`${id}-error`} className="explore-date-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
