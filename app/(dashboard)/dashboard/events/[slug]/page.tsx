import type { Metadata } from "next";
import { Suspense } from "react";
import { ManageEvent } from "@/features/events/components/manage-event";
import { ManageEventSkeleton } from "@/features/events/components/organizer-event-states";
import "@/features/events/explore.css";
import "@/features/events/detail.css";
import "@/features/events/event-form.css";
import "@/features/events/manage-event.css";

export const metadata: Metadata = {
  title: "Manage event",
  description:
    "Your organizer control centre for one event: details, media and lifecycle.",
};

export default async function ManageEventPage({
  params,
}: PageProps<"/dashboard/events/[slug]">) {
  const { slug } = await params;
  return (
    <Suspense fallback={<ManageEventSkeleton />}>
      <ManageEvent slug={slug} />
    </Suspense>
  );
}
