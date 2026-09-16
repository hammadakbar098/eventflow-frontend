"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, LockKeyhole, Monitor } from "lucide-react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { FormField, TextareaField } from "@/components/ui/form-field";
import { easeOutExpo } from "@/animations/variants";
import { eventFormatSchema } from "../schemas/event.schema";
import type { EventFormValues } from "../schemas/event-form.schema";
import type { EventFormat, Venue } from "../types/event.types";
import { EVENT_FORMAT_LABELS } from "../utils/event-display";
import { EVENT_FORMAT_ICONS } from "./event-metadata";
import { VenueSelector } from "./venue-selector";

const formatDescriptions: Record<EventFormat, string> = {
  PHYSICAL: "Welcome people to a venue.",
  ONLINE: "Bring people together from anywhere.",
  HYBRID: "In the room and online, at the same time.",
};

export function EventFormatFields({
  initialVenue,
}: {
  initialVenue?: Venue | null;
}) {
  const {
    control,
    register,
    clearErrors,
    formState: { errors },
  } = useFormContext<EventFormValues>();
  const format = useWatch({ control, name: "format" });
  const venue = useController({ control, name: "venueId" });
  const formatField = register("format", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      // Hidden sections keep their values, but never their stale errors.
      const next = event.target.value as EventFormat;
      if (next === "ONLINE") clearErrors("venueId");
      if (next === "PHYSICAL") clearErrors("onlineDetails");
    },
  });
  const online = errors.onlineDetails;
  const reduced = useReducedMotion();
  // Matches the landing page's filter-driven card transitions.
  const reveal = {
    initial: { opacity: 0, y: reduced ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: reduced ? 1 : 0.98 },
    transition: { duration: reduced ? 0 : 0.35, ease: easeOutExpo },
  };

  return (
    <div className="event-form-fields">
      <fieldset className="event-format-selector">
        <legend className="sr-only">How will people join?</legend>
        <div className="event-format-options">
          {eventFormatSchema.options.map((option) => {
            const Icon = EVENT_FORMAT_ICONS[option];
            return (
              <label key={option} className="event-format-option">
                <input {...formatField} type="radio" value={option} />
                <span className="event-format-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="event-format-copy">
                  <strong>{EVENT_FORMAT_LABELS[option]}</strong>
                  <small>{formatDescriptions[option]}</small>
                </span>
                <span className="event-format-check" aria-hidden="true">
                  <Check size={13} strokeWidth={2.2} />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <AnimatePresence initial={false} mode="popLayout">
        {format !== "ONLINE" && (
          <motion.div key="venue" {...reveal}>
            <VenueSelector
              value={venue.field.value}
              onChange={venue.field.onChange}
              inputRef={venue.field.ref}
              initialVenue={initialVenue}
              error={errors.venueId?.message}
            />
          </motion.div>
        )}
        {format !== "PHYSICAL" && (
          <motion.div key="online" {...reveal}>
            <fieldset className="event-form-online">
              <legend className="event-form-subheading">
                <Monitor size={17} strokeWidth={1.5} aria-hidden="true" />
                Online access
              </legend>
              <div className="event-form-pair">
                <FormField
                  {...register("onlineDetails.platform")}
                  label="Platform"
                  placeholder="e.g. Zoom or Microsoft Teams"
                  maxLength={100}
                  error={online?.platform?.message}
                  required
                />
                <FormField
                  {...register("onlineDetails.accessCode")}
                  label="Access code (optional)"
                  placeholder="Meeting code or passcode"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={100}
                  error={online?.accessCode?.message}
                />
              </div>
              <FormField
                {...register("onlineDetails.accessUrl")}
                label="Joining link"
                type="url"
                inputMode="url"
                placeholder="https://"
                autoComplete="off"
                spellCheck={false}
                error={online?.accessUrl?.message}
                required
              />
              <TextareaField
                {...register("onlineDetails.accessInstructions")}
                label="Joining instructions (optional)"
                placeholder="e.g. Join ten minutes early to test your audio."
                rows={3}
                className="min-h-28"
                error={online?.accessInstructions?.message}
              />
              <div className="event-detail-ticket-note">
                <LockKeyhole size={20} strokeWidth={1.4} aria-hidden="true" />
                <div>
                  <h3>Kept private.</h3>
                  <p>
                    Joining links, codes and instructions never appear on your
                    public event page.
                  </p>
                </div>
              </div>
            </fieldset>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
