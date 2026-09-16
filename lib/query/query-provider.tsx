"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { subscribeToAccessToken } from "@/lib/api/api-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false, gcTime: 0, networkMode: "always" },
        },
      }),
  );

  // Private data never outlives the session that fetched it; a token refresh
  // continues the same session, so its data stays.
  useEffect(
    () =>
      subscribeToAccessToken((change) => {
        if (change === "refreshed") return;
        client.removeQueries({
          predicate: (query) => query.meta?.requiresSession === true,
        });
      }),
    [client],
  );

  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
