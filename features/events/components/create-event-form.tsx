"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { useCreateEventMutation } from "../hooks/use-event-mutations";
import { EventForm } from "./event-form";

export function CreateEventForm() {
  const router = useRouter();
  const mutation = useCreateEventMutation();

  return (
    <EventForm
      mode="create"
      onSubmit={async (payload) => {
        const event = await mutation.mutateAsync(payload);
        // The backend owns the slug; replace so Back returns to My events.
        router.replace(ROUTES.MANAGE_EVENT(event.slug));
      }}
    />
  );
}
