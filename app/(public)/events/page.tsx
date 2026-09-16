import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { BrandMark } from "@/components/ui/brand";
import { EventGridSkeleton } from "@/features/events/components/event-card-skeleton";
import { ExploreBrowser } from "@/features/events/components/explore-browser";
import "@/features/events/explore.css";

export const metadata: Metadata = {
  title: "Explore events",
  description:
    "Find your kind of moment. Discover upcoming EventFlow events, from in-person gatherings to online experiences.",
};

export default function ExploreEventsPage() {
  return (
    <>
      <section
        className="site-container explore-intro"
        aria-labelledby="explore-page-title"
      >
        <Reveal>
          <p className="eyebrow">Your next good memory</p>
          <h1 id="explore-page-title">
            Find your
            <br />
            <em>kind of moment.</em>
          </h1>
        </Reveal>
        <Reveal delay={0.08} className="explore-intro-note">
          <BrandMark className="size-10" />
          <p>
            New faces. Shared interests.
            <br />
            Something worth showing up for.
          </p>
          <span className="eyebrow">
            Go where your curiosity takes you{" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </Reveal>
      </section>
      <Suspense
        fallback={
          <div className="site-container explore-loading">
            <div className="event-skeleton h-16 rounded-full" />
            <div className="mt-16">
              <EventGridSkeleton />
            </div>
          </div>
        }
      >
        <ExploreBrowser />
      </Suspense>
    </>
  );
}
