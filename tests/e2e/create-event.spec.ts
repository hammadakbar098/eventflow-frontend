import { expect, test, type Page, type Route } from "@playwright/test";
import { categories, mockReferences, tags } from "./fixtures/events";
import {
  mockMyEvents,
  mockOrganizerReferences,
  signIn,
  venues,
} from "./fixtures/organizer";

test.use({ timezoneId: "Europe/Berlin" });

async function openCreateEvent(
  page: Page,
  respond?: (route: Route) => Promise<void>,
) {
  await mockReferences(page);
  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  if (respond)
    await page.route(/\/backend\/api\/events(?:\?|$)/, (route) =>
      route.request().method() === "POST" ? respond(route) : route.fallback(),
    );
  await signIn(page);
  await page.getByRole("link", { name: "Create event" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Start with a spark." }),
  ).toBeVisible();
}

async function fillEssentials(page: Page) {
  await page.getByLabel("Event title").fill("  Future of AI Conference  ");
  await page.getByLabel("Category").selectOption(categories[0].id);
  await page
    .getByLabel("Description")
    .fill("A conference about AI.\n\nMeet the people shaping it.");
  await page.getByLabel("Starts").fill("2099-11-20T18:00");
  await page.getByLabel("Ends").fill("2099-11-20T21:00");
}

async function chooseFormat(
  page: Page,
  format: "In person" | "Online" | "Hybrid",
) {
  await page.getByRole("radio", { name: new RegExp(`^${format}`) }).check();
}

async function fillOnlineDetails(page: Page) {
  await page.getByLabel("Platform").fill(" Microsoft Teams ");
  await page.getByLabel("Access code (optional)").fill("AI2099");
  await page
    .getByLabel("Joining link")
    .fill("https://teams.microsoft.com/l/meetup-join/example");
  await page
    .getByLabel("Joining instructions (optional)")
    .fill("Join 10 minutes early.");
}

const created = (slug: string) => ({
  id: "b697a68f-dc04-4c01-8e58-de9e98c06d44",
  slug,
  status: "DRAFT",
  title: "Future of AI Conference",
  onlineDetails: { accessUrl: "https://private.example" },
  tags: [{ tag: tags[0] }],
});

test("validation reports every missing field without sending a request", async ({
  page,
}) => {
  let posts = 0;
  await openCreateEvent(page, async (route) => {
    posts++;
    await route.fulfill({ status: 201, json: created("never") });
  });
  await expect(page.getByLabel("Timezone")).toHaveValue("Europe/Berlin");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByLabel("Event title")).toBeFocused();
  for (const message of [
    "Give your event a title.",
    "Choose a category.",
    "Tell people what to expect.",
    "Choose when your event starts.",
    "Choose when your event ends.",
    "Choose a venue, or add a new one.",
  ])
    await expect(page.getByText(message)).toBeVisible();
  await expect(page.getByLabel("Event title")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Starts").fill("2099-11-20T18:00");
  await page.getByLabel("Ends").fill("2099-11-20T17:00");
  await page.getByLabel("Ends").blur();
  await expect(
    page.getByText("The event must end after it starts."),
  ).toBeVisible();
  await page.getByLabel("Starts").fill("2001-01-01T10:00");
  await page.getByLabel("Starts").blur();
  await expect(
    page.getByText("Choose a start time in the future."),
  ).toBeVisible();
  await page.getByLabel("Capacity (optional)").fill("0");
  await page.getByLabel("Capacity (optional)").blur();
  await expect(
    page.getByText("Capacity must be at least 1 person."),
  ).toBeVisible();

  await chooseFormat(page, "Online");
  await expect(page.getByText("Choose a venue, or add a new one.")).toHaveCount(
    0,
  );
  await page.getByLabel("Joining link").fill("teams");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(
    page.getByText("Add the platform people will join on."),
  ).toBeVisible();
  await expect(
    page.getByText("Enter a full link, starting with https://"),
  ).toBeVisible();
  expect(posts).toBe(0);
});

test("a physical event sends its venue, converted times and tags, then opens the returned slug", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  let authorization: string | undefined;
  let release: () => void = () => {};
  let posts = 0;
  await openCreateEvent(page, async (route) => {
    posts++;
    body = route.request().postDataJSON();
    authorization = route.request().headers().authorization;
    await new Promise<void>((resolve) => (release = resolve));
    await route.fulfill({ status: 201, json: created("future-of-ai-2") });
  });
  await fillEssentials(page);
  await page.getByLabel("Timezone").selectOption("America/New_York");
  await page.getByRole("button", { name: /Riverside Hall/ }).click();
  await expect(page.getByText("Selected venue").first()).toBeVisible();
  // Online details entered for another format never leave the browser.
  await chooseFormat(page, "Hybrid");
  await fillOnlineDetails(page);
  await chooseFormat(page, "In person");
  await expect(page.getByLabel("Platform")).toHaveCount(0);
  await page.getByLabel("Capacity (optional)").fill("300");
  await page.getByLabel(tags[0].name, { exact: true }).check();
  await page.getByLabel(tags[1].name, { exact: true }).check();

  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(
    page.getByRole("button", { name: "Creating your draft…" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Event title")).toBeDisabled();
  await page.locator("form.event-form").dispatchEvent("submit");
  release();
  await expect(page).toHaveURL(/\/dashboard\/events\/future-of-ai-2$/);
  expect(posts).toBe(1);
  expect(authorization).toBe("Bearer organizer-access-token");
  expect(body).toEqual({
    title: "Future of AI Conference",
    description: "A conference about AI.\n\nMeet the people shaping it.",
    format: "PHYSICAL",
    categoryId: categories[0].id,
    startAt: "2099-11-20T23:00:00.000Z",
    endAt: "2099-11-21T02:00:00.000Z",
    timezone: "America/New_York",
    capacity: 300,
    venueId: venues[0].id,
    tagIds: [tags[0].id, tags[1].id],
  });
});

test("switching hybrid to online drops the venue and empty optional access fields", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await openCreateEvent(page, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: created("online-event") });
  });
  await fillEssentials(page);
  await page.getByRole("button", { name: /Riverside Hall/ }).click();
  await chooseFormat(page, "Hybrid");
  await fillOnlineDetails(page);
  await page.getByLabel("Access code (optional)").fill("   ");
  await chooseFormat(page, "Online");
  await expect(page.getByRole("group", { name: /Venue/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/online-event$/);
  expect(body).toEqual({
    title: "Future of AI Conference",
    description: "A conference about AI.\n\nMeet the people shaping it.",
    format: "ONLINE",
    categoryId: categories[0].id,
    startAt: "2099-11-20T17:00:00.000Z",
    endAt: "2099-11-20T20:00:00.000Z",
    timezone: "Europe/Berlin",
    tagIds: [],
    onlineDetails: {
      platform: "Microsoft Teams",
      accessUrl: "https://teams.microsoft.com/l/meetup-join/example",
      accessInstructions: "Join 10 minutes early.",
    },
  });
});

test("a hybrid event sends both its venue and online details", async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await openCreateEvent(page, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: created("hybrid-event") });
  });
  await fillEssentials(page);
  await chooseFormat(page, "Hybrid");
  await page
    .getByRole("button", { name: /Eventflow Conference Center/ })
    .click();
  await fillOnlineDetails(page);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/hybrid-event$/);
  expect(body).toMatchObject({
    format: "HYBRID",
    venueId: venues[1].id,
    onlineDetails: {
      platform: "Microsoft Teams",
      accessCode: "AI2099",
      accessUrl: "https://teams.microsoft.com/l/meetup-join/example",
      accessInstructions: "Join 10 minutes early.",
    },
  });
});

