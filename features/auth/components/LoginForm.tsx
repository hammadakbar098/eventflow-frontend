"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, CircleCheck, Info } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordField } from "@/components/ui/password-field";
import { AUTH_SUCCESS_REDIRECT, ROUTES } from "@/constants/routes";
import { useLoginMutation } from "../hooks/use-auth-mutations";
import { loginSchema, type LoginFormValues } from "../schemas/auth.schema";
import { getAuthErrorMessage } from "../utils/auth-error";
import { AuthFooter } from "./auth-footer";
import { AuthHeader } from "./auth-header";
import { AuthSubmitButton } from "./auth-submit-button";
import { FormError } from "./form-error";

function focusFeedback(element: HTMLDivElement | null) {
  element?.focus();
}

export function LoginForm({ registered = false }: { registered?: boolean }) {
  const router = useRouter();
  const mutation = useLoginMutation();
  const submitting = useRef(false);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const pending = mutation.isPending || isSubmitting;

  async function onSubmit(values: LoginFormValues) {
    if (submitting.current) return;
    submitting.current = true;

    try {
      await mutation.mutateAsync(values);
      reset();

      // The shared constant activates navigation when the authenticated area exists.
      if (AUTH_SUCCESS_REDIRECT) router.replace(AUTH_SUCCESS_REDIRECT);
    } catch {
      // TanStack Query owns the error; the shared mapper supplies safe UI copy.
    } finally {
      submitting.current = false;
    }
  }

  if (mutation.isSuccess) {
    return (
      <div
        ref={focusFeedback}
        tabIndex={-1}
        aria-labelledby="login-success-title"
        className="rounded-2xl outline-none"
      >
        <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-periwinkle">
          <Check size={26} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <p className="eyebrow mb-4">Welcome to EventFlow</p>
        <h1
          id="login-success-title"
          className="font-display text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-[1.12] tracking-[-0.055em]"
        >
          You’re signed in.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted" role="status">
          {AUTH_SUCCESS_REDIRECT
            ? "Taking you to your EventFlow workspace."
            : "A great experience starts with a little curiosity. Explore what’s possible with EventFlow."}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <ButtonLink
            href={AUTH_SUCCESS_REDIRECT ?? ROUTES.EXPLORE}
            className="w-full justify-between"
          >
            {AUTH_SUCCESS_REDIRECT
              ? "Continue to EventFlow"
              : "Explore EventFlow"}
            <ArrowUpRight size={18} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={ROUTES.HOME} variant="secondary" className="w-full">
            Back to home
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeader
        eyebrow="Your next experience starts here"
        title="Good to have you back."
        description="Log in to find your people and make more moments happen."
      />

      {registered && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/5 p-3.5 text-sm leading-relaxed text-success"
        >
          <CircleCheck
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <p>
            Your account is ready. Log in with your new details to get started.
          </p>
        </div>
      )}

      <form
        method="post"
        noValidate
        aria-label="Log in to EventFlow"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        onChangeCapture={() => {
          if (mutation.isError) mutation.reset();
        }}
        className="space-y-5"
      >
        <FormField
          {...register("email")}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          required
          disabled={pending}
          error={errors.email?.message}
        />

        <div>
          <PasswordField
            {...register("password")}
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={pending}
            error={errors.password?.message}
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              disabled={pending}
              aria-expanded={showRecoveryNotice}
              aria-controls="password-recovery-notice"
              onClick={() => setShowRecoveryNotice((visible) => !visible)}
              className="inline-flex min-h-11 items-center text-xs font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink disabled:opacity-55"
            >
              Forgot password?
            </button>
          </div>
          <div id="password-recovery-notice" hidden={!showRecoveryNotice}>
            {showRecoveryNotice && (
              <div
                role="status"
                className="mt-1 flex gap-2.5 rounded-xl bg-lavender/60 p-3.5 text-sm leading-relaxed text-ink-soft"
              >
                <Info
                  size={17}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  Password reset isn’t available yet. If you need help accessing
                  your account, contact your event organizer.
                </p>
              </div>
            )}
          </div>
        </div>

        {mutation.isError && (
          <div
            ref={focusFeedback}
            tabIndex={-1}
            className="rounded-xl outline-none"
          >
            <FormError message={getAuthErrorMessage(mutation.error, "login")} />
          </div>
        )}

        <AuthSubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </AuthSubmitButton>
        <span className="sr-only" role="status">
          {pending ? "Logging in. Please wait." : ""}
        </span>
      </form>

      <AuthFooter
        prompt="New around here?"
        href={ROUTES.SIGNUP}
        label="Create an account"
      />
    </>
  );
}
