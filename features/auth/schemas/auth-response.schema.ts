import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});

// Verified against the sibling Nest backend; reject malformed success responses.
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: authUserSchema,
});
export const registerResponseSchema = z.object({
  message: z.string(),
  user: authUserSchema,
});
