import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Welcome back to EventFlow. Log in and get closer to your next great experience.",
};

interface LoginPageProps {
  searchParams: Promise<{ registered?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered } = await searchParams;

  return <LoginForm registered={registered === "1"} />;
}
