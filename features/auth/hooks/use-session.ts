"use client";

import { useSyncExternalStore } from "react";
import { hasAccessToken, subscribeToAccessToken } from "@/lib/api/api-client";

// Tokens exist only in browser memory, so the server never renders a session.
const serverSnapshot = () => false;

export function useHasSession() {
  return useSyncExternalStore(
    subscribeToAccessToken,
    hasAccessToken,
    serverSnapshot,
  );
}
