import { expect, test, type Page, type Route } from "@playwright/test";
import type { OrganizerEvent } from "../../features/events/types/event.types";
import { mockReferences } from "./fixtures/events";
import {
  mockMyEvent,
  mockMyEvents,
  mockOrganizerReferences,
  organizerDetail,
  signIn,
} from "./fixtures/organizer";

test.use({ timezoneId: "Europe/Berlin" });

const slug = "organizer-event-0";
const endpoint = (path: string) =>
  new RegExp(`/backend/api/events/mine/${slug}${path}$`);
const reference = (event: OrganizerEvent) => ({
  id: event.id,
  slug: event.slug,
  status: event.status,
});

async function openManage(page: Page, event: () => OrganizerEvent) {
  await mockReferences(page);
  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  await mockMyEvent(page, event);
  await signIn(page);
  await page
    .getByRole("list", { name: "Your events" })
    .getByRole("link", { name: /^Manage Future of AI Conference 1,/ })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Future of AI Conference 1" }),
  ).toBeVisible();
}

const lifecycle = (page: Page) =>
  page.getByRole("region", { name: /./ }).filter({
    has: page.getByText("Event lifecycle", { exact: true }),
  });

test("manage opens from My events with URL tabs and private details kept to Details", async ({
  page,
}) => {
  await openManage(page, () => organizerDetail());
  await expect(page).toHaveURL(/\/dashboard\/events\/organizer-event-0$/);
  await expect(page.getByRole("link", { name: "Edit event" })).toHaveAttribute(
    "href",
    "/dashboard/events/organizer-event-0/edit",
  );
  await expect(
    page.getByRole("link", { name: /View public page/ }),
  ).toHaveCount(0);
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("300 people");
  await expect(panel).toContainText("Friday 20 November 2099 · 18:00 CET");
  await expect(page.getByText("AI2099")).toHaveCount(0);

  const overview = page.getByRole("tab", { name: "Overview" });
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Media" })).toBeFocused();
  await expect(page).toHaveURL(/\?tab=media$/);
  await expect(panel).toContainText("The first impression.");
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/\?tab=details$/);
  await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(panel).toContainText("AI2099");
  await expect(
    panel.getByRole("link", { name: /teams\.microsoft/ }),
  ).toHaveAttribute(
    "href",
    "https://teams.microsoft.com/l/meetup-join/example",
  );
  await expect(panel).toContainText("Only you can see these details.");
  await expect(panel).toContainText("Nürnberger Str. 1");
  await page.getByRole("tab", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/organizer-event-0$/);
});

