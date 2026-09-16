import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "light" | "ghost" | "danger";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "bg-transparent text-ink border border-line hover:bg-white",
  light: "bg-baby-blue-ice text-ink hover:bg-periwinkle",
  ghost: "bg-transparent text-ink hover:bg-lavender/60",
  // Reserved for confirming irreversible actions inside a dialog.
  danger: "bg-danger text-white hover:bg-danger/90",
};
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(
    "ef-button inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55",
    variants[variant],
    className,
  );
}
export function Button({
  className,
  variant,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={buttonClasses(variant, className)}
      type={type}
      {...props}
    />
  );
}
export function ButtonLink({
  className,
  variant,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
