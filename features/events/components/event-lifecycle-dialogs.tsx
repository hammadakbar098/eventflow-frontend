"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  FormProvider,
  useForm,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextareaField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROUTES } from "@/constants/routes";
import { eventKeys } from "../hooks/event-keys";
import {
  eventReasonFormSchema,
  rescheduleFormSchema,
  type EventReasonFormValues,
  type RescheduleFormValues,
} from "../schemas/event-form.schema";
import type { OrganizerEvent } from "../types/event.types";
import {
  lifecycleMutationFeedback,
  type LifecycleFormField,
  type MutationFeedback,
} from "../utils/event-error";
import { isoToZonedDateTime } from "../utils/event-time";
import { EventModal } from "./event-modal";
import { EventScheduleFields } from "./event-schedule-fields";

type Feedback = MutationFeedback<LifecycleFormField>;

export interface LifecycleDialogCopy {
  eyebrow: string;
  title: string;
  description: ReactNode;
  confirm: string;
  pending: string;
  dismiss: string;
  destructive?: boolean;
}

interface LifecycleDialogProps<Values> {
  slug: string;
  action: string;
  copy: LifecycleDialogCopy;
  request: (values: Values) => Promise<unknown>;
  pending: boolean;
  onDone: (close: () => void) => void;
  onClose: () => void;
}

const closeLabel = (title: string) =>
  `Close ${title.toLowerCase().replace(/[.?]$/, "")}`;

/**
 * Runs one lifecycle request at a time. Failures refresh the event, because a
 * rejection usually means its status changed elsewhere.
 */
function useLifecycleRequest(slug: string, action: string) {
  const queryClient = useQueryClient();
  const running = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function run(request: () => Promise<unknown>) {
    if (running.current) return null;
    running.current = true;
    setFeedback(null);
    try {
      await request();
      return { ok: true as const };
    } catch (error) {
      const result = lifecycleMutationFeedback(error, action);
      setFeedback(result);
      void queryClient.invalidateQueries({
        queryKey: eventKeys.mineDetail(slug),
      });
      return { ok: false as const, result };
    } finally {
      running.current = false;
    }
  }
  return { feedback, run };
}

function applyFieldErrors<Values extends FieldValues>(
  setError: UseFormSetError<Values>,
  fields: Feedback["fields"],
) {
  for (const [field, message] of Object.entries(fields))
    setError(field as FieldPath<Values>, { type: "server", message });
}

function DialogFeedback({ feedback }: { feedback: Feedback | null }) {
  // Field-level problems are shown beside their inputs instead.
  if (!feedback || Object.keys(feedback.fields).length) return null;
  return (
    <div className="event-modal-feedback">
      <FormError message={feedback.message} />
      {feedback.sessionExpired && (
        <ButtonLink
          href={ROUTES.LOGIN}
          variant="secondary"
          className="w-full justify-between"
        >
          Log in again
          <ArrowUpRight size={17} aria-hidden="true" />
        </ButtonLink>
      )}
    </div>
  );
}

function DialogActions({
  close,
  copy,
  pending,
}: {
  close: () => void;
  copy: LifecycleDialogCopy;
  pending: boolean;
}) {
  return (
    <div className="explore-dialog-actions">
      <Button variant="secondary" disabled={pending} onClick={close}>
        {copy.dismiss}
      </Button>
      <SubmitButton
        pending={pending}
        pendingLabel={copy.pending}
        variant={copy.destructive ? "danger" : "primary"}
        className="min-w-44"
      >
        {copy.confirm}
      </SubmitButton>
    </div>
  );
}

/** Publish, complete and delete need confirmation but no input. */
export function ConfirmLifecycleDialog({
  slug,
  action,
  copy,
  request,
  pending,
  onDone,
  onClose,
}: LifecycleDialogProps<void>) {
  const { feedback, run } = useLifecycleRequest(slug, action);
  return (
    <EventModal
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      closeLabel={closeLabel(copy.title)}
      busy={pending}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={async (event) => {
            event.preventDefault();
            if ((await run(() => request()))?.ok) onDone(close);
          }}
        >
          <DialogFeedback feedback={feedback} />
          <DialogActions close={close} copy={copy} pending={pending} />
        </form>
      )}
    </EventModal>
  );
}

/** Postponing and cancelling both require a reason for the event's history. */
export function ReasonLifecycleDialog({
  slug,
  action,
  copy,
  request,
  pending,
  onDone,
  onClose,
}: LifecycleDialogProps<EventReasonFormValues>) {
  const { feedback, run } = useLifecycleRequest(slug, action);
  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<EventReasonFormValues>({
    resolver: zodResolver(eventReasonFormSchema),
    mode: "onTouched",
    defaultValues: { reason: "" },
  });

  return (
    <EventModal
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      closeLabel={closeLabel(copy.title)}
      busy={pending}
      onOpen={() => setFocus("reason")}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) =>
            void handleSubmit(async (values) => {
              const outcome = await run(() => request(values));
              if (outcome?.ok) onDone(close);
              else if (outcome)
                applyFieldErrors(setError, outcome.result.fields);
            })(event)
          }
        >
          <fieldset disabled={pending} className="event-modal-fields">
            <TextareaField
              {...register("reason")}
              label="Reason"
              rows={4}
              className="min-h-32"
              hint="Kept with the event’s history. Up to 500 characters."
              error={errors.reason?.message}
              required
            />
          </fieldset>
          <DialogFeedback feedback={feedback} />
          <DialogActions close={close} copy={copy} pending={pending} />
        </form>
      )}
    </EventModal>
  );
}

const rescheduleCopy: LifecycleDialogCopy = {
  eyebrow: "Back on the calendar",
  title: "Reschedule this event.",
  description:
    "Choose the new dates. Rescheduling publishes the event on Explore again.",
  confirm: "Reschedule event",
  pending: "Rescheduling…",
  dismiss: "Not yet",
};

export function RescheduleDialog({
  event,
  request,
  pending,
  onDone,
  onClose,
}: Omit<
  LifecycleDialogProps<RescheduleFormValues>,
  "slug" | "action" | "copy"
> & {
  event: OrganizerEvent;
}) {
  const { feedback, run } = useLifecycleRequest(event.slug, "reschedule");
  const form = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleFormSchema),
    mode: "onTouched",
    // Start from the postponed schedule so organizers adjust rather than retype.
    defaultValues: {
      startAt: isoToZonedDateTime(event.startAt, event.timezone),
      endAt: isoToZonedDateTime(event.endAt, event.timezone),
      timezone: event.timezone,
    },
  });

  return (
    <EventModal
      eyebrow={rescheduleCopy.eyebrow}
      title={rescheduleCopy.title}
      description={rescheduleCopy.description}
      closeLabel="Close reschedule event"
      busy={pending}
      onOpen={() => form.setFocus("startAt")}
      onClose={onClose}
    >
      {(close) => (
        <FormProvider {...form}>
          <form
            noValidate
            aria-busy={pending}
            onSubmit={(submitEvent) =>
              void form.handleSubmit(async (values) => {
                const outcome = await run(() => request(values));
                if (outcome?.ok) onDone(close);
                else if (outcome)
                  applyFieldErrors(form.setError, outcome.result.fields);
              })(submitEvent)
            }
          >
            <fieldset disabled={pending} className="event-modal-fields">
              <EventScheduleFields timezoneHint="New dates use the event’s timezone unless you change it." />
            </fieldset>
            <DialogFeedback feedback={feedback} />
            <DialogActions
              close={close}
              copy={rescheduleCopy}
              pending={pending}
            />
          </form>
        </FormProvider>
      )}
    </EventModal>
  );
}
