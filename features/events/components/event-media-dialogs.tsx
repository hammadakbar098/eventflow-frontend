"use client";

import { useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldPath,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import {
  FormField,
  SelectField,
  TextareaField,
} from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  useAddEventMediaMutation,
  useRemoveEventMediaMutation,
  useUpdateEventMediaMutation,
} from "../hooks/use-event-mutations";
import {
  altTextFormSchema,
  EVENT_IMAGE_TYPES,
  eventMediaFormSchema,
  inferImageMimeType,
  type AltTextFormValues,
  type EventMediaFormValues,
} from "../schemas/event-form.schema";
import type { EventMediaType, OrganizerMedia } from "../types/event.types";
import {
  mediaMutationFeedback,
  type MediaFormField,
  type MutationFeedback,
} from "../utils/event-error";
import { EMPTY_MEDIA_FORM, toEventMediaPayload } from "../utils/event-form";
import { resolveEventImage } from "../utils/event-media";
import { EventImage } from "./event-image";
import { EventModal } from "./event-modal";

type Feedback = MutationFeedback<MediaFormField>;

function useMediaRequest(action: string) {
  const running = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  async function run<Values extends FieldValues>(
    request: () => Promise<unknown>,
    setError?: UseFormSetError<Values>,
  ) {
    if (running.current) return false;
    running.current = true;
    setFeedback(null);
    try {
      await request();
      return true;
    } catch (error) {
      const result = mediaMutationFeedback(error, action);
      for (const [field, message] of Object.entries(result.fields))
        setError?.(field as FieldPath<Values>, { type: "server", message });
      setFeedback(result);
      return false;
    } finally {
      running.current = false;
    }
  }
  return { feedback, run };
}

function MediaFeedback({ feedback }: { feedback: Feedback | null }) {
  if (!feedback || Object.keys(feedback.fields).length) return null;
  return (
    <div className="event-modal-feedback">
      <FormError message={feedback.message} />
    </div>
  );
}

const imageTypeLabels: Record<keyof typeof EVENT_IMAGE_TYPES, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
};

export function AddMediaDialog({
  slug,
  type,
  onAdded,
  onClose,
}: {
  slug: string;
  type: EventMediaType;
  onAdded: (message: string) => void;
  onClose: () => void;
}) {
  const mutation = useAddEventMediaMutation(slug);
  const { feedback, run } = useMediaRequest("add this image");
  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    setValue,
    getFieldState,
    control,
    formState: { errors },
  } = useForm<EventMediaFormValues>({
    resolver: zodResolver(eventMediaFormSchema),
    mode: "onTouched",
    defaultValues: EMPTY_MEDIA_FORM,
  });
  const storageKey = useWatch({ control, name: "storageKey" }).trim();
  const previewable = Boolean(resolveEventImage(storageKey));
  const cover = type === "COVER";
  const pending = mutation.isPending;

  return (
    <EventModal
      eyebrow={cover ? "Cover image" : "Gallery"}
      title={cover ? "Add a cover image." : "Add a gallery image."}
      description="Add an image that’s already in your media storage. EventFlow saves its details here; files aren’t uploaded from this page."
      closeLabel={cover ? "Close add cover image" : "Close add gallery image"}
      busy={pending}
      onOpen={() => setFocus("storageKey")}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) =>
            void handleSubmit(async (values) => {
              const added = await run(
                () => mutation.mutateAsync(toEventMediaPayload(values, type)),
                setError,
              );
              if (!added) return;
              onAdded(cover ? "Cover image added." : "Gallery image added.");
              close();
            })(event)
          }
        >
          <fieldset disabled={pending} className="event-modal-fields">
            <FormField
              {...register("storageKey", {
                onChange: (change: React.ChangeEvent<HTMLInputElement>) => {
                  // Suggest the file type until the organizer picks one.
                  if (!getFieldState("mimeType").isDirty)
                    setValue(
                      "mimeType",
                      inferImageMimeType(change.target.value),
                    );
                },
              })}
              label="Storage key"
              placeholder="events/my-event/cover.webp"
              autoComplete="off"
              spellCheck={false}
              hint="The image’s path in your EventFlow media storage."
              error={errors.storageKey?.message}
              required
            />
            <div className="manage-media-preview">
              <EventImage
                image={storageKey ? { storageKey } : null}
                alt="Image preview"
                sizes="(max-width: 639px) calc(100vw - 72px), 560px"
              />
            </div>
            {storageKey && !previewable && (
              <p className="manage-media-preview-note">
                A preview appears once media hosting is connected.
              </p>
            )}
            <TextareaField
              {...register("altText")}
              label="Alt text"
              rows={2}
              className="min-h-24"
              hint="Screen readers read this aloud. Up to 255 characters."
              error={errors.altText?.message}
              required
            />
            <SelectField
              {...register("mimeType")}
              label="File type"
              error={errors.mimeType?.message}
              required
            >
              <option value="">Choose a file type</option>
              {Object.entries(imageTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <details className="manage-media-details">
              <summary>File details (optional)</summary>
              <div className="event-modal-fields">
                <FormField
                  {...register("originalName")}
                  label="Original file name"
                  placeholder="cover.webp"
                  autoComplete="off"
                  error={errors.originalName?.message}
                />
                <div className="event-form-pair">
                  <FormField
                    {...register("width")}
                    label="Width (px)"
                    inputMode="numeric"
                    error={errors.width?.message}
                  />
                  <FormField
                    {...register("height")}
                    label="Height (px)"
                    inputMode="numeric"
                    error={errors.height?.message}
                  />
                </div>
                <FormField
                  {...register("sizeBytes")}
                  label="File size (bytes)"
                  inputMode="numeric"
                  error={errors.sizeBytes?.message}
                />
              </div>
            </details>
          </fieldset>
          <MediaFeedback feedback={feedback} />
          <div className="explore-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              pending={pending}
              pendingLabel="Adding image…"
              className="min-w-44"
            >
              Add image
            </SubmitButton>
          </div>
        </form>
      )}
    </EventModal>
  );
}

