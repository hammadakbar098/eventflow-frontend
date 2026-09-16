import { expect, test, type Page } from "@playwright/test";
import { mockReferences } from "./fixtures/events";
import {
  mockMyEvents,
  mockOrganizerReferences,
  signIn,
} from "./fixtures/organizer";

async function expectWithinViewport(
  page: Page,
  selector: string,
  width: number,
) {
  for (const element of await page.locator(selector).all()) {
    if (!(await element.isVisible())) continue;
    const bounds = await element.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 0.5);
  }
}

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const width of [320, 375, 430, 768, 1024, 1280, 1440]) {
  test(`organizer pages fit ${width}px without runtime errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await mockReferences(page);
    await mockOrganizerReferences(page);
    await mockMyEvents(page);
    await signIn(page);

    const rows = page
      .getByRole("list", { name: "Your events", exact: true })
      .getByRole("link");
    await expect(rows).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expectWithinViewport(page, ".my-event-row", width);
    for (const row of await rows.all()) {
      const manage = row.locator(".my-event-row-manage");
      expect((await manage.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // The status row scrolls on its own instead of widening the page.
    const completed = page.getByRole("button", {
      name: "Completed",
      exact: true,
    });
    await completed.click();
    await expect(completed).toHaveAttribute("aria-pressed", "true");
    await expect(completed).toBeInViewport();
    expect(await noHorizontalOverflow(page)).toBe(true);
    const create = page.getByRole("link", { name: "Create event" }).first();
    await expect(create).toBeVisible();

    await create.click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Start with a spark." }),
    ).toBeVisible();
    await page.getByRole("radio", { name: /^Hybrid/ }).check();
    await expect(page.getByLabel("Joining link")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expectWithinViewport(
      page,
      ".event-form input:not([type=checkbox]):not([type=radio]), .event-form select, .event-form textarea, .event-format-option, .event-venue-option",
      width,
    );
    await page.getByRole("button", { name: "Add a new venue" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a venue." });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.height).toBeLessThanOrEqual(900);
    await dialog
      .getByRole("button", { name: "Add venue", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole("button", { name: "Add venue", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("reduced motion keeps organizer content and conditional sections usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockReferences(page);
  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  await signIn(page);
  await expect(
    page.getByRole("list", { name: "Your events" }).getByRole("link"),
  ).toHaveCount(4);
  await page.getByRole("button", { name: "Draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Draft events" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create event" }).first().click();
  await page.getByRole("radio", { name: /^Online/ }).check();
  await expect(page.getByLabel("Platform")).toBeVisible();
  await expect(page.getByRole("group", { name: /Venue/ })).toHaveCount(0);
  await page.getByRole("radio", { name: /^In person/ }).check();
  await expect(
    page.getByRole("searchbox", { name: "Search venues" }),
  ).toBeVisible();
  await expect(page.getByLabel("Platform")).toHaveCount(0);
});