test("a new venue is validated, created and selected without searching again", async ({
  page,
}) => {
  let venueBody: Record<string, unknown> | undefined;
  let eventBody: Record<string, unknown> | undefined;
  const newVenue = {
    id: "3f32c8ce-0a9f-436f-a159-10e2a3b096d9",
    name: "Eventflow Studio",
    addressLine1: "Lange Str. 20",
    addressLine2: null,
    city: "Bamberg",
    state: null,
    postalCode: "96047",
    countryCode: "DE",
    latitude: "49.8917",
    longitude: "10.8868",
    createdAt: "2026-09-16T08:35:13.727Z",
  };
  await openCreateEvent(page, async (route) => {
    eventBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: created("studio-night") });
  });
  await page.route(/\/backend\/api\/venues(?:\?|$)/, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    venueBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: newVenue });
  });
  await page
    .getByRole("searchbox", { name: "Search venues" })
    .fill("Eventflow Studio");
  await expect(page.getByText("No venues found.")).toBeVisible();
  const trigger = page.getByRole("button", { name: "Add a new venue" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Add a venue." });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Venue name")).toHaveValue("Eventflow Studio");
  await dialog.getByRole("button", { name: "Add venue", exact: true }).click();
  await expect(dialog.getByText("Enter the street address.")).toBeVisible();
  await expect(
    dialog.getByText("Use a two-letter country code, like DE."),
  ).toBeVisible();
  expect(venueBody).toBeUndefined();

  await dialog.getByLabel("Street address").fill(" Lange Str. 20 ");
  await dialog.getByLabel("City").fill("Bamberg");
  await dialog.getByLabel("Postal code").fill("96047");
  await dialog.getByLabel("Country code").fill("de");
  await expect(dialog.getByText("Germany")).toBeVisible();
  await dialog.getByLabel("Latitude (optional)").fill("91");
  await dialog.getByLabel("Longitude (optional)").fill("10.8868");
  await dialog.getByRole("button", { name: "Add venue", exact: true }).click();
  await expect(
    dialog.getByText("Latitude must be a number between -90 and 90."),
  ).toBeVisible();
  await dialog.getByLabel("Latitude (optional)").fill("49.8917");
  await dialog.getByRole("button", { name: "Add venue", exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveCount(0);
  await expect(
    page.getByText("Eventflow Studio", { exact: true }),
  ).toBeVisible();
  expect(venueBody).toEqual({
    name: "Eventflow Studio",
    addressLine1: "Lange Str. 20",
    city: "Bamberg",
    postalCode: "96047",
    countryCode: "DE",
    latitude: 49.8917,
    longitude: 10.8868,
  });
  await fillEssentials(page);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\/studio-night$/);
  expect(eventBody?.venueId).toBe(newVenue.id);
});

