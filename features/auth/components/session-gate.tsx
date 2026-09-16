"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { subscribeToAccessToken } from "@/lib/api/api-client";
import { useHasSession } from "../hooks/use-session";
import { SessionRequiredState } from "./session-required-state";

export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasSession = useHasSession();

  // A session that ends here (logout, or a failed token refresh) returns to Login.
  useEffect(
    () =>
      subscribeToAccessToken((change) => {
        if (change === "signed-out") router.replace(ROUTES.LOGIN);
      }),
    [router],
  );

  if (hasSession) return children;
  return (
    <div className="site-container pt-7 md:pt-12">
      <SessionRequiredState />
    </div>
  );
}
