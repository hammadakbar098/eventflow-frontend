import { z } from "zod";

// Public selections verified in the Nest events and event-references services.
// Zod objects strip unknown fields, including private online access information.
export const eventFormatSchema = z.enum(["PHYSICAL", "ONLINE", "HYBRID"]);
export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export const eventCategorySchema = tagSchema.extend({
  description: z.string().nullish(),
});
export const venueSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  countryCode: z.string(),
});
export const venueSchema = venueSummarySchema.extend({
  addressLine1: z.string().nullish(),
  addressLine2: z.string().nullish(),
  state: z.string().nullish(),
  postalCode: z.string().nullish(),
  latitude: z.union([z.string(), z.number()]).nullish(),
  longitude: z.union([z.string(), z.number()]).nullish(),
});
export const eventImageSchema = z.object({
  storageKey: z.string(),
  altText: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
});
export const eventMediaSchema = eventImageSchema.extend({
  id: z.string(),
  type: z.enum(["COVER", "GALLERY"]),
  sortOrder: z.number().int(),
});
const eventBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  format: eventFormatSchema,
  startAt: z.string(),
  endAt: z.string(),
  timezone: z.string(),
  capacity: z.number().int().nonnegative().nullish(),
  category: eventCategorySchema.nullish(),
  tags: z.array(tagSchema).default([]),
});
export const eventSummarySchema = eventBaseSchema.extend({
  venue: venueSummarySchema.nullish(),
  coverImage: eventImageSchema.nullish(),
});
export const publicEventSchema = eventBaseSchema.extend({
  description: z.string().default(""),
  status: z.enum(["PUBLISHED", "SOLD_OUT"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  venue: venueSchema.nullish(),
  organizer: z
    .object({ id: z.string(), firstName: z.string(), lastName: z.string() })
    .nullish(),
  media: z.array(eventMediaSchema).default([]),
  onlineDetails: z.object({ platform: z.string() }).nullish(),
});
export const paginatedEventsSchema = z.object({
  data: z.array(eventSummarySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

// Organizer contracts verified against the running Nest API (/events/mine, /venues).
export const eventStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "SOLD_OUT",
  "CANCELLED",
  "POSTPONED",
  "COMPLETED",
]);
export const organizerEventSummarySchema = eventSummarySchema.extend({
  status: eventStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const paginatedOrganizerEventsSchema = paginatedEventsSchema.extend({
  data: z.array(organizerEventSummarySchema),
});
export const paginatedVenuesSchema = z.object({
  data: z.array(venueSchema),
  pagination: paginatedEventsSchema.shape.pagination,
});
// Create, update and lifecycle responses vary in shape (create nests tags, and
// several include private details); only the identifiers the UI needs are kept.
export const eventReferenceSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  status: eventStatusSchema,
});
export const eventMediaTypeSchema = eventMediaSchema.shape.type;
export const organizerMediaSchema = eventMediaSchema.extend({
  originalName: z.string().nullish(),
  mimeType: z.string().nullish(),
  sizeBytes: z.number().int().nullish(),
});
// The organizer detail is the only response that may carry private access data.
export const organizerEventSchema = publicEventSchema.extend({
  status: eventStatusSchema,
  cancelledAt: z.string().nullish(),
  cancellationReason: z.string().nullish(),
  postponedAt: z.string().nullish(),
  postponementReason: z.string().nullish(),
  media: z.array(organizerMediaSchema).default([]),
  onlineDetails: z
    .object({
      platform: z.string(),
      accessUrl: z.string(),
      accessCode: z.string().nullish(),
      accessInstructions: z.string().nullish(),
    })
    .nullish(),
});
