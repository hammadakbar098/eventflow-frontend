import type { Metadata } from "next";
import { SessionGate } from "@/features/auth/components/session-gate";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { LandingFooter } from "@/features/landing/components/landing-sections";
import "@/features/landing/landing.css";
import "@/features/events/events.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="events-public-page">
      <LandingNav />
      <main id="main-content">
        <SessionGate>{children}</SessionGate>
      </main>
      <LandingFooter />
    </div>
  );
}
