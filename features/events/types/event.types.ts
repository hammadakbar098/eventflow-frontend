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
