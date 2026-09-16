"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type SearchParams = Pick<URLSearchParams, "get" | "getAll">;
type UrlFilters<TextField extends string> = { page: number } & Partial<
  Record<TextField, string>
>;

export interface UrlFilterCodec<
  Filters extends UrlFilters<TextField>,
  TextField extends string,
> {
  defaults: Filters;
  textFields: readonly TextField[];
  parse: (params: SearchParams) => Filters;
  toParams: (filters: Filters) => Record<string, string>;
}

type TextDraft<TextField extends string> = {
  source: string;
  values: Partial<Record<TextField, string>>;
};

const currentSearch = () =>
  new URLSearchParams(window.location.search).toString();

function toSearchParams<F extends UrlFilters<T>, T extends string>(
  codec: UrlFilterCodec<F, T>,
  filters: F,
) {
  return new URLSearchParams(codec.toParams(filters));
}

function writeFilters<F extends UrlFilters<T>, T extends string>(
  codec: UrlFilterCodec<F, T>,
  filters: F,
  replace = false,
) {
  const normalized = codec.parse(toSearchParams(codec, filters));
  const query = toSearchParams(codec, normalized).toString();
  if (query === currentSearch()) return;
  const url = `${window.location.pathname}?${query}${window.location.hash}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

// Pass a module-level codec so the returned callbacks stay stable.
export function useUrlFilters<F extends UrlFilters<T>, T extends string>(
  codec: UrlFilterCodec<F, T>,
) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(
    () => codec.parse(new URLSearchParams(search)),
    [codec, search],
  );
  const canonical = toSearchParams(codec, filters).toString();
  const [draft, setDraft] = useState<TextDraft<T> | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const debouncedDraft = useDebouncedValue(draft);
  const committedDraft = useRef<TextDraft<T> | null>(null);
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
    // Back can return to a committed draft's source before popstate clears it;
    // a draft is only ever written once.
    if (
      !debouncedDraft ||
      debouncedDraft !== draft ||
      debouncedDraft === committedDraft.current ||
      debouncedDraft.source !== currentSearch()
    )
      return;
    committedDraft.current = debouncedDraft;
    const current = codec.parse(new URLSearchParams(window.location.search));
    writeFilters(codec, { ...current, ...debouncedDraft.values, page: 1 });
  }, [codec, debouncedDraft, draft, search]);

  const updateFilters = useCallback(
    (patch: Partial<F>) => {
      const current = codec.parse(new URLSearchParams(window.location.search));
      const pending = draft?.source === currentSearch() ? draft.values : {};
      writeFilters(codec, { ...current, ...pending, ...patch, page: 1 });
      setDraft(null);
    },
    [codec, draft],
  );

  const updateText = useCallback((field: T, value: string) => {
    const source = currentSearch();
    setDraft((previous) => ({
      source,
      values: {
        ...(previous?.source === source ? previous.values : {}),
        [field]: value,
      } as Partial<Record<T, string>>,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setDraft(null);
    setResetKey((key) => key + 1);
    writeFilters(codec, codec.defaults);
  }, [codec]);

  const goToPage = useCallback(
    (page: number, replace = false) => {
      const current = codec.parse(new URLSearchParams(window.location.search));
      writeFilters(codec, { ...current, page }, replace);
    },
    [codec],
  );

  const textValues = Object.fromEntries(
    codec.textFields.map((field) => [
      field,
      activeDraft?.values[field] ?? filters[field] ?? "",
    ]),
  ) as Record<T, string>;
  const textPending =
    activeDraft !== null &&
    toSearchParams(
      codec,
      codec.parse(
        toSearchParams(codec, { ...filters, ...activeDraft.values, page: 1 }),
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
