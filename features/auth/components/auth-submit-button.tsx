"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AuthSubmitButton({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  return (
    <Button
      type="submit"
      disabled={pending || !hydrated}
      aria-busy={pending}
      className="min-h-13 w-full justify-between px-5"
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
