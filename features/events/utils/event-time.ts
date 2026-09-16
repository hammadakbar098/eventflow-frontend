// Organizers pick wall-clock times in the event's own timezone; the API stores
// instants. These helpers convert between the two without a date library.
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isValidTimeZone(timeZone: string) {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(timeZone) ? timeZone : "UTC";
}

export function timeZoneOptions(selected?: string) {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  const all = new Set(["UTC", ...zones]);
  if (selected && isValidTimeZone(selected)) all.add(selected);
  return [...all].sort((a, b) => a.localeCompare(b));
}

function wallClockParts(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

function asUtcInstant(local: string) {
  const match = LOCAL_DATE_TIME.exec(local);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const instant = Date.UTC(year, month - 1, day, hour, minute);
  // Reject values Date would silently roll over, such as 31 February.
  return new Date(instant).toISOString().slice(0, 16) === local
    ? instant
    : null;
}

/** Returns the UTC ISO instant, or null for invalid or skipped (DST) times. */
export function zonedDateTimeToIso(local: string, timeZone: string) {
  const wall = asUtcInstant(local);
  if (wall === null || !isValidTimeZone(timeZone)) return null;
  // Two passes settle the offset on either side of a daylight-saving change.
  let instant = wall;
  for (let pass = 0; pass < 2; pass++) {
    const offset =
      (asUtcInstant(wallClockParts(instant, timeZone)) ?? wall) - instant;
    instant = wall - offset;
  }
  return wallClockParts(instant, timeZone) === local
    ? new Date(instant).toISOString()
    : null;
}

/** Formats an ISO instant as a datetime-local value in the event timezone. */
export function isoToZonedDateTime(iso: string, timeZone: string) {
  const instant = new Date(iso).getTime();
  if (!Number.isFinite(instant) || !isValidTimeZone(timeZone)) return "";
  return wallClockParts(instant, timeZone);
}
