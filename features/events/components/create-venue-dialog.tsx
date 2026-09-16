"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCreateVenueMutation } from "../hooks/use-event-mutations";
import {
  venueFormSchema,
  type VenueFormValues,
} from "../schemas/event-form.schema";
import type { Venue } from "../types/event.types";
import { venueMutationFeedback } from "../utils/event-error";
import { EMPTY_VENUE_FORM, toVenuePayload } from "../utils/event-form";
import { countryName } from "../utils/event-display";
import { EventModal } from "./event-modal";

export function CreateVenueDialog({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (venue: Venue) => void;
}) {
  const submitting = useRef(false);
  const mutation = useCreateVenueMutation();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    mode: "onTouched",
    defaultValues: { ...EMPTY_VENUE_FORM, name: initialName.trim() },
  });
  const pending = isSubmitting || mutation.isPending || mutation.isSuccess;
  const feedback = mutation.isError
    ? venueMutationFeedback(mutation.error)
    : null;
  const country = useWatch({ control, name: "countryCode" })
    .trim()
    .toUpperCase();

  const serverErrorField = useRef<FieldPath<VenueFormValues> | null>(null);

  // Fields are disabled while submitting, so focus waits until they re-enable.
  useEffect(() => {
    if (pending || !serverErrorField.current) return;
    setFocus(serverErrorField.current);
    serverErrorField.current = null;
  }, [pending, setFocus]);

  async function submit(values: VenueFormValues, close: () => void) {
    if (submitting.current) return;
    submitting.current = true;
    mutation.reset();
    try {
      const venue = await mutation.mutateAsync(toVenuePayload(values));
      onCreated(venue);
      close();
    } catch (error) {
      const fields = Object.entries(venueMutationFeedback(error).fields) as [
        FieldPath<VenueFormValues>,
        string,
      ][];
      fields.forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      serverErrorField.current = fields[0]?.[0] ?? null;
    } finally {
      submitting.current = false;
    }
  }

  return (
    <EventModal
      eyebrow="A new place to meet"
      title="Add a venue."
      description="Venues are shared across EventFlow, so check the address carefully. It will be selected for your event straight away."
      closeLabel="Close add venue"
      busy={pending}
      // showModal focuses the close button first; start where typing begins.
      onOpen={() => setFocus("name")}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) => {
            // React bubbles portalled events to the surrounding event form.
            event.stopPropagation();
            void handleSubmit((values) => submit(values, close))(event);
          }}
        >
          <fieldset disabled={pending} className="event-modal-fields">
            <FormField
              {...register("name")}
              label="Venue name"
              placeholder="e.g. Riverside Hall"
              autoComplete="organization"
              error={errors.name?.message}
              required
            />
            <FormField
              {...register("addressLine1")}
              label="Street address"
              placeholder="Street and number"
              autoComplete="address-line1"
              error={errors.addressLine1?.message}
              required
            />
            <FormField
              {...register("addressLine2")}
              label="Address line 2 (optional)"
              placeholder="Building, floor or room"
              autoComplete="address-line2"
              error={errors.addressLine2?.message}
            />
            <div className="event-form-pair">
              <FormField
                {...register("city")}
                label="City"
                autoComplete="address-level2"
                error={errors.city?.message}
                required
              />
              <FormField
                {...register("postalCode")}
                label="Postal code"
                autoComplete="postal-code"
                error={errors.postalCode?.message}
                required
              />
            </div>
            <div className="event-form-pair">
              <FormField
                {...register("state")}
                label="State or region (optional)"
                autoComplete="address-level1"
                error={errors.state?.message}
              />
              <FormField
                {...register("countryCode")}
                label="Country code"
                placeholder="e.g. DE"
                maxLength={2}
                autoCapitalize="characters"
                autoComplete="country"
                spellCheck={false}
                className="uppercase placeholder:normal-case"
                hint={
                  /^[A-Z]{2}$/.test(country)
                    ? countryName(country)
                    : "Two-letter country code"
                }
                error={errors.countryCode?.message}
                required
              />
            </div>
            <div className="event-form-pair">
              <FormField
                {...register("latitude")}
                label="Latitude (optional)"
                inputMode="decimal"
                placeholder="e.g. 49.8917"
                error={errors.latitude?.message}
              />
              <FormField
                {...register("longitude")}
                label="Longitude (optional)"
                inputMode="decimal"
                placeholder="e.g. 10.8868"
                error={errors.longitude?.message}
              />
            </div>
          </fieldset>
          {feedback && !Object.keys(feedback.fields).length && (
            <div className="mt-5">
              <FormError message={feedback.message} />
            </div>
          )}
          <div className="explore-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              pending={pending}
              pendingLabel="Adding venue…"
              className="min-w-44"
            >
              Add venue
            </SubmitButton>
          </div>
        </form>
      )}
    </EventModal>
  );
}
