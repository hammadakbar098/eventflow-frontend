import { z } from "zod";

export const passwordRequirements = [
  {
    label: "At least 8 characters",
    message: "Password must be at least 8 characters.",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "One uppercase letter",
    message: "Password must contain at least one uppercase letter.",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter",
    message: "Password must contain at least one lowercase letter.",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "One number",
    message: "Password must contain at least one number.",
    test: (value: string) => /[0-9]/.test(value),
  },
  {
    label: "One special character",
    message: "Password must contain at least one special character.",
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
] as const;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Please enter your email address.")
  .max(254, "Email must be 254 characters or fewer.")
  .email("Please enter a valid email address.")
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(1, "Please enter your password.")
  .max(128, "Password must be 128 characters or fewer.")
  .superRefine((value, context) => {
    for (const requirement of passwordRequirements) {
      if (!requirement.test(value))
        context.addIssue({ code: "custom", message: requirement.message });
    }
  });

const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter your ${label}.`)
    .min(
      2,
      `${label === "first name" ? "First" : "Last"} name must be at least 2 characters.`,
    )
    .max(100, "Please use 100 characters or fewer.");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const signupSchema = loginSchema
  .extend({
    firstName: nameSchema("first name"),
    lastName: nameSchema("last name"),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Your passwords don’t match. Please try again.",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
