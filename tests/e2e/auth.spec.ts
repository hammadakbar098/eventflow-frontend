import { test, expect, type Page } from "@playwright/test";

const api = "**/backend/api/auth/";
const user = {
  id: "test-user",
  email: "alex@example.com",
  firstName: "Alex",
  lastName: "Morgan",
  role: "USER",
};

async function fillLogin(page: Page) {
  await page.getByLabel("Email address").fill(" ALEX@EXAMPLE.COM ");
  await page.getByLabel("Password", { exact: true }).fill("Example123$");
}
async function fillSignup(page: Page) {
  await page.getByLabel("First name").fill(" Alex ");
  await page.getByLabel("Last name").fill(" Morgan ");
  await fillLogin(page);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Example123$");
}

test("login validation, password visibility, recovery and signup navigation", async ({
  page,
}) => {
  let requests = 0;
  await page.route(`${api}login`, (route) => {
    requests++;
    return route.abort();
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByText("Please enter your email address."),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeFocused();
  await page.getByLabel("Password", { exact: true }).fill("Example123$");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(
    page.getByText(/Password reset isn’t available yet/),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("login sends normalized payload once and shows accessible success", async ({
  page,
}) => {
  let requestCount = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${api}login`, async (route) => {
    requestCount++;
    expect(route.request().postDataJSON()).toEqual({
      email: "alex@example.com",
      password: "Example123$",
    });
    await gate;
    await route.fulfill({
      json: {
        user,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      },
    });
  });
  let workspaceAuthorization: string | undefined;
  await page.route(/\/backend\/api\/events\/mine(?:\?|$)/, (route) => {
    workspaceAuthorization = route.request().headers().authorization;
    return route.fulfill({
      json: {
        data: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      },
    });
  });
  await page.goto("/login");
  await fillLogin(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Logging in…" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Email address")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Show password", exact: true }),
  ).toBeDisabled();
  await page.locator("form").dispatchEvent("submit");
  release();
  // Signing in continues to the organizer workspace with the in-memory session.
  await expect(page).toHaveURL(/\/dashboard\/events(?:\?|$)/);
  await expect(
    page.getByRole("heading", { level: 1, name: /My events/ }),
  ).toBeVisible();
  expect(requestCount).toBe(1);
  expect(workspaceAuthorization).toBe("Bearer test-access-token");
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await expect(
    page.getByRole("link", { name: "My events", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("signup validates confirmation and sends only the backend fields", async ({
  page,
}) => {
  let requestCount = 0;
  await page.route(`${api}register`, async (route) => {
    requestCount++;
    expect(route.request().postDataJSON()).toEqual({
      email: "alex@example.com",
      firstName: "Alex",
      lastName: "Morgan",
      password: "Example123$",
    });
    await route.fulfill({
      status: 201,
      json: { message: "Account created successfully", user },
    });
  });
  await page.goto("/signup");
  await fillSignup(page);
  await expect(
    page.getByText("5 of 5 password requirements met."),
  ).toBeAttached();
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Example123$ ");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Your passwords don’t match. Please try again."),
  ).toBeVisible();
  expect(requestCount).toBe(0);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Example123$");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?registered=1$/);
  await expect(
    page.getByText(
      "Your account is ready. Log in with your new details to get started.",
    ),
  ).toBeVisible();
  expect(requestCount).toBe(1);
});

for (const [status, message] of [
  [400, /Please check your details/],
  [401, /email or password is incorrect/],
  [409, /account with this email already exists/],
  [500, /service is temporarily unavailable/],
] as const) {
  test(`login HTTP ${status} renders a safe, recoverable error`, async ({
    page,
  }) => {
    await page.route(`${api}login`, (route) =>
      route.fulfill({
        status,
        json: { message: "Internal SQL details must not be visible" },
      }),
    );
    await page.goto("/login");
    await fillLogin(page);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("form").getByRole("alert")).toContainText(
      message,
    );
    await expect(
      page.getByText("Internal SQL details must not be visible"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Log in", exact: true }),
    ).toBeEnabled();
    await page.getByLabel("Email address").fill("retry@example.com");
    await expect(page.getByRole("form").getByRole("alert")).toHaveCount(0);
  });
}

test("signup conflict preserves input and links back to login", async ({
  page,
}) => {
  await page.route(`${api}register`, (route) =>
    route.fulfill({
      status: 409,
      json: { message: "An account with this email already exists" },
    }),
  );
  await page.goto("/signup");
  await fillSignup(page);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText(
    "Try logging in.",
  );
  await expect(page.getByLabel("First name")).toHaveValue(" Alex ");
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeEnabled();
});

test("network failure leaves the form usable", async ({ page }) => {
  await page.route(`${api}login`, (route) => route.abort("failed"));
  await page.goto("/login");
  await fillLogin(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText(
    "Check your internet connection",
  );
  await expect(page.getByLabel("Email address")).toBeEnabled();
});

test("malformed success responses do not create a false signed-in state", async ({
  page,
}) => {
  await page.route(`${api}login`, (route) =>
    route.fulfill({ json: { message: "ok" } }),
  );
  await page.goto("/login");
  await fillLogin(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText(
    "We couldn’t complete your request.",
  );
  await expect(
    page.getByRole("heading", { name: "You’re signed in." }),
  ).toHaveCount(0);
});

test("without JavaScript credentials cannot be submitted by the form button", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3001/login");
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("form")).toHaveAttribute("method", "post");
  await context.close();
});
