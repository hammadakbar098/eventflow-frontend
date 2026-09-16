import { expect, test, type Locator } from "@playwright/test";
import { mockEvents } from "./fixtures/events";
import {
  mockMyEvent,
  mockMyEvents,
  mockOrganizerReferences,
  organizerDetail,
  signIn,
} from "./fixtures/organizer";

// Explore's filter controls define the EventFlow focus treatment.
async function focusStyle(control: Locator) {
  await control.focus();
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
    };
  });
}

test("form controls share the Explore focus treatment", async ({ page }) => {
  await mockEvents(page);
  await page.goto("/events");
  const reference = await focusStyle(
    page.getByLabel("Format", { exact: true }),
  );
  expect(reference).toEqual({
    focusVisible: true,
    outline: "solid 3px rgb(25, 28, 26)",
    outlineOffset: "5px",
    boxShadow: "none",
  });
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  expect(await focusStyle(page.getByLabel("City", { exact: true }))).toEqual(
    reference,
  );

  await page.goto("/signup");
  for (const label of ["First name", "Email address"])
    expect(await focusStyle(page.getByLabel(label))).toEqual(reference);

  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  await signIn(page);
  await page.getByRole("link", { name: "Create event" }).first().click();
  await page.getByRole("radio", { name: /^Hybrid/ }).check();
  for (const control of [
    page.getByLabel("Event title"),
    page.getByLabel("Category"),
    page.getByLabel("Description"),
    page.getByLabel("Starts"),
    page.getByLabel("Timezone"),
    page.getByRole("searchbox", { name: "Search venues" }),
    page.getByLabel("Platform"),
    page.getByLabel("Joining link"),
    page.getByLabel("Joining instructions (optional)"),
    page.getByLabel("Capacity (optional)"),
    page.getByRole("searchbox", { name: "Search tags" }),
  ])
    expect(await focusStyle(control)).toEqual(reference);

  await page.getByRole("button", { name: "Add a new venue" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a venue." });
  for (const label of ["Venue name", "Country code", "Latitude (optional)"])
    expect(await focusStyle(dialog.getByLabel(label))).toEqual(reference);
});

test("manage event dialogs use the same focus treatment", async ({ page }) => {
  await mockEvents(page);
  await page.goto("/events");
  const reference = await focusStyle(
    page.getByLabel("Format", { exact: true }),
  );
  await mockOrganizerReferences(page);
  await mockMyEvents(page);
  await mockMyEvent(page, () => organizerDetail({ status: "POSTPONED" }));
  await signIn(page);
  await page
    .getByRole("link", { name: /^Manage Future of AI Conference 1,/ })
    .click();
  await page.getByRole("button", { name: "Reschedule event" }).click();
  const reschedule = page.getByRole("dialog", {
    name: "Reschedule this event.",
  });
  for (const label of ["Starts", "Ends", "Timezone"])
    expect(await focusStyle(reschedule.getByLabel(label))).toEqual(reference);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cancel event" }).click();
  expect(
    await focusStyle(
      page
        .getByRole("dialog", { name: "Cancel this event?" })
        .getByLabel("Reason"),
    ),
  ).toEqual(reference);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Media" }).click();
  await page.getByRole("button", { name: "Add image" }).click();
  const media = page.getByRole("dialog", { name: "Add a gallery image." });
  for (const label of ["Storage key", "File type"])
    expect(await focusStyle(media.getByLabel(label, { exact: true }))).toEqual(
      reference,
    );
});
