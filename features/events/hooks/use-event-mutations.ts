"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  addEventMedia,
  cancelEvent,
  completeEvent,
  createEvent,
  createVenue,
  deleteEvent,
  postponeEvent,
  publishEvent,
  removeEventMedia,
  reorderEventMedia,
  rescheduleEvent,
  updateEvent,
  updateEventMedia,
} from "../services/events.service";
import type {
  EventMediaOrderItem,
  EventMediaPayload,
  EventMediaUpdatePayload,
  EventReasonPayload,
  EventSchedulePayload,
  EventUpdatePayload,
} from "../types/event.types";
import { eventKeys } from "./event-keys";

export function useCreateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["events", "create"],
    mutationFn: createEvent,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: eventKeys.mine() }),
  });
}

export function useCreateVenueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["events", "venues", "create"],
    mutationFn: createVenue,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: eventKeys.venues() }),
  });
}

/**
 * Refreshes every view of one event. The private detail is awaited so the
 * triggering action stays pending until the new status is on screen; public
 * pages refresh too, because lifecycle changes alter what Explore shows.
 */
function refreshEvent(
  queryClient: QueryClient,
  slug: string,
  { publicViews = true } = {},
) {
  void queryClient.invalidateQueries({ queryKey: eventKeys.mineLists() });
  if (publicViews) {
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(slug) });
  }
  return queryClient.invalidateQueries({
    queryKey: eventKeys.mineDetail(slug),
  });
}

function useEventMutation<Variables, Result>(
  slug: string,
  name: string,
  mutationFn: (variables: Variables) => Promise<Result>,
  refresh: (queryClient: QueryClient) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["events", "mine", slug, name],
    mutationFn,
    onSuccess: () => refresh(queryClient),
  });
}

export const useUpdateEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "update",
    (payload: EventUpdatePayload) => updateEvent(slug, payload),
    // Only drafts can be edited, and drafts never appear publicly.
    (client) => refreshEvent(client, slug, { publicViews: false }),
  );

export const usePublishEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "publish",
    () => publishEvent(slug),
    (client) => refreshEvent(client, slug),
  );

export const usePostponeEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "postpone",
    (payload: EventReasonPayload) => postponeEvent(slug, payload),
    (client) => refreshEvent(client, slug),
  );

export const useRescheduleEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "reschedule",
    (payload: EventSchedulePayload) => rescheduleEvent(slug, payload),
    (client) => refreshEvent(client, slug),
  );

export const useCancelEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "cancel",
    (payload: EventReasonPayload) => cancelEvent(slug, payload),
    (client) => refreshEvent(client, slug),
  );

export const useCompleteEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "complete",
    () => completeEvent(slug),
    (client) => refreshEvent(client, slug),
  );

// The deleted detail is left alone so the page never refetches into a 404
// while navigating away.
export const useDeleteEventMutation = (slug: string) =>
  useEventMutation(
    slug,
    "delete",
    () => deleteEvent(slug),
    (client) => client.invalidateQueries({ queryKey: eventKeys.mineLists() }),
  );

export const useAddEventMediaMutation = (slug: string) =>
  useEventMutation(
    slug,
    "media-add",
    (payload: EventMediaPayload) => addEventMedia(slug, payload),
    (client) => refreshEvent(client, slug),
  );

export const useUpdateEventMediaMutation = (slug: string) =>
  useEventMutation(
    slug,
    "media-update",
    ({ mediaId, ...payload }: EventMediaUpdatePayload & { mediaId: string }) =>
      updateEventMedia(slug, mediaId, payload),
    (client) => refreshEvent(client, slug),
  );

export const useReorderEventMediaMutation = (slug: string) =>
  useEventMutation(
    slug,
    "media-reorder",
    (items: EventMediaOrderItem[]) => reorderEventMedia(slug, items),
    (client) => refreshEvent(client, slug),
  );

export const useRemoveEventMediaMutation = (slug: string) =>
  useEventMutation(
    slug,
    "media-remove",
    (mediaId: string) => removeEventMedia(slug, mediaId),
    (client) => refreshEvent(client, slug),
  );
