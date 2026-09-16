import type { Metadata } from "next";
import { EventDetail } from "@/features/events/components/event-detail";
import "@/features/events/detail.css";

export const metadata: Metadata = {
  title: "Event details",
  description:
    "Discover the experience, the people, and the place behind your next EventFlow event.",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
