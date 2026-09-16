import { expect, test } from "@playwright/test";
import {
  categories,
  detail,
  listing,
  mockEvents,
  tags,
} from "./fixtures/events";

test("discovery loads the public API, shows placeholders and opens event details", async ({
  page,
}) => {
  const requests: URL[] = [];
  await mockEvents(page, async (route) => {
    requests.push(new URL(route.request().url()));
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: listing() });
  });
  await page.goto("/events");
  const card = page.getByRole("link", { name: `View ${detail.title}` });
  await expect(card).toBeVisible();
  expect(requests[0].searchParams.get("page")).toBe("1");
  expect(requests[0].searchParams.get("limit")).toBe("12");
  await expect(
    card.getByRole("img", { name: /image not available/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toContainText(
    "Technology",
  );
  await card.click();
  await expect(page).toHaveURL(/\/events\/future-of-ai$/);
  await expect(
    page.getByRole("heading", { level: 1, name: detail.title }),
  ).toBeVisible();
});

test("all filters combine correctly, reset pagination and survive refresh", async ({
  page,
}) => {
  let lastParams = new URLSearchParams();
  await mockEvents(page, async (route) => {
    lastParams = new URL(route.request().url()).searchParams;
    await route.fulfill({ json: listing(Number(lastParams.get("page"))) });
  });
  await page.goto("/events?page=2&limit=12");
  await expect(
    page.getByRole("link", { name: "View The Shared Table" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search events", exact: true })
    .fill("conference");
  await page.getByLabel("Format", { exact: true }).selectOption("HYBRID");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption(categories[0].id);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("City", { exact: true }).fill("Bamberg");
  await page.getByLabel("Country", { exact: true }).fill("de");
  await page.getByLabel("From date").fill("2026-10-01");
  await page.getByLabel("To date").fill("2026-12-31");
  await page.getByRole("checkbox", { name: "AI", exact: true }).check();
  await expect.poll(() => lastParams.get("tagId")).toBe(tags[0].id);
  await page.getByRole("checkbox", { name: "Networking", exact: true }).check();
  const expected = {
    page: "1",
    limit: "12",
    search: "conference",
    format: "HYBRID",
    categoryId: categories[0].id,
    city: "Bamberg",
    countryCode: "DE",
    startFrom: "2026-10-01T00:00:00.000Z",
    startTo: "2026-12-31T23:59:59.999Z",
    tagIds: tags
      .map((tag) => tag.id)
      .sort()
      .join(","),
  };
  await expect.poll(() => Object.fromEntries(lastParams)).toEqual(expected);
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual(
    expected,
  );
  await page.reload();
  await expect(
    page.getByRole("searchbox", { name: "Search events", exact: true }),
  ).toHaveValue("conference");
  await expect(page.getByLabel("Format", { exact: true })).toHaveValue(
    "HYBRID",
  );
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Bamberg");
  await expect(
    page.getByRole("checkbox", { name: "AI", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Networking", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect
    .poll(() => Object.fromEntries(lastParams))
    .toEqual({ page: "1", limit: "12" });
  await expect(
    page.getByRole("searchbox", { name: "Search events", exact: true }),
  ).toHaveValue("");
});

test("search and tag queries debounce typing, and navigation cancels pending edits", async ({
  page,
}) => {
  const searches: string[] = [];
  const tagSearches: string[] = [];
  await mockEvents(page, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("search")) searches.push(params.get("search")!);
    await route.fulfill({ json: listing() });
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/api/tags") && url.searchParams.has("search"))
      tagSearches.push(url.searchParams.get("search")!);
  });
  await page.goto("/events");
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", {
    name: "Search events",
    exact: true,
  });
  await search.pressSequentially("conference", { delay: 20 });
  await expect.poll(() => searches).toEqual(["conference"]);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search tags", exact: true })
    .pressSequentially("ai", { delay: 20 });
  await expect.poll(() => tagSearches).toEqual(["ai"]);
  await expect(
    page.getByRole("checkbox", { name: "AI", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Networking", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Format", { exact: true }).selectOption("ONLINE");
  await expect(page).toHaveURL(/format=ONLINE/);
  await search.fill("unfinished edit");
  await page.goBack();
  await expect(search).toHaveValue("conference");
  await expect(page.getByLabel("Format", { exact: true })).toHaveValue("");
  await page.waitForTimeout(450); // Longer than the debounce: history must stay authoritative.
  expect(new URL(page.url()).searchParams.get("search")).toBe("conference");
  expect(new URL(page.url()).searchParams.has("format")).toBe(false);
  await page.goForward();
  await expect(page.getByLabel("Format", { exact: true })).toHaveValue(
    "ONLINE",
  );
});

test("pagination uses server metadata and keeps prior cards during the next request", async ({
  page,
}) => {
  let releasePage: (() => void) | undefined;
  await mockEvents(page, async (route) => {
    const current = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    if (current === 2)
      await new Promise<void>((resolve) => {
        releasePage = resolve;
      });
    await route.fulfill({ json: listing(current) });
  });
  await page.goto("/events");
  await expect(
    page.getByRole("button", { name: "Previous page" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect.poll(() => !!releasePage).toBe(true);
  releasePage!();
  await expect(
    page.getByRole("link", { name: "View The Shared Table" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Event pagination" }),
  ).toContainText("Page 2 of 3");
  await page.getByLabel("Events per page").selectOption("24");
  await expect(page).toHaveURL(/page=1&limit=24/);
});

test("initial loading, empty results and clear filters have usable states", async ({
  page,
}) => {
  let releaseList: (() => void) | undefined;
  await mockEvents(page, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("search")) {
      await new Promise<void>((resolve) => {
        releaseList = resolve;
      });
      await route.fulfill({
        json: listing(1, {
          data: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
        }),
      });
    } else await route.fulfill({ json: listing() });
  });
  await page.goto("/events?search=nonexistent");
  await expect(
    page.getByRole("status", { name: "Loading events" }),
  ).toBeVisible();
  await expect.poll(() => !!releaseList).toBe(true);
  releaseList!();
  await expect(
    page.getByRole("heading", { name: "Nothing here. Yet." }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Your next possibilities" })
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
});

test("network errors and unavailable filter references recover independently", async ({
  page,
}) => {
  let recovered = false;
  await mockEvents(page, async (route) =>
    recovered
      ? route.fulfill({ json: listing() })
      : route.abort("internetdisconnected"),
  );
  await page.route("**/backend/api/event-categories", (route) =>
    recovered
      ? route.fulfill({ json: categories })
      : route.fulfill({ status: 503, json: { message: "Private stack" } }),
  );
  await page.route("**/backend/api/tags*", (route) =>
    recovered
      ? route.fulfill({ json: tags })
      : route.fulfill({ status: 503, json: { message: "Private stack" } }),
  );
  await page.goto("/events");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    /connection/i,
  );
  await expect(
    page.getByText("Categories couldn’t load.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByText("Tags couldn’t load.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Private stack")).toHaveCount(0);
  recovered = true;
  await page
    .getByRole("main")
    .getByRole("alert")
    .getByRole("button", { name: "Try again" })
    .click();
  await page
    .getByText("Categories couldn’t load.", { exact: false })
    .getByRole("button", { name: "Try again" })
    .click();
  await page
    .getByText("Tags couldn’t load.", { exact: false })
    .getByRole("button", { name: "Try again" })
    .click();
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: "AI", exact: true }),
  ).toBeVisible();
});

test("invalid URL filters are normalized and out-of-range pages recover", async ({
  page,
}) => {
  const requests: Record<string, string>[] = [];
  await mockEvents(page, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(Object.fromEntries(params));
    const requestedPage = Number(params.get("page"));
    await route.fulfill({
      json: listing(requestedPage, requestedPage > 3 ? { data: [] } : {}),
    });
  });
  await page.goto(
    "/events?page=-2&limit=500&format=bogus&startFrom=2026-02-30&categoryId=invalid&countryCode=Germany",
  );
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
  expect(requests[0]).toEqual({ page: "1", limit: "12" });
  await page.goto("/events?page=99&limit=12");
  await expect(page).toHaveURL(/page=3/);
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "View The Shared Table" }),
  ).toBeVisible();
});

test("mobile filters trap focus, apply pending text and restore the trigger on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockEvents(page);
  await page.goto("/events");
  await expect(
    page.getByRole("link", { name: `View ${detail.title}` }),
  ).toBeVisible();
  const filtersButton = page.getByRole("button", {
    name: "Filters",
    exact: true,
  });
  await filtersButton.click();
  const dialog = page.getByRole("dialog", { name: "Find your flow." });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close filters" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Show experiences" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await dialog.getByLabel("City", { exact: true }).fill("Bamberg");
  await dialog.getByRole("button", { name: "Show experiences" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/city=Bamberg/);
  await expect(filtersButton).toBeFocused();
  await filtersButton.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(filtersButton).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
});

test("date validation prevents rejected queries and resets on clear and history navigation", async ({
  page,
}) => {
  await mockEvents(page);
  await page.goto("/events?search=conference");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("To date").fill("2000-01-01");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose today or a later end date",
  );
  expect(new URL(page.url()).searchParams.has("startTo")).toBe(false);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByLabel("To date")).toHaveAttribute(
    "aria-invalid",
    "false",
  );
  await page.getByLabel("From date").fill("2027-06-03");
  await page.getByLabel("To date").fill("2027-06-01");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "on or after the start date",
  );
  await page.goBack();
  await expect(page.getByLabel("To date")).toHaveAttribute(
    "aria-invalid",
    "false",
  );
});

test("adding a tag preserves a valid legacy singular tag from the URL", async ({
  page,
}) => {
  const legacyTag = "33333333-3333-1333-8333-333333333333";
  await mockEvents(page);
  await page.goto(`/events?tagId=${legacyTag}`);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("checkbox", { name: "AI", exact: true }).check();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tagId"))
    .toBe(legacyTag);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tagIds"))
    .toBe(tags[0].id);
  await page.getByRole("button", { name: "Remove Selected tag tag" }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tagId"))
    .toBe(tags[0].id);
  expect(new URL(page.url()).searchParams.has("tagIds")).toBe(false);
});

test("Back after a debounced search returns to the previous results", async ({
  page,
}) => {
  await mockEvents(page);
  await page.goto("/events?page=2&limit=12");
  await expect(
    page.getByRole("link", { name: "View The Shared Table" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search events", exact: true })
    .pressSequentially("conference");
  await expect(page).toHaveURL(/search=conference/);
  await page.goBack();
  await expect(page).toHaveURL(/\/events\?page=2&limit=12$/);
  // The committed draft must not be written again once Back has settled.
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/events\?page=2&limit=12$/);
  await expect(
    page.getByRole("searchbox", { name: "Search events", exact: true }),
  ).toHaveValue("");
});
