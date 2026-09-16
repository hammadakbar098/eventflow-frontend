import { expect, test } from "@playwright/test";
import { detail, listing, mockEvents, summary } from "./fixtures/events";

for (const width of [320, 375, 430, 768, 1024, 1280, 1440]) {
  test(`event pages and filters fit ${width}px without runtime errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await mockEvents(page, (route) =>
      route.fulfill({
        json: listing(1, {
          data: Array.from({ length: 6 }, (_, index) => ({
            ...summary,
            id: `event-${index}`,
            title: `${summary.title} ${index + 1}`,
          })),
        }),
      }),
    );
    await page.goto("/events");
    await expect(
      page.getByRole("list", { name: "Events", exact: true }).getByRole("link"),
    ).toHaveCount(6);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const cards = await page
      .getByRole("list", { name: "Events", exact: true })
      .getByRole("link")
      .all();
    for (const card of cards) {
      const bounds = await card.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const refinements =
      width < 768
        ? page.getByRole("dialog")
        : page.locator(".explore-refinements-panel");
    await expect(refinements).toBeVisible();
    for (const control of await refinements
      .locator("input:not([type=checkbox]), select")
      .all()) {
      const bounds = await control.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    if (width < 768) await page.keyboard.press("Escape");
    await page.goto("/events/future-of-ai");
    await expect(
      page.getByRole("heading", { level: 1, name: detail.title }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("complementary", { name: "Event essentials" }),
    ).toContainText("Europe/Berlin");
    expect(errors).toEqual([]);
  });
}

test("reduced motion keeps event content and filters usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockEvents(page);
  await page.goto("/events");
  await page.getByRole("link", { name: `View ${detail.title}` }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: detail.title }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.getByRole("link", { name: "Back to events", exact: true }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByLabel("City", { exact: true })).toBeVisible();
});
