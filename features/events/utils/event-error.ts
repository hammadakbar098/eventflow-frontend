import axios from "axios";
export function isEventNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
export function eventErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && !error.response)
    return "We couldn’t connect. Check your connection and try again.";
  if (isEventNotFound(error))
    return "This event may have moved or is no longer available.";
  return "We couldn’t load the events right now. Please try again in a moment.";
}

export type EventFormField =
  | "title"
  | "description"
  | "categoryId"
  | "format"
  | "startAt"
  | "endAt"
  | "timezone"
  | "capacity"
  | "venueId"
  | "tagIds"
  | "onlineDetails.platform"
  | "onlineDetails.accessUrl"
  | "onlineDetails.accessCode"
  | "onlineDetails.accessInstructions";
export type VenueFormField =
  | "name"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "countryCode"
  | "latitude"
  | "longitude";

export interface MutationFeedback<Field extends string> {
  message: string;
  fields: Partial<Record<Field, string>>;
  sessionExpired: boolean;
}

type ServiceRule<Field extends string> = [RegExp, Field, string];
type MessageRule = [RegExp, string];

const eventFieldCopy: Record<EventFormField, string> = {
  title: "Check the title. It needs between 1 and 200 characters.",
  description: "Add a description for your event.",
  categoryId: "Choose a category from the list.",
  format: "Choose how people will join.",
  startAt: "Check the start date and time.",
  endAt: "Check the end date and time.",
  timezone: "Choose a valid timezone.",
  capacity: "Capacity must be a whole number, from 1 upwards.",
  venueId: "Choose a venue from the list.",
  tagIds: "One or more tags couldn’t be used. Remove them and try again.",
  "onlineDetails.platform": "Add the platform people will join on.",
  "onlineDetails.accessUrl": "Enter a full link, starting with https://",
  "onlineDetails.accessCode":
    "Keep the access code to 100 characters or fewer.",
  "onlineDetails.accessInstructions": "Check the joining instructions.",
};
// Nest service errors are plain sentences; they are matched, never displayed.
const eventServiceRules: ServiceRule<EventFormField>[] = [
  [
    /categor/i,
    "categoryId",
    "This category is no longer available. Choose another.",
  ],
  [/require a venue/i, "venueId", "Choose a venue for this event."],
  [/venue/i, "venueId", "This venue is no longer available. Choose another."],
  [
    /tag/i,
    "tagIds",
    "One or more tags are no longer available. Remove them and try again.",
  ],
  [
    /online details/i,
    "onlineDetails.platform",
    "Add the online details for this event.",
  ],
  [/end time|after start/i, "endAt", "The event must end after it starts."],
  [/start/i, "startAt", "Check the start date and time."],
];

const venueFieldCopy: Record<VenueFormField, string> = {
  name: "Check the venue name. It needs between 1 and 200 characters.",
  addressLine1: "Check the street address.",
  addressLine2: "Keep the second address line to 255 characters or fewer.",
  city: "Check the city.",
  state: "Keep the state or region to 100 characters or fewer.",
  postalCode: "Check the postal code.",
  countryCode: "Use a two-letter country code, like DE.",
  latitude: "Latitude must be a number between -90 and 90.",
  longitude: "Longitude must be a number between -180 and 180.",
};

