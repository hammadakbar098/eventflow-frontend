import { z } from "zod";
import { eventFormatSchema } from "./event.schema";
import { isValidTimeZone, zonedDateTimeToIso } from "../utils/event-time";

// Limits mirror the Nest CreateEventDto/CreateVenueDto and their Prisma columns.
const MAX_CAPACITY = 2_147_483_647;

export type EventFormMode = "create" | "edit";

export function isJoinableUrl(value: string) {
  try {
    const url = new URL(value);
    // The API requires a top-level domain; meeting links are web addresses.
    return (
      ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

const capacitySchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (!value) return;
    const capacity = Number(value);
    const message = !Number.isInteger(capacity)
      ? "Capacity must be a whole number."
      : capacity < 1
        ? "Capacity must be at least 1 person."
        : capacity > MAX_CAPACITY
          ? "Capacity must be 2,147,483,647 people or fewer."
          : null;
    if (message) context.addIssue({ code: "custom", message });
  });

const scheduleFields = {
  startAt: z.string().min(1, "Choose when your event starts."),
  endAt: z.string().min(1, "Choose when your event ends."),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
};

/** Shared by the event form and rescheduling, so dates validate identically. */
function addScheduleIssues(
  values: { startAt: string; endAt: string; timezone: string },
  context: z.RefinementCtx,
  { requireFutureStart }: { requireFutureStart: boolean },
) {
  if (!isValidTimeZone(values.timezone)) return;
  const issue = (path: string, message: string) =>
    context.addIssue({ code: "custom", path: [path], message });
  const unavailable =
    "This time doesn’t exist in the selected timezone. Choose another time.";
  const start =
    values.startAt && zonedDateTimeToIso(values.startAt, values.timezone);
  const end = values.endAt && zonedDateTimeToIso(values.endAt, values.timezone);
  if (start === null) issue("startAt", unavailable);
  if (end === null) issue("endAt", unavailable);
  if (requireFutureStart && start && Date.parse(start) <= Date.now())
    issue("startAt", "Choose a start time in the future.");
  if (start && end && Date.parse(end) <= Date.parse(start))
    issue("endAt", "The event must end after it starts.");
}

export function createEventFormSchema(mode: EventFormMode) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, "Give your event a title.")
        .max(200, "Keep the title to 200 characters or fewer."),
      // Whitespace inside the description is meaningful and preserved.
      description: z
        .string()
        .refine(
          (value) => value.trim().length > 0,
          "Tell people what to expect.",
        ),
      categoryId: z.string().min(1, "Choose a category."),
      format: eventFormatSchema,
      ...scheduleFields,
      capacity: capacitySchema,
      venueId: z.string(),
      tagIds: z.array(z.string()),
      onlineDetails: z.object({
        platform: z.string(),
        accessUrl: z.string(),
        accessCode: z.string(),
        accessInstructions: z.string(),
      }),
    })
    .superRefine((values, context) => {
      const issue = (path: string[], message: string) =>
        context.addIssue({ code: "custom", path, message });

      // Drafts may keep past dates while editing; publishing checks them.
      addScheduleIssues(values, context, {
        requireFutureStart: mode === "create",
      });

      // Only the details relevant to the chosen format are validated and sent.
      if (values.format !== "ONLINE" && !values.venueId)
        issue(["venueId"], "Choose a venue, or add a new one.");

      if (values.format !== "PHYSICAL") {
        const { platform, accessUrl, accessCode } = values.onlineDetails;
        if (!platform.trim())
          issue(
            ["onlineDetails", "platform"],
            "Add the platform people will join on.",
          );
        else if (platform.trim().length > 100)
          issue(
            ["onlineDetails", "platform"],
            "Keep the platform name to 100 characters or fewer.",
          );
        if (!accessUrl.trim())
          issue(
            ["onlineDetails", "accessUrl"],
            "Add the link people will use to join.",
          );
        else if (accessUrl.trim().length > 2048)
          issue(
            ["onlineDetails", "accessUrl"],
            "Keep the link to 2,048 characters or fewer.",
          );
        else if (!isJoinableUrl(accessUrl.trim()))
          issue(
            ["onlineDetails", "accessUrl"],
            "Enter a full link, starting with https://",
          );
        if (accessCode.trim().length > 100)
          issue(
            ["onlineDetails", "accessCode"],
            "Keep the access code to 100 characters or fewer.",
          );
      }
    });
}

