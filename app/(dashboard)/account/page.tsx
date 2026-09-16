import type { Metadata } from "next";
import { AccountView } from "@/features/auth/components/account-view";
import "@/features/events/explore.css";
import "@/features/events/detail.css";
import "@/features/events/event-form.css";
import "@/features/events/manage-event.css";

export const metadata: Metadata = {
  title: "Account",
  description: "Your EventFlow profile and signed-in sessions.",
};

export default function AccountPage() {
  return <AccountView />;
}
