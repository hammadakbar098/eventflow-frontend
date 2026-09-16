import { expect, test } from "@playwright/test";
import { detail, mockEvents } from "./fixtures/events";

test("physical event loads from a skeleton, shows its cover and omits online information", async ({
  page,
}) => {
  let releaseDetail: (() => void) | undefined;
  await page.route("**/backend/api/events/future-of-ai", async (route) => {
    await new Promise<void>((resolve) => {
      releaseDetail = resolve;
    });
    await route.fulfill({
      json: {
        ...detail,
        format: "PHYSICAL",
        status: "SOLD_OUT",
        media: [
          {
            id: "cover",
            type: "COVER",
            storageKey: "/images/event-conference.jpg",
            altText: "The event venue",
            sortOrder: 0,
          },
        ],
      },
    });
  });
  await page.goto("/events/future-of-ai");
  await expect(
    page.getByRole("status", { name: "Loading event details" }),
  ).toBeVisible();
  await expect.poll(() => !!releaseDetail).toBe(true);
  releaseDetail!();
  await expect(
    page.getByRole("heading", { level: 1, name: detail.title }),
  ).toBeVisible();
  const cover = page.getByRole("img", { name: "The event venue", exact: true });
  await expect(cover).toBeVisible();
  await expect
    .poll(() =>
      cover.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.getByRole("main")).toContainText("Riverside Hall");
  await expect(page.getByRole("main")).toContainText("This event is sold out.");
  await expect(page.getByText(/Microsoft Teams/)).toHaveCount(0);
});

test("event detail renders public information in the event timezone and hides private fields", async ({
  page,
}) => {
  await page.route("**/backend/api/events/future-of-ai", (route) =>
    route.fulfill({
      json: {
        ...detail,
        onlineDetails: {
          platform: "Microsoft Teams",
          accessUrl: "https://private.invalid/meeting",
          accessCode: "DO-NOT-DISPLAY-7342",
          accessInstructions: "Secret private details.",
        },
      },
    }),
  );
  await page.goto("/events/future-of-ai");
  await expect(
    page.getByRole("heading", { level: 1, name: detail.title }),
  ).toBeVisible();
  const main = page.getByRole("main");
  await expect(main).toContainText("20 November 2026");
  await expect(main).toContainText("18:00");
  await expect(main).toContainText("Europe/Berlin");
  await expect(main).toContainText("Riverside Hall");
  await expect(main).toContainText("Nürnberger Str. 1");
  await expect(main).toContainText("Microsoft Teams");
  await expect(main).toContainText("Alex Morgan");
  await expect(main).toContainText("300");
  await expect(main).toContainText("Networking");
  await expect(
    page.getByText(/DO-NOT-DISPLAY|Secret private|private\.invalid/),
  ).toHaveCount(0);
  expect(await page.locator("a[href*='private.invalid']").count()).toBe(0);
  await expect(page.getByRole("heading", { name: /gallery/i })).toHaveCount(0);
});

test("online events omit venue and absent organizer, safely render description, and sort gallery", async ({
  page,
}) => {
  await page.route("**/backend/api/events/online-conversation", (route) =>
    route.fulfill({
      json: {
        ...detail,
        slug: "online-conversation",
        title: "An Online Conversation",
        format: "ONLINE",
        venue: null,
        organizer: null,
        capacity: null,
        description: "<strong>Ideas belong to everyone.</strong>",
        media: [
          {
            id: "later",
            type: "GALLERY",
            storageKey: "/images/event-dinner.jpg",
            altText: "Second gallery view",
            sortOrder: 2,
            width: 1000,
            height: 667,
          },
          {
            id: "earlier",
            type: "GALLERY",
            storageKey: "/images/event-art.jpg",
            altText: "First gallery view",
            sortOrder: 1,
            width: 1000,
            height: 667,
          },
        ],
      },
    }),
  );
  await page.goto("/events/online-conversation");
  await expect(
    page.getByRole("heading", { level: 1, name: "An Online Conversation" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "<strong>Ideas belong to everyone.</strong>",
  );
  await expect(page.getByText("Riverside Hall")).toHaveCount(0);
  await expect(page.getByText("Alex Morgan")).toHaveCount(0);
  const galleryImages = page.getByRole("img", { name: /gallery view/ });
  await expect(galleryImages).toHaveCount(2);
  await expect(galleryImages.nth(0)).toHaveAttribute(
    "alt",
    "First gallery view",
  );
  await expect(galleryImages.nth(1)).toHaveAttribute(
    "alt",
    "Second gallery view",
  );
});

test("unknown events show a dedicated not-found state and link to discovery", async ({
  page,
}) => {
  await mockEvents(page);
  await page.route("**/backend/api/events/missing", (route) =>
    route.fulfill({ status: 404, json: { message: "Event not found" } }),
  );
  await page.goto("/events/missing");
  await expect(
    page.getByRole("heading", { name: "This moment has moved." }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Explore events", exact: true })
    .click();
  await expect(page).toHaveURL(/\/events(?:\?|$)/);
});

test("server errors provide safe retry feedback", async ({ page }) => {
  let recovered = false;
  await page.route("**/backend/api/events/future-of-ai", (route) =>
    recovered
      ? route.fulfill({ json: detail })
      : route.fulfill({
          status: 500,
          json: { message: "SQL private internal details" },
        }),
  );
  await page.goto("/events/future-of-ai");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Please try again",
  );
  await expect(page.getByText("SQL private internal details")).toHaveCount(0);
  recovered = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: detail.title }),
  ).toBeVisible();
});
