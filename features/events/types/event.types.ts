import type { z } from "zod";
import type {
  eventFormatSchema,
  tagSchema,
  eventCategorySchema,
  venueSummarySchema,
  venueSchema,
  eventImageSchema,
  eventMediaSchema,
  eventSummarySchema,
  publicEventSchema,
  paginatedEventsSchema,
  eventStatusSchema,
  organizerEventSummarySchema,
  paginatedOrganizerEventsSchema,
  paginatedVenuesSchema,
  eventReferenceSchema,
  eventMediaTypeSchema,
  organizerMediaSchema,
  organizerEventSchema,
} from "../schemas/event.schema";

export type EventFormat = z.infer<typeof eventFormatSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
export type VenueSummary = z.infer<typeof venueSummarySchema>;
export type Venue = z.infer<typeof venueSchema>;
export type EventImage = z.infer<typeof eventImageSchema>;
export type EventMedia = z.infer<typeof eventMediaSchema>;
export type EventSummary = z.infer<typeof eventSummarySchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PaginatedEvents = z.infer<typeof paginatedEventsSchema>;
export type Organizer = NonNullable<PublicEvent["organizer"]>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type OrganizerEventSummary = z.infer<typeof organizerEventSummarySchema>;
export type PaginatedOrganizerEvents = z.infer<
  typeof paginatedOrganizerEventsSchema
>;
export type PaginatedVenues = z.infer<typeof paginatedVenuesSchema>;
export type EventReference = z.infer<typeof eventReferenceSchema>;
export type EventMediaType = z.infer<typeof eventMediaTypeSchema>;
export type OrganizerMedia = z.infer<typeof organizerMediaSchema>;
export type OrganizerEvent = z.infer<typeof organizerEventSchema>;

export interface EventFilters {
  page: number;
  limit: number;
  search?: string;
  format?: EventFormat;
  categoryId?: string;
  city?: string;
  countryCode?: string;
  tagId?: string;
  tagIds?: string[];
  startFrom?: string;
  startTo?: string;
}

export interface MyEventFilters {
  page: number;
  limit: number;
  search?: string;
  status?: EventStatus;
  format?: EventFormat;
}

// Request bodies mirror the Nest CreateEventDto and CreateVenueDto allowlists.
export interface OnlineDetailsPayload {
  platform: string;
  accessUrl: string;
  accessCode?: string;
  accessInstructions?: string;
}
export interface EventPayload {
  title: string;
  description: string;
  format: EventFormat;
  categoryId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  capacity?: number;
  venueId?: string;
  tagIds: string[];
  onlineDetails?: OnlineDetailsPayload;
}
/**
 * PATCH body for drafts. Omitted fields keep their value; `null` clears
 * capacity, venueId or onlineDetails. Nested access fields ignore `null`, so an
 * empty string is the only way to clear them.
 */
export interface EventUpdatePayload {
  title?: string;
  description?: string;
  format?: EventFormat;
  categoryId?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  capacity?: number | null;
  venueId?: string | null;
  tagIds?: string[];
  onlineDetails?: OnlineDetailsPayload | null;
}
export interface EventReasonPayload {
  reason: string;
}
export interface EventSchedulePayload {
  startAt: string;
  endAt: string;
  timezone: string;
}
export interface EventMediaPayload {
  type: EventMediaType;
  storageKey: string;
  originalName?: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  altText?: string;
}
export interface EventMediaUpdatePayload {
  altText: string | null;
}
export interface EventMediaOrderItem {
  mediaId: string;
  sortOrder: number;
}
export interface VenuePayload {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
}
