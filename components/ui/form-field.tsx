"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  trailing?: ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}
export function FormField({
  label,
  error,
  hint,
  trailing,
  className,
  id,
  ref,
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const description =
    [
      error && `${inputId}-error`,
      hint && `${inputId}-hint`,
      props["aria-describedby"],
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={description}
          className={cn(
            "ef-input block min-h-13 w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 disabled:bg-surface",
            trailing && "pr-13",
            error && "border-danger",
            className,
          )}
        />
        {trailing}
      </div>
      {hint && (
        <div
          id={`${inputId}-hint`}
          className="text-xs leading-relaxed text-muted"
        >
          {hint}
        </div>
      )}
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-xs leading-relaxed text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