test("the venue dialog is keyboard accessible and restores focus", async ({
  page,
}) => {
  await openCreateEvent(page);
  const trigger = page.getByRole("button", { name: "Add a new venue" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Add a venue." });
  await expect(dialog.getByLabel("Venue name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Close add venue" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Add venue", exact: true }),
  ).toBeFocused();
  // Enter inside the dialog submits only the venue form.
  await dialog.getByLabel("Venue name").press("Enter");
  await expect(dialog.getByText("Enter the city.")).toBeVisible();
  await expect(page.getByText("Give your event a title.")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("API errors map to fields and sessions that ended keep the form", async ({
  page,
}) => {
  const responses = [
    {
      status: 400,
      json: {
        statusCode: 400,
        message: [
          "title must be shorter than or equal to 200 characters",
          "onlineDetails.accessUrl must be a URL address",
        ],
        error: "Bad Request",
      },
    },
    { status: 404, json: { statusCode: 404, message: "Venue not found" } },
    { status: 500, json: { message: "PrismaClientKnownRequestError P2003" } },
    { status: 401, json: { statusCode: 401, message: "Unauthorized" } },
  ];
  await openCreateEvent(page, async (route) => {
    await route.fulfill(responses.shift()!);
  });
  await fillEssentials(page);
  await chooseFormat(page, "Hybrid");
  await page.getByRole("button", { name: /Riverside Hall/ }).click();
  await fillOnlineDetails(page);
  const submit = page.getByRole("button", { name: "Create draft" });

  await submit.click();
  await expect(page.getByLabel("Event title")).toBeFocused();
  await expect(
    page.getByText("Check the title. It needs between 1 and 200 characters."),
  ).toBeVisible();
  await expect(
    page.getByText("Enter a full link, starting with https://"),
  ).toBeVisible();
  await expect(page.getByText(/must be a URL address/)).toHaveCount(0);

  await submit.click();
  await expect(
    page.getByText("This venue is no longer available. Choose another."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change venue" }).click();
  await page
    .getByRole("button", { name: /Eventflow Conference Center/ })
    .click();

  await submit.click();
  await expect(
    page.getByText(
      "Our service is temporarily unavailable. Please try again in a moment.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/Prisma/)).toHaveCount(0);

  await submit.click();
  await expect(
    page.getByText("Your session has ended. Log in again to continue."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Log in again" }),
  ).toHaveAttribute("href", "/login");
  await expect(page.getByLabel("Event title")).toHaveValue(
    "  Future of AI Conference  ",
  );
  await expect(submit).toBeEnabled();
});
