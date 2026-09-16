"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { ROUTES } from "@/constants/routes";
import { useRegisterMutation } from "@/features/auth/hooks/use-auth-mutations";
import {
  signupSchema,
  type SignupFormValues,
} from "@/features/auth/schemas/auth.schema";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-error";
import { AuthSubmitButton } from "./auth-submit-button";
import { FormError } from "./form-error";
import { PasswordRequirements } from "./PasswordRequirements";

export function SignupForm() {
  const router = useRouter();
  const mutation = useRegisterMutation();
  const submitting = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const pending = isSubmitting || mutation.isPending || mutation.isSuccess;

  async function onSubmit(values: SignupFormValues) {
    if (submitting.current || mutation.isSuccess) return;
    submitting.current = true;
    mutation.reset();

    try {
      const { email, firstName, lastName, password } = values;
      await mutation.mutateAsync({ email, firstName, lastName, password });
      reset();
      // Registration creates an account; the backend does not establish a session.
      router.replace(`${ROUTES.LOGIN}?registered=1`);
    } catch {
      // The mutation retains the error for the shared, safe UI message below.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form
      method="post"
      noValidate
      aria-label="Create your EventFlow account"
      aria-busy={pending}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onChange={() => {
        if (mutation.isError) mutation.reset();
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          {...register("firstName")}
          label="First name"
          autoComplete="given-name"
          placeholder="First name"
          error={errors.firstName?.message}
          disabled={pending}
          required
        />
        <FormField
          {...register("lastName")}
          label="Last name"
          autoComplete="family-name"
          placeholder="Last name"
          error={errors.lastName?.message}
          disabled={pending}
          required
        />
      </div>
      <FormField
        {...register("email")}
        label="Email address"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@example.com"
        error={errors.email?.message}
        disabled={pending}
        required
      />
      <PasswordField
        {...register("password", { deps: ["confirmPassword"] })}
        label="Password"
        autoComplete="new-password"
        placeholder="Create a strong password"
        error={errors.password?.message}
        hint={<PasswordRequirements control={control} />}
        disabled={pending}
        required
      />
      <PasswordField
        {...register("confirmPassword")}
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Enter your password again"
        error={errors.confirmPassword?.message}
        disabled={pending}
        required
      />
      <FormError
        message={
          mutation.isError
            ? getAuthErrorMessage(mutation.error, "register")
            : null
        }
      />
      <AuthSubmitButton
        pending={pending}
        pendingLabel={
          mutation.isSuccess ? "Taking you to login…" : "Creating your account…"
        }
      >
        Create account
      </AuthSubmitButton>
    </form>
  );
}
