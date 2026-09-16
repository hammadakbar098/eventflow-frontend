"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  className,
  disabled = false,
  variant,
}: {
  pending: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger";
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled || !hydrated}
      aria-busy={pending}
      // Full width unless the caller sizes the button (cn does not merge classes).
      className={cn("min-h-13 justify-between px-5", className ?? "w-full")}
    >
      <span>{pending ? pendingLabel : children}</span>
      {pending ? (
        <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
      ) : (
        <ArrowUpRight size={19} aria-hidden="true" />
      )}
    </Button>
  );
}
