import type { Metadata } from "next";
import { AuthFooter } from "@/features/auth/components/auth-footer";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Join EventFlow and start making room for unforgettable experiences.",
};

export default function SignupPage() {
  return (
    <>
      <AuthHeader
        eyebrow="Your next chapter"
        title="Good things start here."
        description="Join a world of people, places, and experiences worth showing up for."
      />
      <SignupForm />
      <AuthFooter
        prompt="Already part of the flow?"
        href={ROUTES.LOGIN}
        label="Log in"
      />
    </>
  );
}