export function AltTextDialog({
  slug,
  media,
  onSaved,
  onClose,
}: {
  slug: string;
  media: OrganizerMedia;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const mutation = useUpdateEventMediaMutation(slug);
  const { feedback, run } = useMediaRequest("save the alt text");
  const {
    register,
    handleSubmit,
    setFocus,
    setError,
    formState: { errors, isDirty },
  } = useForm<AltTextFormValues>({
    resolver: zodResolver(altTextFormSchema),
    mode: "onTouched",
    defaultValues: { altText: media.altText?.trim() ?? "" },
  });
  const pending = mutation.isPending;

  return (
    <EventModal
      eyebrow={media.type === "COVER" ? "Cover image" : "Gallery"}
      title="Edit alt text."
      description="Good alt text describes what matters in the image, so everyone gets the same picture."
      closeLabel="Close edit alt text"
      busy={pending}
      onOpen={() => setFocus("altText")}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) =>
            void handleSubmit(async ({ altText }) => {
              const saved = await run(
                () => mutation.mutateAsync({ mediaId: media.id, altText }),
                setError,
              );
              if (!saved) return;
              onSaved("Alt text saved.");
              close();
            })(event)
          }
        >
          <fieldset disabled={pending} className="event-modal-fields">
            <TextareaField
              {...register("altText")}
              label="Alt text"
              rows={3}
              className="min-h-28"
              hint="Up to 255 characters."
              error={errors.altText?.message}
              required
            />
          </fieldset>
          <MediaFeedback feedback={feedback} />
          <div className="explore-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              pending={pending}
              disabled={!isDirty}
              pendingLabel="Saving…"
              className="min-w-44"
            >
              Save alt text
            </SubmitButton>
          </div>
        </form>
      )}
    </EventModal>
  );
}

export function RemoveMediaDialog({
  slug,
  media,
  onRemoved,
  onClose,
}: {
  slug: string;
  media: OrganizerMedia;
  onRemoved: (message: string) => void;
  onClose: () => void;
}) {
  const mutation = useRemoveEventMediaMutation(slug);
  const { feedback, run } = useMediaRequest("remove this image");
  const pending = mutation.isPending;
  const cover = media.type === "COVER";

  return (
    <EventModal
      eyebrow={cover ? "Cover image" : "Gallery"}
      title="Remove this image?"
      description="The image is removed from this event. The file itself stays in your media storage."
      closeLabel="Close remove image"
      busy={pending}
      onClose={onClose}
    >
      {(close) => (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!(await run(() => mutation.mutateAsync(media.id)))) return;
            onRemoved(
              cover ? "Cover image removed." : "Gallery image removed.",
            );
            close();
          }}
        >
          <MediaFeedback feedback={feedback} />
          <div className="explore-dialog-actions">
            <Button variant="secondary" disabled={pending} onClick={close}>
              Keep image
            </Button>
            <SubmitButton
              pending={pending}
              pendingLabel="Removing…"
              variant="danger"
              className="min-w-44"
            >
              Remove image
            </SubmitButton>
          </div>
        </form>
      )}
    </EventModal>
  );
}
