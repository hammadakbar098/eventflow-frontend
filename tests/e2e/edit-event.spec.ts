import { expect, test, type Page } from "@playwright/test";
import type { OrganizerEvent } from "../../features/events/types/event.types";
import { categories, mockReferences, tags } from "./fixtures/events";
import {
  mockMyEvent,
  mockMyEvents,
  mockOrganizerReferences,
  organizerDetail,
  signIn,
  venues,
} from "./fixtures/organizer";

test.use({ timezoneId: "Europe/Berlin" });

const detailEndpoint = /\/backend\/api\/events\/mine\/organizer-event-0$/;

async function openEdit(page: Page, event: () => OrganizerEvent) {
  await mockReferences(page);
  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  await mockMyEvent(page, event);
  await signIn(page);
  await page
    .getByRole("link", { name: /^Manage Future of AI Conference 1,/ })
    .click();
  await page.getByRole("link", { name: "Edit event" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Refine the details." }),
  ).toBeVisible();
}

function capturePatches(
  page: Page,
  apply: (body: Record<string, unknown>) => void,
) {
  const bodies: Record<string, unknown>[] = [];
  return page
    .route(detailEndpoint, async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const body = route.request().postDataJSON();
      bodies.push(body);
      apply(body);
      await route.fulfill({
        json: { id: "event", slug: "organizer-event-0", status: "DRAFT" },
      });
    })
    .then(() => bodies);
}

test("edit reuses the event form, prefilled, and saves only what changed", async ({
  page,
}) => {
  let current = organizerDetail();
  const bodies = await capturePatches(page, (body) => {
    current = {
      ...current,
      title: String(body.title),
      capacity: null,
      format: "ONLINE",
      venue: null,
    };
  });
  await openEdit(page, () => current);

  await expect(page.getByLabel("Event title")).toHaveValue(
    "Future of AI Conference 1",
  );
  await expect(page.getByLabel("Category")).toHaveValue(categories[0].id);
  await expect(page.getByLabel("Description")).toHaveValue(
    /A conversation about ideas/,
  );
  await expect(page.getByLabel("Starts")).toHaveValue("2099-11-20T18:00");
  await expect(page.getByLabel("Ends")).toHaveValue("2099-11-20T21:00");
  await expect(page.getByLabel("Timezone")).toHaveValue("Europe/Berlin");
  await expect(page.getByRole("radio", { name: /^Hybrid/ })).toBeChecked();
  await expect(page.locator(".event-venue-selected")).toContainText(
    venues[0].name,
  );
  await expect(page.getByLabel("Platform")).toHaveValue("Microsoft Teams");
  await expect(page.getByLabel("Access code (optional)")).toHaveValue("AI2099");
  await expect(page.getByLabel("Capacity (optional)")).toHaveValue("300");
  for (const tag of tags)
    await expect(page.getByLabel(tag.name, { exact: true })).toBeChecked();

  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await expect(page.getByText("No changes to save yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute(
    "href",
    "/dashboard/events/organizer-event-0",
  );

  await page.getByLabel("Event title").fill("Future of AI Conference 2");
  await expect(save).toBeEnabled();
  await page.getByLabel("Capacity (optional)").fill("");
  await page.getByRole("radio", { name: /^Online/ }).check();
  await save.click();

  await expect(page).toHaveURL(/\/dashboard\/events\/organizer-event-0$/);
  expect(bodies).toEqual([
    {
      title: "Future of AI Conference 2",
      capacity: null,
      format: "ONLINE",
      venueId: null,
    },
  ]);
  await expect(
    page.getByRole("heading", { level: 1, name: "Future of AI Conference 2" }),
  ).toBeVisible();
});

test("online to in-person requires a venue and removes online access", async ({
  page,
}) => {
  let current = organizerDetail({ format: "ONLINE", venue: null });
  const bodies = await capturePatches(page, () => {
    current = {
      ...current,
      format: "PHYSICAL",
      venue: venues[1],
      onlineDetails: null,
    };
  });
  await openEdit(page, () => current);
  await page.getByRole("radio", { name: /^In person/ }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Choose a venue, or add a new one."),
  ).toBeVisible();
  expect(bodies).toHaveLength(0);
  await page
    .getByRole("button", { name: /Eventflow Conference Center/ })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/organizer-event-0$/);
  expect(bodies).toEqual([
    { format: "PHYSICAL", venueId: venues[1].id, onlineDetails: null },
  ]);
});

test("server rejections keep the form, and published events can't be edited", async ({
  page,
}) => {
  let current = organizerDetail();
  await openEdit(page, () => current);
  await page.route(detailEndpoint, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 400,
          json: { message: "Only draft events can be edited" },
        })
      : route.fallback(),
  );
  await page.route(/\/organizer-event-0\/publish$/, (route) => {
    current = { ...current, status: "PUBLISHED" };
    return route.fulfill({
      json: { id: current.id, slug: current.slug, status: current.status },
    });
  });
  await page.getByLabel("Event title").fill("Late change");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Only drafts can be edited." }),
  ).toBeVisible();
  await expect(page.getByLabel("Event title")).toHaveValue("Late change");

  await page.goBack();
  await page.getByRole("button", { name: "Publish event" }).click();
  await page
    .getByRole("dialog", { name: "Publish this event?" })
    .getByRole("button", { name: "Publish event", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "Edit event" })).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/organizer-event-0\/edit$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This event can’t be edited.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Event title")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Manage event/ }),
  ).toHaveAttribute("href", "/dashboard/events/organizer-event-0");
});