test("publishing is confirmed, sent once, and updates the status in place", async ({
  page,
}) => {
  let current = organizerDetail();
  let requests = 0;
  let body: string | null = "unset";
  let release: () => void = () => {};
  await openManage(page, () => current);
  await page.route(endpoint("/publish"), async (route) => {
    requests++;
    body = route.request().postData();
    await new Promise<void>((resolve) => (release = resolve));
    current = { ...current, status: "PUBLISHED" };
    await route.fulfill({ json: reference(current) });
  });

  const panel = lifecycle(page);
  await expect(
    panel.getByRole("heading", { name: "Still a draft." }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Publish event" }).click();
  const dialog = page.getByRole("dialog", { name: "Publish this event?" });
  await expect(dialog).toContainText("Only drafts can be edited");
  await dialog.getByRole("button", { name: "Publish event" }).click();
  await expect(
    dialog.getByRole("button", { name: "Publishing…" }),
  ).toBeDisabled();
  await dialog.locator("form").dispatchEvent("submit");
  release();

  await expect(dialog).toHaveCount(0);
  await expect(
    panel.getByRole("heading", { name: "Live on EventFlow." }),
  ).toBeVisible();
  await expect(panel.getByRole("status")).toHaveText(
    "Your event is live on Explore.",
  );
  await expect(page.locator(".event-detail-badges")).toContainText("Published");
  await expect(
    page.getByRole("link", { name: /View public page/ }),
  ).toHaveAttribute("href", "/events/organizer-event-0");
  await expect(page.getByRole("link", { name: "Edit event" })).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Postpone event" }),
  ).toBeVisible();
  expect(requests).toBe(1);
  expect(body).toBeNull();
});

test("postponing requires a reason, then rescheduling publishes with new dates", async ({
  page,
}) => {
  let current = organizerDetail({ status: "PUBLISHED" });
  const bodies: Record<string, unknown>[] = [];
  await openManage(page, () => current);
  await page.route(endpoint("/postpone"), async (route: Route) => {
    bodies.push(route.request().postDataJSON());
    current = {
      ...current,
      status: "POSTPONED",
      postponedAt: "2026-09-16T09:36:14.871Z",
      postponementReason: "Venue unavailable",
    };
    await route.fulfill({ json: reference(current) });
  });
  await page.route(endpoint("/reschedule"), async (route: Route) => {
    bodies.push(route.request().postDataJSON());
    current = {
      ...current,
      status: "PUBLISHED",
      ...route.request().postDataJSON(),
    };
    await route.fulfill({ json: reference(current) });
  });

  const panel = lifecycle(page);
  await panel.getByRole("button", { name: "Postpone event" }).click();
  const postpone = page.getByRole("dialog", { name: "Postpone this event?" });
  await expect(postpone.getByLabel("Reason")).toBeFocused();
  await postpone.getByLabel("Reason").fill("   ");
  await postpone.getByRole("button", { name: "Postpone event" }).click();
  await expect(postpone.getByText("Add a short reason.")).toBeVisible();
  expect(bodies).toHaveLength(0);
  await postpone.getByLabel("Reason").fill("  Venue unavailable  ");
  await postpone.getByRole("button", { name: "Postpone event" }).click();
  await expect(postpone).toHaveCount(0);
  expect(bodies[0]).toEqual({ reason: "Venue unavailable" });
  await expect(panel.getByRole("heading", { name: "On hold." })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Postponed on Wednesday 16 September 2026",
  );

  await panel.getByRole("button", { name: "Reschedule event" }).click();
  const reschedule = page.getByRole("dialog", {
    name: "Reschedule this event.",
  });
  await expect(reschedule.getByLabel("Starts")).toHaveValue("2099-11-20T18:00");
  await expect(reschedule.getByLabel("Timezone")).toHaveValue("Europe/Berlin");
  await reschedule.getByLabel("Ends").fill("2099-12-05T17:00");
  await reschedule.getByLabel("Starts").fill("2099-12-05T18:00");
  const confirm = reschedule.getByRole("button", {
    name: "Reschedule event",
    exact: true,
  });
  await confirm.click();
  await expect(
    reschedule.getByText("The event must end after it starts."),
  ).toBeVisible();
  expect(bodies).toHaveLength(1);
  await reschedule.getByLabel("Ends").fill("2099-12-05T21:00");
  await confirm.click();
  await expect(reschedule).toHaveCount(0);
  expect(bodies[1]).toEqual({
    startAt: "2099-12-05T17:00:00.000Z",
    endAt: "2099-12-05T20:00:00.000Z",
    timezone: "Europe/Berlin",
  });
  await expect(panel.getByRole("status")).toHaveText(
    "New dates saved. Your event is live again.",
  );
  await expect(page.locator(".event-detail-heading-date")).toHaveText(
    "5 Dec 2099",
  );
});

test("cancelling is a confirmed, destructive action that closes the event", async ({
  page,
}) => {
  let current = organizerDetail({ status: "POSTPONED" });
  let body: unknown;
  await openManage(page, () => current);
  await page.route(endpoint("/cancel"), async (route) => {
    body = route.request().postDataJSON();
    current = {
      ...current,
      status: "CANCELLED",
      cancelledAt: "2026-09-16T09:36:15.038Z",
      cancellationReason: "No alternative venue",
    };
    await route.fulfill({ json: reference(current) });
  });

  const panel = lifecycle(page);
  const trigger = panel.getByRole("button", { name: "Cancel event" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Cancel this event?" });
  await dialog.getByRole("button", { name: "Keep event" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(body).toBeUndefined();

  await trigger.click();
  await dialog.getByLabel("Reason").fill("No alternative venue");
  await dialog.getByRole("button", { name: "Cancel event" }).click();
  await expect(dialog).toHaveCount(0);
  expect(body).toEqual({ reason: "No alternative venue" });
  await expect(
    panel.getByRole("heading", { name: "Cancelled." }),
  ).toBeVisible();
  await expect(panel).toContainText("No further lifecycle actions");
  await expect(panel.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("tabpanel")).toContainText(
    "No alternative venue",
  );
});

test("completion is offered only after the event ends and rejections are explained", async ({
  page,
}) => {
  const current = organizerDetail({
    status: "PUBLISHED",
    startAt: "2001-01-01T10:00:00.000Z",
    endAt: "2001-01-01T12:00:00.000Z",
  });
  await openManage(page, () => current);
  await page.route(endpoint("/complete"), (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Event cannot be completed before it ends" },
    }),
  );
  const panel = lifecycle(page);
  await expect(
    panel.getByRole("button", { name: "Postpone event" }),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: "Mark as completed" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Mark this event as completed?",
  });
  await dialog.getByRole("button", { name: "Mark as completed" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "You can mark this event as completed once it has ended.",
  );
  await expect(dialog.getByText(/cannot be completed/)).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Mark as completed" }),
  ).toBeEnabled();
});

test("deleting a draft confirms, deletes and returns to My events", async ({
  page,
}) => {
  let deleted = false;
  await openManage(page, () => organizerDetail());
  await page.route(endpoint(""), (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    deleted = true;
    return route.fulfill({ json: { message: "Event deleted successfully" } });
  });
  await lifecycle(page).getByRole("button", { name: "Delete draft" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this draft?" });
  await expect(dialog).toContainText(
    "This action will remove it from your active events.",
  );
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/events(?:\?|$)/);
  expect(deleted).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: /My events/ }),
  ).toBeVisible();
});

test("missing events and expired sessions show recoverable states", async ({
  page,
}) => {
  let status = 404;
  await mockReferences(page);
  await mockMyEvents(page);
  await page.route(endpoint(""), (route) =>
    route.fulfill({
      status,
      json: { message: status === 404 ? "Event not found" : "Unauthorized" },
    }),
  );
  await signIn(page);
  await page
    .getByRole("link", { name: /^Manage Future of AI Conference 1,/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "This event isn’t in your workspace." }),
  ).toBeVisible();
  status = 401;
  await page.getByRole("link", { name: "Back to my events" }).first().click();
  await page
    .getByRole("link", { name: /^Manage Future of AI Conference 1,/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your session has ended." }),
  ).toBeVisible();
});

test("media: add a cover, edit alt text, reorder and remove gallery images", async ({
  page,
}) => {
  const base = organizerDetail();
  let current: OrganizerEvent = {
    ...base,
    media: base.media.filter((media) => media.type === "GALLERY"),
  };
  const calls: { method: string; path: string; body: unknown }[] = [];
  let refuseCover = true;
  await openManage(page, () => current);
  await page.route(
    /\/backend\/api\/events\/mine\/organizer-event-0\/media(\/.*)?$/,
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace(
        /^.*\/media/,
        "/media",
      );
      const body = request.postData() ? request.postDataJSON() : undefined;
      calls.push({ method: request.method(), path, body });
      if (request.method() === "POST") {
        if (refuseCover) {
          refuseCover = false;
          return route.fulfill({
            status: 400,
            json: { message: "Event already has a cover image" },
          });
        }
        const media = {
          id: "7a4d2f3e-1c1f-4d7e-9a0b-0000000000c0",
          sortOrder: 0,
          width: null,
          height: null,
          originalName: null,
          sizeBytes: null,
          ...body,
        };
        current = { ...current, media: [...current.media, media] };
        return route.fulfill({ status: 201, json: media });
      }
      if (path === "/media/reorder") {
        const order = new Map<string, number>(
          body.items.map((item: { mediaId: string; sortOrder: number }) => [
            item.mediaId,
            item.sortOrder,
          ]),
        );
        current = {
          ...current,
          media: current.media.map((media) => ({
            ...media,
            sortOrder: order.get(media.id) ?? media.sortOrder,
          })),
        };
        return route.fulfill({ json: current.media });
      }
      const id = path.split("/").pop();
      if (request.method() === "DELETE") {
        current = {
          ...current,
          media: current.media.filter((media) => media.id !== id),
        };
        return route.fulfill({
          json: { message: "Event media metadata deleted successfully" },
        });
      }
      current = {
        ...current,
        media: current.media.map((media) =>
          media.id === id ? { ...media, ...body } : media,
        ),
      };
      return route.fulfill({
        json: current.media.find((media) => media.id === id),
      });
    },
  );

  await page.getByRole("tab", { name: "Media" }).click();
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("No cover image yet.");
  await panel.getByRole("button", { name: "Add cover image" }).click();
  const add = page.getByRole("dialog", { name: "Add a cover image." });
  await expect(add.getByLabel("Storage key")).toBeFocused();
  await add.getByRole("button", { name: "Add image" }).click();
  await expect(add.getByText("Enter the image’s storage key.")).toBeVisible();
  await expect(
    add.getByText("Describe the image for people who can’t see it."),
  ).toBeVisible();
  expect(calls).toHaveLength(0);
  await add
    .getByLabel("Storage key")
    .fill("https://cdn.example.com/cover.webp");
  await add.getByLabel("Storage key").blur();
  await expect(add.getByText(/without spaces or full URLs/)).toBeVisible();
  await add.getByLabel("Storage key").fill("/images/event-conference.webp");
  await expect(add.getByLabel("File type")).toHaveValue("image/webp");
  await add.getByLabel("Alt text").fill("  The main hall  ");
  await add.getByRole("button", { name: "Add image" }).click();
  await expect(add.getByRole("alert")).toContainText(
    "This event already has a cover image.",
  );
  await add.getByRole("button", { name: "Add image" }).click();
  await expect(add).toHaveCount(0);
  expect(calls[1]).toEqual({
    method: "POST",
    path: "/media",
    body: {
      type: "COVER",
      storageKey: "/images/event-conference.webp",
      mimeType: "image/webp",
      altText: "The main hall",
    },
  });
  await expect(
    panel.getByRole("article", { name: "Cover image" }),
  ).toContainText("The main hall");

  const gallery = panel.getByRole("list", { name: "Gallery images" });
  const second = gallery.getByRole("listitem").nth(1);
  await expect(second).toContainText("Alt text missing");
  await second.getByRole("button", { name: "Edit alt text" }).click();
  const alt = page.getByRole("dialog", { name: "Edit alt text." });
  await expect(
    alt.getByRole("button", { name: "Save alt text" }),
  ).toBeDisabled();
  await alt
    .getByLabel("Alt text", { exact: true })
    .fill("A dinner table with flowers");
  await alt.getByRole("button", { name: "Save alt text" }).click();
  await expect(alt).toHaveCount(0);
  expect(calls.at(-1)).toEqual({
    method: "PATCH",
    path: "/media/7a4d2f3e-1c1f-4d7e-9a0b-000000000003",
    body: { altText: "A dinner table with flowers" },
  });
  await expect(second).toContainText("A dinner table with flowers");

  await gallery
    .getByRole("button", { name: "Move image 1 of 3 later" })
    .click();
  await expect.poll(() => calls.at(-1)?.path).toBe("/media/reorder");
  expect(calls.at(-1)?.body).toEqual({
    items: [
      { mediaId: "7a4d2f3e-1c1f-4d7e-9a0b-000000000003", sortOrder: 0 },
      { mediaId: "7a4d2f3e-1c1f-4d7e-9a0b-000000000002", sortOrder: 1 },
      { mediaId: "7a4d2f3e-1c1f-4d7e-9a0b-000000000004", sortOrder: 2 },
    ],
  });
  await expect(gallery.getByRole("listitem").first()).toContainText(
    "A dinner table with flowers",
  );
  // The move is announced, then replaced once the new order is saved.
  await expect(page.getByText("Gallery order saved.")).toBeAttached();

  await gallery
    .getByRole("listitem")
    .last()
    .getByRole("button", { name: "Remove" })
    .click();
  const remove = page.getByRole("dialog", { name: "Remove this image?" });
  await remove
    .getByRole("button", { name: "Remove image", exact: true })
    .click();
  await expect(remove).toHaveCount(0);
  expect(calls.at(-1)).toEqual({
    method: "DELETE",
    path: "/media/7a4d2f3e-1c1f-4d7e-9a0b-000000000004",
    body: undefined,
  });
  await expect(gallery.getByRole("listitem")).toHaveCount(2);
});
