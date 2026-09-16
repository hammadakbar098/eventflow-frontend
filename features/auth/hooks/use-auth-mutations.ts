"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ROUTES } from "@/constants/routes";
import {
  clearSession,
  getRefreshToken,
  setSession,
} from "@/lib/api/api-client";
import {
  getCurrentUser,
  login,
  logout,
  logoutAll,
  register,
} from "../services/auth.service";
import { useHasSession } from "./use-session";

export const authKeys = {
  user: () => ["auth", "user"] as const,
};

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: login,
    onSuccess: (response) => {
      setSession(response);
      queryClient.setQueryData(authKeys.user(), response.user);
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: register,
  });
}

export function useCurrentUser() {
  const hasSession = useHasSession();
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: ({ signal }) => getCurrentUser(signal),
    enabled: hasSession,
    meta: { requiresSession: true },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) await logout(refreshToken);
    },
    // A failed server logout must never leave this device signed in.
    onSettled: () => clearSession(),
  });
}

export function useLogoutAllMutation() {
  return useMutation({
    mutationKey: ["auth", "logout-all"],
    mutationFn: logoutAll,
    onSuccess: () => clearSession(),
    onError: (error) => {
      // An already-invalid session has nothing left to end on the server.
      if (axios.isAxiosError(error) && error.response?.status === 401)
        clearSession();
    },
  });
}

/** Logs this device out and returns to Login, even if the server call fails. */
export function useSignOut() {
  const router = useRouter();
  const mutation = useLogoutMutation();
  return {
    pending: mutation.isPending,
    signOut: () =>
      mutation
        .mutateAsync()
        .catch(() => undefined)
        .then(() => router.replace(ROUTES.LOGIN)),
  };
}
