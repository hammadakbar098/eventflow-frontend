"use client";

import { useUrlFilters, type UrlFilterCodec } from "@/hooks/use-url-filters";
import type { EventFilters, MyEventFilters } from "../types/event.types";
import {
  DEFAULT_EVENT_FILTERS,
  DEFAULT_MY_EVENT_FILTERS,
  eventFilterParams,
  myEventFilterParams,
  parseEventFilters,
  parseMyEventFilters,
} from "../utils/event-filters";

const exploreFilterCodec: UrlFilterCodec<
  EventFilters,
  "search" | "city" | "countryCode"
> = {
  defaults: DEFAULT_EVENT_FILTERS,
  textFields: ["search", "city", "countryCode"],
  parse: parseEventFilters,
  toParams: eventFilterParams,
};

const myEventFilterCodec: UrlFilterCodec<MyEventFilters, "search"> = {
  defaults: DEFAULT_MY_EVENT_FILTERS,
  textFields: ["search"],
  parse: parseMyEventFilters,
  toParams: myEventFilterParams,
};

export function useEventFilters() {
  return useUrlFilters(exploreFilterCodec);
}

export function useMyEventFilters() {
  return useUrlFilters(myEventFilterCodec);
}

export type EventFilterControls = ReturnType<typeof useEventFilters>;
export type MyEventFilterControls = ReturnType<typeof useMyEventFilters>;
