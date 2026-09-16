"use client";

import type { ReactNode } from "react";
import axios from "axios";
import { ArrowLeft, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { SessionRequiredState } from "@/features/auth/components/session-required-state";
import { isSessionError } from "@/features/auth/utils/auth-error";
import { useMyEvent } from "../hooks/use-events";
import type { OrganizerEvent } from "../types/event.types";
import { isEventNotFound } from "../utils/event-error";
import { EventErrorState } from "./event-state";
import { OrganizerBackRow } from "./organizer-page-header";

// Ownership failures surface as 404 from the API; 403 is treated the same way
// so no detail about other organizers' events is revealed.
const isUnavailable = (error: unknown) =>
  isEventNotFound(error) ||
  (axios.isAxiosError(error) && error.response?.status === 403);

/** Loads an organizer's private event and renders its shared failure states. */
export function OrganizerEventGate({
  slug,
  skeleton,
  children,
}: {
  slug: string;
  skeleton: ReactNode;
  children: (event: OrganizerEvent) => ReactNode;
}) {
  const query = useMyEvent(slug);
  if (query.isPending) return skeleton;
  if (query.isError)
    return (
      <div className="site-container event-detail">
        <OrganizerBackRow
          href={ROUTES.MY_EVENTS}
          label="Back to my events"
          eyebrow="Your organizer workspace"
        />
        {isUnavailable(query.error) ? (
          <div className="event-state min-h-[60vh]">
            <SearchX size={40} strokeWidth={1.2} aria-hidden="true" />
            <p className="eyebrow">Event not found</p>
            <h1>This event isn’t in your workspace.</h1>
            <p>It may have been deleted, or it belongs to another organizer.</p>
            <ButtonLink href={ROUTES.MY_EVENTS}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back to my events
            </ButtonLink>
          </div>
        ) : (
          <>
            <h1 className="sr-only">Manage event</h1>
            {isSessionError(query.error) ? (
              <SessionRequiredState expired />
            ) : (
              <EventErrorState
                error={query.error}
                onRetry={() => {
                  void query.refetch();
                }}
                title="This event is taking a moment."
              />
            )}
          </>
        )}
      </div>
    );
  return children(query.data);
}

export function ManageEventSkeleton() {
  return (
    <div
      className="site-container event-detail"
      role="status"
      aria-label="Loading your event"
    >
      <span className="sr-only">Getting your event ready.</span>
      <div aria-hidden="true">
        <div className="event-detail-backrow">
          <div className="event-skeleton h-3 w-28 rounded" />
        </div>
        <div className="event-detail-heading">
          <div>
            <div className="mb-6 flex gap-2">
              <div className="event-skeleton h-8 w-20 rounded-full" />
              <div className="event-skeleton h-8 w-24 rounded-full" />
              <div className="event-skeleton h-8 w-28 rounded-full" />
            </div>
            <div className="space-y-4">
              <div className="event-skeleton h-12 w-full rounded-md sm:h-18" />
              <div className="event-skeleton h-12 w-3/5 rounded-md sm:h-18" />
            </div>
          </div>
          <div className="space-y-4 pb-2">
            <div className="event-skeleton h-6 w-52 max-w-full rounded" />
            <div className="event-skeleton h-4 w-40 max-w-full rounded" />
            <div className="event-skeleton h-12 w-36 rounded-full" />
          </div>
        </div>
        <div className="event-detail-cover event-skeleton" />
        <div className="event-pill-row manage-event-tabs">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="event-skeleton h-11 w-28 rounded-full"
            />
          ))}
        </div>
        <div className="event-detail-body manage-event-body">
          <div className="space-y-8">
            <div className="event-skeleton h-4 w-24 rounded" />
            <div className="event-skeleton h-10 w-3/5 rounded" />
            <div className="space-y-3">
              {["100%", "92%", "76%"].map((width) => (
                <div
                  key={width}
                  className="event-skeleton h-4 rounded"
                  style={{ width }}
                />
              ))}
            </div>
          </div>
          <div className="event-detail-facts space-y-5">
            <div className="event-skeleton h-3 w-24 rounded" />
            <div className="event-skeleton h-7 w-40 rounded" />
            <div className="event-skeleton h-4 w-full rounded" />
            <div className="event-skeleton h-13 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventFormSkeleton() {
  return (
    <div
      className="site-container event-detail event-form-page"
      role="status"
      aria-label="Loading your event"
    >
      <span className="sr-only">Getting your event ready to edit.</span>
      <div aria-hidden="true">
        <div className="event-detail-backrow">
          <div className="event-skeleton h-3 w-28 rounded" />
        </div>
        <div className="explore-intro">
          <div className="w-full space-y-5">
            <div className="event-skeleton h-3 w-24 rounded" />
            <div className="event-skeleton h-16 w-80 max-w-full rounded-md" />
            <div className="event-skeleton h-16 w-60 max-w-full rounded-md" />
          </div>
        </div>
        <div className="event-detail-body">
          <div className="space-y-12">
            {[0, 1].map((section) => (
              <div key={section} className="space-y-6">
                <div className="event-skeleton h-6 w-40 rounded-full" />
                <div className="event-skeleton h-10 w-3/5 rounded" />
                {[0, 1, 2].map((field) => (
                  <div key={field} className="space-y-2">
                    <div className="event-skeleton h-3 w-24 rounded" />
                    <div className="event-skeleton h-13 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="event-detail-facts space-y-5">
            <div className="event-skeleton h-3 w-24 rounded" />
            <div className="event-skeleton h-7 w-44 rounded" />
            <div className="event-skeleton h-24 w-full rounded" />
            <div className="event-skeleton h-13 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