export type EventFormValues = z.infer<ReturnType<typeof createEventFormSchema>>;

const requiredText = (max: number, missing: string, label: string) =>
  z
    .string()
    .trim()
    .min(1, missing)
    .max(max, `Keep the ${label} to ${max} characters or fewer.`);
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep the ${label} to ${max} characters or fewer.`);
const coordinate = (label: string, limit: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        (/^-?\d{1,3}(\.\d+)?$/.test(value) && Math.abs(Number(value)) <= limit),
      `${label} must be a number between -${limit} and ${limit}.`,
    );

export const venueFormSchema = z
  .object({
    name: requiredText(200, "Enter the venue name.", "venue name"),
    addressLine1: requiredText(255, "Enter the street address.", "address"),
    addressLine2: optionalText(255, "address"),
    city: requiredText(100, "Enter the city.", "city"),
    state: optionalText(100, "state or region"),
    postalCode: requiredText(30, "Enter the postal code.", "postal code"),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a two-letter country code, like DE."),
    latitude: coordinate("Latitude", 90),
    longitude: coordinate("Longitude", 180),
  })
  .superRefine(({ latitude, longitude }, context) => {
    if (Boolean(latitude) !== Boolean(longitude))
      context.addIssue({
        code: "custom",
        path: [latitude ? "longitude" : "latitude"],
        message: "Add both coordinates, or leave both empty.",
      });
  });

export type VenueFormValues = z.infer<typeof venueFormSchema>;

// The API only reschedules postponed events into the future.
export const rescheduleFormSchema = z
  .object(scheduleFields)
  .superRefine((values, context) =>
    addScheduleIssues(values, context, { requireFutureStart: true }),
  );
export type RescheduleFormValues = z.infer<typeof rescheduleFormSchema>;

export const eventReasonFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Add a short reason.")
    .max(500, "Keep the reason to 500 characters or fewer."),
});
export type EventReasonFormValues = z.infer<typeof eventReasonFormSchema>;

// Formats accepted by the media endpoint (SVG and HEIC are rejected).
export const EVENT_IMAGE_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
} as const;
export type EventImageMimeType = keyof typeof EVENT_IMAGE_TYPES;

export function inferImageMimeType(
  storageKey: string,
): EventImageMimeType | "" {
  const extension = storageKey.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  const match = Object.entries(EVENT_IMAGE_TYPES).find(([, extensions]) =>
    (extensions as readonly string[]).includes(extension ?? ""),
  );
  return (match?.[0] as EventImageMimeType | undefined) ?? "";
}

/** Keys point inside media storage; URLs and path traversal are rejected. */
export function isStorageKey(value: string) {
  return (
    !/[\s\\\u0000-\u001f]/.test(value) &&
    !/^[a-z][a-z\d+.-]*:/i.test(value) &&
    !value.startsWith("//") &&
    !value.split("/").includes("..")
  );
}

const optionalWholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        (/^\d+$/.test(value) &&
          Number(value) >= 1 &&
          Number(value) <= 2_147_483_647),
      `${label} must be a whole number above 0.`,
    );

const altTextSchema = z
  .string()
  .trim()
  .min(1, "Describe the image for people who can’t see it.")
  .max(255, "Keep the alt text to 255 characters or fewer.");

export const eventMediaFormSchema = z.object({
  storageKey: z
    .string()
    .trim()
    .min(1, "Enter the image’s storage key.")
    .max(500, "Keep the storage key to 500 characters or fewer.")
    .refine(
      isStorageKey,
      "Use a storage path such as events/my-event/cover.webp, without spaces or full URLs.",
    ),
  altText: altTextSchema,
  mimeType: z
    .string()
    .refine(
      (value) => value in EVENT_IMAGE_TYPES,
      "Choose JPEG, PNG, WebP, AVIF or GIF.",
    ),
  originalName: z
    .string()
    .trim()
    .max(255, "Keep the file name to 255 characters or fewer."),
  width: optionalWholeNumber("Width"),
  height: optionalWholeNumber("Height"),
  sizeBytes: optionalWholeNumber("File size"),
});
export type EventMediaFormValues = z.infer<typeof eventMediaFormSchema>;

export const altTextFormSchema = z.object({ altText: altTextSchema });
export type AltTextFormValues = z.infer<typeof altTextFormSchema>;
