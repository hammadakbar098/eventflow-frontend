"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setAccessToken } from "@/lib/api/api-client";
import { login, register } from "../services/auth.service";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: login,
    onSuccess: (response) => {
      setAccessToken(response.accessToken);
      queryClient.setQueryData(["auth", "user"], response.user);
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationKey: ["auth", "register"],
    mutationFn: register,
  });
}
