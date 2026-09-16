import { expect, test } from "@playwright/test";
import { mockEvents } from "./fixtures/events";

test("desktop navigation reaches each landing section and both auth pages", async ({
  page,
}) => {
  await mockEvents(page);
  await page.goto("/");
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });

  for (const [name, section] of [
    ["Features", "features"],
    ["How it works", "how-it-works"],
  ] as const) {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${section}$`));
    await expect(
      page.locator(`#${section}`).getByRole("heading", { level: 2 }),
    ).toBeInViewport();
  }

  await navigation.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/events(?:\?|$)/);

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Log in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Get started", exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("event categories show only matching inspiration and announce the result count", async ({
  page,
}) => {
  await page.goto("/#explore");
  const showcase = page.locator("#explore");
  await expect(showcase.getByRole("article")).toHaveCount(3);

  for (const [category, title] of [
    ["Food & drink", "A seat at the table."],
    ["Arts & culture", "A different point of view."],
    ["Talks & ideas", "Ideas that bring us together."],
  ] as const) {
    const filter = showcase.getByRole("button", {
      name: category,
      exact: true,
    });
    await filter.click();
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(showcase.getByRole("article")).toHaveCount(1);
    await expect(
      showcase.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(showcase.getByRole("status")).toHaveText(
      "1 inspiration idea shown",
    );
  }

  await showcase
    .getByRole("button", { name: "All experiences", exact: true })
    .click();
  await expect(showcase.getByRole("article")).toHaveCount(3);
  await expect(showcase.getByRole("status")).toHaveText(
    "3 inspiration ideas shown",
  );
});

test("event preview supports keyboard focus, Escape, and focus restoration", async ({
  page,
}) => {
  await page.goto("/#explore");
  const trigger = page.getByRole("button", {
    name: "Explore A seat at the table.",
    exact: true,
  });
  const originalOverflow = await page.evaluate(
    () => document.body.style.overflow,
  );
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "A seat at the table.",
    exact: true,
  });
  const close = dialog.getByRole("button", { name: "Close event preview" });

  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("hidden");
  await expect(
    dialog.getByText(
      "An idea to inspire your own event, with no tickets or scheduled date.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Bring your idea to life" }),
  ).toHaveAttribute("href", "/signup");
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("link", { name: "Bring your idea to life" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  // Native dialog close/focus happens before React's effect cleanup completes.
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe(originalOverflow);

  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe(originalOverflow);
});

test("mobile menu closes with Escape and navigates to sections and auth", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockEvents(page);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
    exact: true,
  });
  await expect(navigation).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Features", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigation).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await navigation.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/events(?:\?|$)/);
  await expect(navigation).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await trigger.click();
  await navigation.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await trigger.click();
  await navigation
    .getByRole("link", { name: "Get started", exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
});
