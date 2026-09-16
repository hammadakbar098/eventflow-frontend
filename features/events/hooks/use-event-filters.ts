"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { EventFilters } from "../types/event.types";
import {
  DEFAULT_EVENT_FILTERS,
  eventFiltersSearchParams,
  parseEventFilters,
} from "../utils/event-filters";

type TextField = "search" | "city" | "countryCode";
type TextDraft = { source: string; values: Partial<Record<TextField, string>> };

const currentSearch = () =>
  new URLSearchParams(window.location.search).toString();

function writeFilters(filters: EventFilters, replace = false) {
  const normalized = parseEventFilters(eventFiltersSearchParams(filters));
  const query = eventFiltersSearchParams(normalized).toString();
  if (query === currentSearch()) return;
  const url = `${window.location.pathname}?${query}${window.location.hash}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

export function useEventFilters() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(
    () => parseEventFilters(new URLSearchParams(search)),
    [search],
  );
  const canonical = eventFiltersSearchParams(filters).toString();
  const [draft, setDraft] = useState<TextDraft | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const debouncedDraft = useDebouncedValue(draft);
  const activeDraft = draft?.source === search ? draft : null;

  // The URL is the committed state. Canonicalization never adds a history entry.
  useEffect(() => {
    if (search !== canonical && currentSearch() === search) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${canonical}${window.location.hash}`,
      );
    }
  }, [search, canonical]);

  useEffect(() => {
    const cancelDraft = () => {
      setDraft(null);
      setResetKey((key) => key + 1);
    };
    window.addEventListener("popstate", cancelDraft);
    return () => window.removeEventListener("popstate", cancelDraft);
  }, []);

  useEffect(() => {
    // A pending keystroke must never overwrite Back/Forward or another filter.
    if (
      !debouncedDraft ||
      debouncedDraft !== draft ||
      debouncedDraft.source !== currentSearch()
    )
      return;
    const current = parseEventFilters(
      new URLSearchParams(window.location.search),
    );
    writeFilters({ ...current, ...debouncedDraft.values, page: 1 });
  }, [debouncedDraft, draft, search]);

  const updateFilters = useCallback(
    (patch: Partial<EventFilters>) => {
      const current = parseEventFilters(
        new URLSearchParams(window.location.search),
      );
      const pending = draft?.source === currentSearch() ? draft.values : {};
      writeFilters({ ...current, ...pending, ...patch, page: 1 });
      setDraft(null);
    },
    [draft],
  );

  const updateText = useCallback((field: TextField, value: string) => {
    const source = currentSearch();
    setDraft((previous) => ({
      source,
      values: {
        ...(previous?.source === source ? previous.values : {}),
        [field]: value,
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setDraft(null);
    setResetKey((key) => key + 1);
    writeFilters(DEFAULT_EVENT_FILTERS);
  }, []);

  const goToPage = useCallback((page: number, replace = false) => {
    const current = parseEventFilters(
      new URLSearchParams(window.location.search),
    );
    writeFilters({ ...current, page }, replace);
  }, []);

  const textValues = {
    search: activeDraft?.values.search ?? filters.search ?? "",
    city: activeDraft?.values.city ?? filters.city ?? "",
    countryCode: activeDraft?.values.countryCode ?? filters.countryCode ?? "",
  };
  const textPending =
    activeDraft !== null &&
    eventFiltersSearchParams(
      parseEventFilters(
        eventFiltersSearchParams({
          ...filters,
          ...activeDraft.values,
          page: 1,
        }),
      ),
    ).toString() !== canonical;

  return {
    filters,
    textValues,
    textPending,
    resetKey,
    updateFilters,
    updateText,
    clearFilters,
    goToPage,
  };
}

export type EventFilterControls = ReturnType<typeof useEventFilters>;
