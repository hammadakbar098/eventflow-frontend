import type { Metadata } from "next";
import { ROUTES } from "@/constants/routes";
import { CreateEventForm } from "@/features/events/components/create-event-form";
import {
  EventFormPageHeader,
  OrganizerBackRow,
} from "@/features/events/components/organizer-page-header";
import "@/features/events/explore.css";
import "@/features/events/detail.css";
import "@/features/events/event-form.css";

export const metadata: Metadata = {
  title: "Create event",
  description:
    "Bring your next event to life. Add the details, choose where it happens and save it as a draft.",
};

export default function CreateEventPage() {
  return (
    <div className="site-container event-detail event-form-page">
      <OrganizerBackRow
        href={ROUTES.MY_EVENTS}
        label="Back to my events"
        eyebrow="Nothing goes live yet"
      />
      <EventFormPageHeader
        eyebrow="Create an event"
        title={
          <>
            Start with
            <br />
            <em>a spark.</em>
          </>
        }
        note={
          <>
            Every event begins as a private draft.
            <br />
            Add the details now, share it when it feels ready.
          </>
        }
      />
      <CreateEventForm />
    </div>
  );
}
