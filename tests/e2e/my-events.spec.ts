import { expect, test } from "@playwright/test";
import { mockReferences } from "./fixtures/events";
import {
  mockMyEvents,
  organizerEvent,
  organizerListing,
  signIn,
} from "./fixtures/organizer";

const empty = {
  data: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
};

test("the workspace requires a session and never requests private data without one", async ({
  page,
}) => {
  let requests = 0;
  await mockMyEvents(page, (route) => {
    requests++;
    return route.fulfill({ json: organizerListing() });
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard\/events$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Log in to continue." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Log in", exact: true }).last(),
  ).toHaveAttribute("href", "/login");
  await page.goto("/dashboard/events/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Log in to continue." }),
  ).toBeVisible();
  await expect(page.getByLabel("Event title")).toHaveCount(0);
  expect(requests).toBe(0);
});

test("organizers see their events with status, format and a manage link", async ({
  page,
}) => {
  const authorizations: (string | undefined)[] = [];
  await mockReferences(page);
  await mockMyEvents(page, (route) => {
    authorizations.push(route.request().headers().authorization);
    return route.fulfill({ json: organizerListing() });
  });
  await signIn(page);
  const list = page.getByRole("list", { name: "Your events", exact: true });
  await expect(list.getByRole("link")).toHaveCount(4);
  const draft = list.getByRole("link", {
    name: `Manage ${organizerEvent(0).title}, Draft`,
  });
  await expect(draft).toHaveAttribute(
    "href",
    "/dashboard/events/organizer-event-0",
  );
  await expect(draft).toContainText("Hybrid");
  await expect(draft).toContainText("Bamberg, Germany + online");
  await expect(list.getByRole("link", { name: /, Published$/ })).toContainText(
    "In person",
  );
  await expect(list.getByRole("link", { name: /, Scheduled$/ })).toContainText(
    "Online event",
  );
  await expect(page.getByText("14 events in your workspace")).toBeVisible();
  expect(authorizations[0]).toBe("Bearer organizer-access-token");
  await expect(
    page.getByRole("link", { name: "Create event" }).first(),
  ).toHaveAttribute("href", "/dashboard/events/new");
  // Browsing public pages keeps the workspace one click away.
  await page
    .getByRole("link", { name: "Explore", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/events/);
  await page.getByRole("link", { name: "My events", exact: true }).click();
  await expect(list.getByRole("link")).toHaveCount(4);
});

test("status, format and search filters update the URL, reset pages and clear together", async ({
  page,
}) => {
  const requests: URLSearchParams[] = [];
  await mockReferences(page);
  await mockMyEvents(page, (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    return route.fulfill({
      json: organizerListing(Number(params.get("page") ?? 1)),
    });
  });
  await signIn(page);
  const last = () => requests[requests.length - 1];
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => last().get("page")).toBe("2");

  await page
    .getByRole("group", { name: "Filter by status" })
    .getByRole("button", { name: "Published", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Published", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect.poll(() => last().get("status")).toBe("PUBLISHED");
  expect(last().get("page")).toBe("1");
  await expect(
    page.getByRole("heading", { name: "Published events" }),
  ).toBeVisible();

  await page.getByLabel("Format", { exact: true }).selectOption("HYBRID");
  await expect.poll(() => last().get("format")).toBe("HYBRID");

  await page.getByRole("button", { name: "Next page" }).click();
  await expect.poll(() => last().get("page")).toBe("2");
  const before = requests.length;
  await page
    .getByRole("searchbox", { name: "Search your events" })
    .pressSequentially("confer");
  await page.waitForTimeout(150);
  expect(requests.length).toBe(before);
  await expect.poll(() => last().get("search")).toBe("confer");
  expect(last().get("page")).toBe("1");
  expect(Object.fromEntries(last())).toEqual({
    page: "1",
    limit: "12",
    search: "confer",
    status: "PUBLISHED",
    format: "HYBRID",
  });

  // Back restores the previous filters; cached pages need no new request.
  await page.goBack();
  await expect(page).not.toHaveURL(/search=/);
  await expect(
    page.getByRole("searchbox", { name: "Search your events" }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\/events\?page=1&limit=12$/);
  await expect(
    page.getByRole("button", { name: "All events", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("first-time and filtered empty states offer different next steps", async ({
  page,
}) => {
  await mockReferences(page);
  await mockMyEvents(page, (route) => route.fulfill({ json: empty }));
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "You haven’t created any events yet." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your first event" }),
  ).toHaveAttribute("href", "/dashboard/events/new");
  await page.getByRole("button", { name: "Cancelled", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No events match your filters." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your first event" }),
  ).toHaveCount(0);
  await page
    .getByRole("region", { name: "Cancelled events" })
    .getByRole("button", { name: "Clear filters" })
    .click();
  await expect(
    page.getByRole("heading", { name: "You haven’t created any events yet." }),
  ).toBeVisible();
});

test("loading, safe errors, retry and expired sessions have usable states", async ({
  page,
}) => {
  let release: () => void = () => {};
  let mode: "slow" | "error" | "ok" | "expired" = "slow";
  let failures = 0;
  await mockReferences(page);
  await mockMyEvents(page, async (route) => {
    if (mode === "slow") {
      await new Promise<void>((resolve) => (release = resolve));
      mode = "error";
    }
    if (mode === "error") {
      failures++;
      return route.fulfill({
        status: 500,
        json: { message: "SQLSTATE 42P01 relation does not exist" },
      });
    }
    if (mode === "expired")
      return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
    return route.fulfill({ json: organizerListing() });
  });
  await signIn(page);
  await expect(
    page.getByRole("status", { name: "Loading your events" }),
  ).toBeVisible();
  release();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your events are taking a moment." }),
  ).toBeVisible();
  await expect(page.getByText(/SQLSTATE/)).toHaveCount(0);
  // Server errors retry once before the error state appears.
  expect(failures).toBe(2);
  mode = "ok";
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("list", { name: "Your events" }).getByRole("link"),
  ).toHaveCount(4);

  mode = "expired";
  await page.getByRole("button", { name: "Draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your session has ended." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Log in again" }),
  ).toHaveAttribute("href", "/login");
});
