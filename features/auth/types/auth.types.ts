import type { z } from "zod";
import type {
  authUserSchema,
  loginResponseSchema,
  registerResponseSchema,
} from "../schemas/auth-response.schema";

export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload extends LoginPayload {
  firstName: string;
  lastName: string;
}

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
