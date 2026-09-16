"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormField, SelectField } from "@/components/ui/form-field";
import type { RescheduleFormValues } from "../schemas/event-form.schema";
import { timeZoneOptions } from "../utils/event-time";

/** Start, end and timezone controls shared by the event form and rescheduling. */
export function EventScheduleFields({
  timezoneHint,
}: {
  timezoneHint: string;
}) {
  const {
    register,
    control,
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<RescheduleFormValues>();
  const timezone = useWatch({ control, name: "timezone" });
  const zones = useMemo(() => timeZoneOptions(timezone), [timezone]);

  // Revalidate the paired schedule field only once it has a value.
  const revalidate =
    (...fields: ("startAt" | "endAt")[]) =>
    () => {
      const filled = fields.filter((field) => getValues(field));
      if (filled.length) void trigger(filled);
    };

  return (
    <>
      <div className="event-form-pair event-form-schedule">
        <FormField
          {...register("startAt", { onChange: revalidate("endAt") })}
          label="Starts"
          type="datetime-local"
          className="event-form-datetime"
          error={errors.startAt?.message}
          required
        />
        <FormField
          {...register("endAt", { onChange: revalidate("startAt") })}
          label="Ends"
          type="datetime-local"
          className="event-form-datetime"
          error={errors.endAt?.message}
          required
        />
      </div>
      <SelectField
        {...register("timezone", { onChange: revalidate("startAt", "endAt") })}
        label="Timezone"
        hint={timezoneHint}
        error={errors.timezone?.message}
        required
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
          </option>
        ))}
      </SelectField>
    </>
  );
}
