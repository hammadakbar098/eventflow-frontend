import { test } from "node:test";
import assert from "node:assert/strict";
import { AxiosError, AxiosHeaders } from "axios";
import {
  loginSchema,
  signupSchema,
} from "../../features/auth/schemas/auth.schema";
import { getAuthErrorMessage } from "../../features/auth/utils/auth-error";

const validSignup = {
  email: "  HAMMAD@EXAMPLE.COM ",
  firstName: " Hammad ",
  lastName: " Akbar ",
  password: "Hammad123$",
  confirmPassword: "Hammad123$",
};

test("normalizes email and names while preserving passwords", () => {
  assert.deepEqual(signupSchema.parse(validSignup), {
    ...validSignup,
    email: "hammad@example.com",
    firstName: "Hammad",
    lastName: "Akbar",
  });
  const password = " Hammad123$ ";
  assert.equal(
    loginSchema.parse({ email: " A@EXAMPLE.COM ", password }).password,
    password,
  );
});

for (const [field, value] of [
  ["email", ""],
  ["email", "invalid"],
  ["email", `${"a".repeat(255)}@x.com`],
  ["firstName", "   "],
  ["firstName", "A"],
  ["firstName", "x".repeat(101)],
  ["lastName", "   "],
  ["lastName", "A"],
  ["lastName", "x".repeat(101)],
  ["password", ""],
  ["password", "Aa1$"],
  ["password", "hammad123$"],
  ["password", "HAMMAD123$"],
  ["password", "Hammadabc$"],
  ["password", "Hammad1234"],
  ["password", "Hammad123 "],
  ["password", `Aa1$${"x".repeat(128)}`],
  ["confirmPassword", ""],
  ["confirmPassword", "Hammad123$ "],
] as const) {
  test(`rejects invalid ${field}: ${JSON.stringify(value.slice(0, 20))}`, () => {
    const result = signupSchema.safeParse({ ...validSignup, [field]: value });
    assert.equal(result.success, false);
    if (!result.success)
      assert.ok(result.error.issues.some((issue) => issue.path[0] === field));
  });
}

test("login enforces the same password requirements", () => {
  assert.equal(
    loginSchema.safeParse({
      email: "hammad@example.com",
      password: "lowercase1$",
    }).success,
    false,
  );
  assert.equal(loginSchema.safeParse(validSignup).success, true);
});

function errorResponse(status: number, message: unknown) {
  return new AxiosError("Request failed", undefined, undefined, undefined, {
    status,
    statusText: "Error",
    data: { message },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

for (const status of [400, 401, 403, 409, 422, 429, 500, 503]) {
  test(`HTTP ${status} errors never reveal technical response details`, () => {
    const message = getAuthErrorMessage(
      errorResponse(
        status,
        "PrismaClient: SELECT * FROM users at /server/auth.ts:99",
      ),
      "register",
    );
    assert.ok(message.length > 15);
    assert.doesNotMatch(message, /PrismaClient|SELECT|server\/auth/);
  });
}

test("handles Nest validation arrays safely", () => {
  assert.match(
    getAuthErrorMessage(
      errorResponse(400, [
        "email must be an email",
        "password internal constraint",
      ]),
      "login",
    ),
    /check your details/i,
  );
});
test("uses verified user-facing backend messages", () => {
  assert.match(
    getAuthErrorMessage(
      errorResponse(409, "An account with this email already exists"),
      "register",
    ),
    /Try logging in/,
  );
});
test("network, timeout, configuration and unexpected errors are actionable", () => {
  assert.match(
    getAuthErrorMessage(
      new AxiosError("Network Error", "ERR_NETWORK"),
      "login",
    ),
    /connection/,
  );
  assert.match(
    getAuthErrorMessage(new AxiosError("Timeout", "ECONNABORTED"), "login"),
    /too long/,
  );
  assert.match(
    getAuthErrorMessage(new Error("API_NOT_CONFIGURED"), "login"),
    /temporarily unavailable/,
  );
  assert.match(
    getAuthErrorMessage(new Error("secret detail"), "login"),
    /try again/i,
  );
});