function mutationFeedback<Field extends string>(
  error: unknown,
  fieldCopy: Record<Field, string>,
  serviceRules: ServiceRule<Field>[],
  action: string,
  messageRules: MessageRule[] = [],
): MutationFeedback<Field> {
  const feedback = (message: string, fields = {}, sessionExpired = false) => ({
    message,
    fields,
    sessionExpired,
  });
  if (!axios.isAxiosError(error))
    return feedback(
      error instanceof Error && error.message === "API_NOT_CONFIGURED"
        ? "Saving is temporarily unavailable. Please try again later."
        : `We couldn’t ${action}. Please try again.`,
    );
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
    return feedback("The request took too long. Please try again.");
  if (!error.response)
    return feedback(
      "We couldn’t connect. Check your connection and try again.",
    );
  const { status } = error.response;
  if (status === 401)
    return feedback(
      "Your session has ended. Log in again to continue.",
      {},
      true,
    );
  if (status === 403)
    return feedback("You don’t have permission to make this change.");
  if (status === 429)
    return feedback(
      "Too many attempts. Please wait a moment before trying again.",
    );
  if (status >= 500)
    return feedback(
      "Our service is temporarily unavailable. Please try again in a moment.",
    );

  const data: unknown = error.response.data;
  const raw =
    typeof data === "object" && data !== null && "message" in data
      ? data.message
      : undefined;
  const messages = (Array.isArray(raw) ? raw : [raw]).filter(
    (message): message is string => typeof message === "string",
  );
  const fields: Partial<Record<Field, string>> = {};
  // Longest names first, so nested paths win over their parents.
  const names = (Object.keys(fieldCopy) as Field[]).sort(
    (a, b) => b.length - a.length,
  );
  let formMessage: string | undefined;
  for (const message of messages) {
    const field = Array.isArray(raw)
      ? names.find((name) =>
          new RegExp(`(^|\\s)${name.replace(".", "\\.")}('s)?(\\s|$)`).test(
            message,
          ),
        )
      : undefined;
    if (field) {
      fields[field] ??= fieldCopy[field];
      continue;
    }
    const rule = serviceRules.find(([pattern]) => pattern.test(message));
    if (rule) fields[rule[1]] ??= rule[2];
    else
      formMessage ??= messageRules.find(([pattern]) =>
        pattern.test(message),
      )?.[1];
  }
  if (Object.keys(fields).length)
    return feedback("Some details need another look.", fields);
  if (formMessage) return feedback(formMessage);
  return feedback(`We couldn’t ${action}. Check the details and try again.`);
}

export function eventMutationFeedback(error: unknown) {
  return mutationFeedback(
    error,
    eventFieldCopy,
    eventServiceRules,
    "save your event",
    // Edits can also be refused because the event left draft status.
    eventRules,
  );
}

export function venueMutationFeedback(error: unknown) {
  return mutationFeedback<VenueFormField>(
    error,
    venueFieldCopy,
    [],
    "add this venue",
  );
}

// Lifecycle and media rules verified against the Nest API's rejection messages.
const statusChanged =
  "This event’s status has changed, so that action isn’t available any more.";
const eventRules: MessageRule[] = [
  [/event not found/i, "This event is no longer available."],
  [
    /start time must be in the future/i,
    "Move the start time into the future in Edit event, then publish.",
  ],
  [
    /postponed after it starts/i,
    "This event has already started, so it can’t be postponed.",
  ],
  [
    /completed before it ends/i,
    "You can mark this event as completed once it has ended.",
  ],
  [/drafts? .*deleted, not cancelled/i, "Drafts are deleted, not cancelled."],
  [/only draft events can be edited/i, "Only drafts can be edited."],
  [/only .* events can be|status \w+ cannot be/i, statusChanged],
];

export type LifecycleFormField = "reason" | "startAt" | "endAt" | "timezone";

export function lifecycleMutationFeedback(error: unknown, action: string) {
  return mutationFeedback<LifecycleFormField>(
    error,
    {
      reason: "Add a reason of up to 500 characters.",
      startAt: "Check the start date and time.",
      endAt: "Check the end date and time.",
      timezone: "Choose a valid timezone.",
    },
    action === "reschedule"
      ? [
          [/start time/i, "startAt", "Choose a start time in the future."],
          [/end time/i, "endAt", "The event must end after it starts."],
        ]
      : [],
    action,
    eventRules,
  );
}

export type MediaFormField =
  | "storageKey"
  | "altText"
  | "mimeType"
  | "originalName"
  | "width"
  | "height"
  | "sizeBytes";

export function mediaMutationFeedback(error: unknown, action: string) {
  return mutationFeedback<MediaFormField>(
    error,
    {
      storageKey: "Check the storage key.",
      altText: "Keep the alt text to 255 characters or fewer.",
      mimeType: "Choose JPEG, PNG, WebP, AVIF or GIF.",
      originalName: "Keep the file name to 255 characters or fewer.",
      width: "Width must be a whole number above 0.",
      height: "Height must be a whole number above 0.",
      sizeBytes: "File size must be a whole number above 0.",
    },
    [],
    action,
    [
      [
        /already has a cover/i,
        "This event already has a cover image. Remove it before adding another.",
      ],
      [/media not found/i, "This image has already been removed."],
      [
        /do not belong/i,
        "The gallery changed while you were reordering. Try again.",
      ],
      ...eventRules,
    ],
  );
}
