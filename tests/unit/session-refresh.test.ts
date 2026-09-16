import { test } from "node:test";
import assert from "node:assert/strict";
import { AxiosError, type AxiosAdapter } from "axios";

test("expired access tokens refresh once, retry once and end the session on failure", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.eventflow.test";
  const client = await import("../../lib/api/api-client");
  const { apiClient } = client;
  const originalAdapter = apiClient.defaults.adapter;
  const calls: { url?: string; auth?: string; body?: unknown }[] = [];
  let refreshWorks = true;
  const changes: string[] = [];
  const unsubscribe = client.subscribeToAccessToken((change) =>
    changes.push(change),
  );
  const adapter: AxiosAdapter = async (config) => {
    const auth = config.headers.get("Authorization") as string | undefined;
    calls.push({
      url: config.url,
      auth,
      body: config.data ? JSON.parse(config.data as string) : undefined,
    });
    const respond = (status: number, data: unknown) => {
      const response = { data, status, statusText: "", headers: {}, config };
      if (status < 400) return response;
      throw new AxiosError("fail", undefined, config, {}, response);
    };
    if (config.url === "/api/auth/refresh")
      return refreshWorks
        ? respond(201, {
            accessToken: "fresh-access",
            refreshToken: "fresh-refresh",
          })
        : respond(401, { message: "DEBUG: session revoked" });
    return auth === "Bearer fresh-access"
      ? respond(200, { ok: true })
      : respond(401, { message: "Unauthorized" });
  };
  apiClient.defaults.adapter = adapter;
  try {
    client.setSession({
      accessToken: "old-access",
      refreshToken: "old-refresh",
    });
    const [first, second] = await Promise.all([
      apiClient.get("/api/users/me"),
      apiClient.get("/api/events/mine"),
    ]);
    assert.deepEqual([first.data, second.data], [{ ok: true }, { ok: true }]);
    const refreshes = calls.filter((call) => call.url === "/api/auth/refresh");
    assert.equal(refreshes.length, 1, "concurrent 401s share one refresh");
    assert.deepEqual(refreshes[0].body, { refreshToken: "old-refresh" });
    assert.equal(refreshes[0].auth, undefined);
    assert.equal(client.getRefreshToken(), "fresh-refresh");
    assert.deepEqual(changes, ["signed-in", "refreshed"]);

    // Public requests carry no token, so a 401 there never refreshes.
    calls.length = 0;
    await assert.rejects(
      apiClient.get("/api/events", { headers: { Authorization: undefined } }),
    );
    assert.equal(calls.length, 1);

    // A failed refresh ends the session instead of looping.
    calls.length = 0;
    client.setSession({ accessToken: "old-access", refreshToken: "revoked" });
    refreshWorks = false;
    await assert.rejects(apiClient.get("/api/users/me"));
    assert.deepEqual(
      calls.map((call) => call.url),
      ["/api/users/me", "/api/auth/refresh"],
    );
    assert.equal(client.hasAccessToken(), false);
    assert.equal(client.getRefreshToken(), null);
    assert.equal(changes.at(-1), "signed-out");
  } finally {
    unsubscribe();
    apiClient.defaults.adapter = originalAdapter;
    client.clearSession();
  }
});
