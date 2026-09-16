"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  getEvent,
  getEventCategories,
  getEvents,
  getTags,
} from "../services/events.service";
import type { EventFilters } from "../types/event.types";
import { eventKeys } from "./event-keys";

function retryPublicQuery(count: number, error: unknown) {
  if (
    axios.isAxiosError(error) &&
    error.response &&
    error.response.status < 500
  )
    return false;
  return count < 1;
}
export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: ({ signal }) => getEvents(filters, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: retryPublicQuery,
    networkMode: "always",
  });
}
export function useEvent(slug: string) {
  return useQuery({
    queryKey: eventKeys.detail(slug),
    queryFn: ({ signal }) => getEvent(slug, signal),
    staleTime: 60_000,
    retry: retryPublicQuery,
    networkMode: "always",
  });
}
export function useEventCategories() {
  return useQuery({
    queryKey: eventKeys.categories(),
    queryFn: ({ signal }) => getEventCategories(signal),
    staleTime: 10 * 60_000,
    retry: retryPublicQuery,
    networkMode: "always",
  });
}
export function useTags(search = "") {
  return useQuery({
    queryKey: eventKeys.tags(search),
    queryFn: ({ signal }) => getTags(search, signal),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: retryPublicQuery,
    networkMode: "always",
  });
}
