"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FormProvider,
  useController,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Check, Circle } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ButtonLink } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import {
  FormField,
  SelectField,
  TextareaField,
} from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROUTES } from "@/constants/routes";
import { useEventCategories } from "../hooks/use-events";
import {
  createEventFormSchema,
  type EventFormMode,
  type EventFormValues,
} from "../schemas/event-form.schema";
import type {
  EventPayload,
  EventUpdatePayload,
  Tag,
  Venue,
} from "../types/event.types";
import {
  eventMutationFeedback,
  type EventFormField,
  type MutationFeedback,
} from "../utils/event-error";
import {
  eventFormDefaults,
  toEventPayload,
  toEventUpdatePayload,
} from "../utils/event-form";
import { EventFormatFields } from "./event-format-fields";
import { EventScheduleFields } from "./event-schedule-fields";
import { TagPicker } from "./tag-picker";

const copy = {
  create: {
    submit: "Create draft",
    pending: "Creating your draft…",
    complete: "Opening your draft…",
    eyebrow: "Ready when you are",
    title: "Saved as a draft.",
    note: "Creating your event saves a private draft. Nobody else can see it until you publish.",
    timezoneHint: "We’ve suggested your current timezone.",
  },
  edit: {
    submit: "Save changes",
    pending: "Saving…",
    complete: "Opening your event…",
    eyebrow: "Keep it current",
    title: "Save your changes.",
    note: "Only the details you change are updated. The event stays a draft until you publish it.",
    timezoneHint: "Times are shown in the event’s timezone.",
  },
} satisfies Record<EventFormMode, Record<string, string>>;

interface EventFormSharedProps {
  /** Display details for references already selected in `defaultValues`. */
  initialVenue?: Venue | null;
  initialTags?: Tag[];
  cancelHref?: string;
}

// Create posts a complete event; edit sends only what changed, so it needs the
// original values to compare against.
export type EventFormProps = EventFormSharedProps &
  (
    | {
        mode: "create";
        defaultValues?: Partial<EventFormValues>;
        onSubmit: (payload: EventPayload) => Promise<void>;
      }
    | {
        mode: "edit";
        defaultValues: EventFormValues;
        onSubmit: (payload: EventUpdatePayload) => Promise<void>;
      }
  );

function FormSection({
  number,
  eyebrow,
  title,
  description,
  delay = 0,
  children,
}: {
  number: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  delay?: number;
  children: ReactNode;
}) {
  const headingId = `event-form-section-${number}`;
  return (
    <Reveal delay={delay}>
      <section
        className="event-detail-section event-form-section"
        aria-labelledby={headingId}
      >
        <p className="eyebrow">
          <span className="event-form-number">{number}</span> {eyebrow}
        </p>
        <h2 id={headingId}>{title}</h2>
        <p className="event-form-section-copy">{description}</p>
        {children}
      </section>
    </Reveal>
  );
}

