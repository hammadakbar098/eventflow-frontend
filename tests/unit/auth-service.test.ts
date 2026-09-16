import { test } from "node:test";
import assert from "node:assert/strict";
import type { AxiosAdapter } from "axios";

test("services use one client and strip frontend-only request fields", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.eventflow.test";
  const { apiClient } = await import("../../lib/api/api-client");
  const { login, register } =
    await import("../../features/auth/services/auth.service");
  const originalAdapter = apiClient.defaults.adapter;
  const requests: { url?: string; data: unknown }[] = [];
  const user = {
    id: "test-user",
    email: "alex@example.com",
    firstName: "Alex",
    lastName: "Morgan",
    role: "USER",
  };
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ url: config.url, data: JSON.parse(config.data as string) });
    return {
      data: config.url?.endsWith("login")
        ? { accessToken: "access", refreshToken: "refresh", user }
        : { message: "Account created successfully", user },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  apiClient.defaults.adapter = adapter;
  try {
    const values = {
      email: "alex@example.com",
      password: "Example123$",
      firstName: "Alex",
      lastName: "Morgan",
      confirmPassword: "Example123$",
      extra: "never send",
    };
    await register(values);
    await login(values);
    assert.deepEqual(requests, [
      {
        url: "/api/auth/register",
        data: {
          email: values.email,
          firstName: "Alex",
          lastName: "Morgan",
          password: values.password,
        },
      },
      {
        url: "/api/auth/login",
        data: { email: values.email, password: values.password },
      },
    ]);
    apiClient.defaults.adapter = async (config) => ({
      data: { message: "OK" },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });
    await assert.rejects(login(values));
    await assert.rejects(register(values));
  } finally {
    apiClient.defaults.adapter = originalAdapter;
  }
});
