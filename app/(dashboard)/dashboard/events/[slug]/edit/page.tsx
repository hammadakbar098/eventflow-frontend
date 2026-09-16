import type { Metadata } from "next";
import { EditEvent } from "@/features/events/components/edit-event";
import "@/features/events/explore.css";
import "@/features/events/detail.css";
import "@/features/events/event-form.css";

export const metadata: Metadata = {
  title: "Edit event",
  description: "Refine the details of your draft event.",
};

export default async function EditEventPage({
  params,
}: PageProps<"/dashboard/events/[slug]/edit">) {
  const { slug } = await params;
  return <EditEvent slug={slug} />;
}
