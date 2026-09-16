import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { BrandMark } from "@/components/ui/brand";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { MyEventsBrowser } from "@/features/events/components/my-events-browser";
import { MyEventListSkeleton } from "@/features/events/components/my-event-row";
import "@/features/events/explore.css";
import "@/features/events/my-events.css";

export const metadata: Metadata = {
  title: "My events",
  description:
    "Your EventFlow organizer workspace. Find, filter and manage every event you’ve created.",
};

export default function MyEventsPage() {
  return (
    <>
      <section
        className="site-container explore-intro my-events-intro"
        aria-labelledby="my-events-title"
      >
        <Reveal>
          <p className="eyebrow">Your organizer workspace</p>
          <h1 id="my-events-title">
            My events,
            <br />
            <em>in full flow.</em>
          </h1>
        </Reveal>
        <Reveal delay={0.08} className="explore-intro-note">
          <BrandMark className="size-10" />
          <p>
            Drafts, big launches and everything in between.
            <br />
            All in one place.
          </p>
          <ButtonLink href={ROUTES.CREATE_EVENT} className="my-events-create">
            Create event <ArrowUpRight size={17} aria-hidden="true" />
          </ButtonLink>
        </Reveal>
      </section>
      <Suspense
        fallback={
          <div className="site-container explore-loading">
            <div className="event-skeleton h-16 rounded-full" />
            <div className="mt-16">
              <MyEventListSkeleton />
            </div>
          </div>
        }
      >
        <MyEventsBrowser />
      </Suspense>
    </>
  );
}