export function EventForm(props: EventFormProps) {
  const {
    mode,
    initialVenue = null,
    initialTags = [],
    cancelHref = ROUTES.MY_EVENTS,
  } = props;
  const text = copy[mode];
  const submitting = useRef(false);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] =
    useState<MutationFeedback<EventFormField> | null>(null);
  const schema = useMemo(() => createEventFormSchema(mode), [mode]);
  // The session gate renders this form only in the browser, so the default
  // timezone never differs between server and client markup.
  const [initialValues] = useState(() =>
    eventFormDefaults(props.defaultValues),
  );
  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initialValues,
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = form;
  const categories = useEventCategories();
  const tags = useController({ control, name: "tagIds" });
  // Controlled, because categories load after the form: an uncontrolled select
  // would drop a prefilled value whose option doesn't exist yet.
  const category = useController({ control, name: "categoryId" });
  const pending = isSubmitting || complete;
  const unchanged = mode === "edit" && !isDirty;
  const serverErrorField = useRef<FieldPath<EventFormValues> | null>(null);

  // Fields are disabled while submitting, so focus waits until they re-enable.
  useEffect(() => {
    if (pending || !serverErrorField.current) return;
    setFocus(serverErrorField.current);
    serverErrorField.current = null;
  }, [pending, setFocus]);

  async function submit(values: EventFormValues) {
    if (submitting.current || complete) return;
    submitting.current = true;
    setFeedback(null);
    try {
      if (props.mode === "edit")
        await props.onSubmit(
          toEventUpdatePayload(values, initialValues, dirtyFields),
        );
      else await props.onSubmit(toEventPayload(values));
      setComplete(true);
    } catch (error) {
      const result = eventMutationFeedback(error);
      const fields = Object.entries(result.fields) as [
        FieldPath<EventFormValues>,
        string,
      ][];
      fields.forEach(([field, message]) =>
        setError(field, { type: "server", message }),
      );
      serverErrorField.current = fields[0]?.[0] ?? null;
      setFeedback(result);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <FormProvider {...form}>
      <form
        className="event-detail-body event-form"
        noValidate
        aria-labelledby="event-form-title"
        aria-busy={pending}
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <fieldset disabled={pending} className="event-form-main">
          <FormSection
            number="01"
            eyebrow="Event details"
            title={
              <>
                What’s the <em>occasion?</em>
              </>
            }
            description="A clear title and a little context help the right people say “I’m in.”"
          >
            <div className="event-form-fields">
              <FormField
                {...register("title")}
                label="Event title"
                placeholder="e.g. Future of AI Conference 2027"
                maxLength={200}
                error={errors.title?.message}
                required
              />
              <SelectField
                {...category.field}
                label="Category"
                disabled={categories.isPending || categories.isError}
                error={errors.categoryId?.message}
                required
              >
                <option value="">
                  {categories.isPending
                    ? "Loading categories…"
                    : "Choose a category"}
                </option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              {categories.isError && (
                <p className="explore-reference-error" role="status">
                  Categories couldn’t load.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      void categories.refetch();
                    }}
                  >
                    Try again
                  </button>
                </p>
              )}
              <TextareaField
                {...register("description")}
                label="Description"
                placeholder="What will people experience? Who is it for? What should they bring?"
                rows={7}
                error={errors.description?.message}
                hint="Line breaks are kept, so feel free to use short paragraphs."
                required
              />
            </div>
          </FormSection>

          <FormSection
            number="02"
            eyebrow="Date & time"
            delay={0.07}
            title={
              <>
                When it <em>happens.</em>
              </>
            }
            description="Times are set in the event’s timezone, so guests see them exactly as you plan them."
          >
            <div className="event-form-fields">
              <EventScheduleFields timezoneHint={text.timezoneHint} />
            </div>
          </FormSection>

          <FormSection
            number="03"
            eyebrow="Format & location"
            delay={0.07}
            title={
              <>
                Where people <em>come together.</em>
              </>
            }
            description="Choose how people will join. We’ll only ask for what that format needs."
          >
            <EventFormatFields initialVenue={initialVenue} />
          </FormSection>

          <FormSection
            number="04"
            eyebrow="Capacity & tags"
            delay={0.07}
            title={
              <>
                The finishing <em>touches.</em>
              </>
            }
            description="Optional, but helpful. Set a guest limit and add tags so the right people find you."
          >
            <div className="event-form-fields">
              <FormField
                {...register("capacity")}
                label="Capacity (optional)"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="e.g. 120"
                hint="Leave empty if there’s no limit."
                className="event-form-capacity"
                error={errors.capacity?.message}
              />
              <TagPicker
                legend="Tags"
                hint="Help people find your event."
                className="event-form-tags"
                selectedIds={tags.field.value}
                onChange={tags.field.onChange}
                knownTags={initialTags}
                error={errors.tagIds?.message}
              />
            </div>
          </FormSection>
        </fieldset>

        <aside className="event-form-aside" aria-label="Save your event">
          <div className="event-detail-facts">
            <p className="eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <p className="event-form-aside-note">{text.note}</p>
            <EventFormChecklist control={control} />
            {feedback && (
              <div className="event-form-feedback">
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
            )}
            <SubmitButton
              pending={pending}
              disabled={unchanged}
              pendingLabel={complete ? text.complete : text.pending}
            >
              {text.submit}
            </SubmitButton>
            {unchanged && (
              <p className="event-form-unchanged">No changes to save yet.</p>
            )}
            <span className="sr-only" role="status">
              {pending ? text.pending : ""}
            </span>
            <Link href={cancelHref} className="event-form-cancel">
              Cancel
            </Link>
          </div>
        </aside>
      </form>
    </FormProvider>
  );
}

function EventFormChecklist({
  control,
}: {
  control: Control<EventFormValues>;
}) {
  const [
    title,
    categoryId,
    description,
    startAt,
    endAt,
    format,
    venueId,
    platform,
    accessUrl,
  ] = useWatch({
    control,
    name: [
      "title",
      "categoryId",
      "description",
      "startAt",
      "endAt",
      "format",
      "venueId",
      "onlineDetails.platform",
      "onlineDetails.accessUrl",
    ],
  });
  const needsVenue = format !== "ONLINE";
  const needsOnline = format !== "PHYSICAL";
  const items = [
    {
      label: "Title, category & description",
      done: Boolean(title.trim() && categoryId && description.trim()),
    },
    { label: "Start, end & timezone", done: Boolean(startAt && endAt) },
    {
      label:
        needsVenue && needsOnline
          ? "Venue & online access"
          : needsVenue
            ? "Venue"
            : "Online access",
      done: Boolean(
        (!needsVenue || venueId) &&
        (!needsOnline || (platform.trim() && accessUrl.trim())),
      ),
    },
  ];

  return (
    <ul className="event-form-checklist" aria-label="Event essentials">
      {items.map(({ label, done }) => {
        const Icon = done ? Check : Circle;
        return (
          <li key={label} className={done ? "is-done" : undefined}>
            <Icon size={14} aria-hidden="true" />
            <span className="sr-only">{done ? "Complete: " : "To do: "}</span>
            {label}
          </li>
        );
      })}
      <li className="is-optional">
        <Circle size={14} aria-hidden="true" />
        Capacity & tags <span>Optional</span>
      </li>
    </ul>
  );
}
