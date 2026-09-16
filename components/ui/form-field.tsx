"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

const controlClasses =
  "ef-input block w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 disabled:bg-surface";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
}

function useFieldIds(
  id: string | undefined,
  { error, hint }: Pick<FieldProps, "error" | "hint">,
  describedBy?: string,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const description =
    [error && `${inputId}-error`, hint && `${inputId}-hint`, describedBy]
      .filter(Boolean)
      .join(" ") || undefined;
  return { inputId, description };
}

function FieldShell({
  inputId,
  label,
  error,
  hint,
  children,
}: FieldProps & { inputId: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">{children}</div>
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

export interface FormFieldProps
  extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
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
  const { inputId, description } = useFieldIds(
    id,
    { error, hint },
    props["aria-describedby"],
  );
  return (
    <FieldShell inputId={inputId} label={label} error={error} hint={hint}>
      <input
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={description}
        className={cn(
          controlClasses,
          "min-h-13",
          trailing && "pr-13",
          error && "border-danger",
          className,
        )}
      />
      {trailing}
    </FieldShell>
  );
}

export interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {
  ref?: React.Ref<HTMLTextAreaElement>;
}
export function TextareaField({
  label,
  error,
  hint,
  className,
  id,
  ref,
  ...props
}: TextareaFieldProps) {
  const { inputId, description } = useFieldIds(
    id,
    { error, hint },
    props["aria-describedby"],
  );
  return (
    <FieldShell inputId={inputId} label={label} error={error} hint={hint}>
      <textarea
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={description}
        className={cn(
          controlClasses,
          "min-h-40 resize-y leading-7",
          error && "border-danger",
          className,
        )}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {
  ref?: React.Ref<HTMLSelectElement>;
}
export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  ref,
  children,
  ...props
}: SelectFieldProps) {
  const { inputId, description } = useFieldIds(
    id,
    { error, hint },
    props["aria-describedby"],
  );
  return (
    <FieldShell inputId={inputId} label={label} error={error} hint={hint}>
      <select
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={description}
        className={cn(
          controlClasses,
          "min-h-13 appearance-none pr-11 disabled:cursor-wait",
          error && "border-danger",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
      />
    </FieldShell>
  );
}
