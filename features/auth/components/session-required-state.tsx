import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function SessionRequiredState({
  expired = false,
}: {
  expired?: boolean;
}) {
  // An expired session is reported inside a page that already has its heading.
  const Heading = expired ? "h2" : "h1";
  return (
    <div
      role={expired ? "alert" : undefined}
      className={expired ? "event-state" : "event-state min-h-[60vh]"}
    >
      <LockKeyhole size={34} strokeWidth={1.2} aria-hidden="true" />
      <p className="eyebrow">
        {expired ? "Session ended" : "Your organizer workspace"}
      </p>
      <Heading>
        {expired ? "Your session has ended." : "Log in to continue."}
      </Heading>
      <p>
        {expired
          ? "For your security, you’ve been signed out. Log in again to pick up where you left off."
          : "For your security, EventFlow keeps you signed in only while this tab stays open. Log in to see and manage your events."}
      </p>
      <ButtonLink href={ROUTES.LOGIN}>
        {expired ? "Log in again" : "Log in"}
        <ArrowUpRight size={17} aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}
