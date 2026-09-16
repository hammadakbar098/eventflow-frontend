import { apiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/constants/api";
import {
  loginResponseSchema,
  registerResponseSchema,
} from "../schemas/auth-response.schema";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from "../types/auth.types";

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.LOGIN, {
    email: payload.email,
    password: payload.password,
  });
  return loginResponseSchema.parse(data);
}

export async function register(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  // Deliberate allowlist: confirmPassword never crosses the API boundary.
  const { email, firstName, lastName, password } = payload;
  const { data } = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.REGISTER, {
    email,
    firstName,
    lastName,
    password,
  });
  return registerResponseSchema.parse(data);
}
