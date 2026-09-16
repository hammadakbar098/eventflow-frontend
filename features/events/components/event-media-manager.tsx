"use client";

import { useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Images,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReorderEventMediaMutation } from "../hooks/use-event-mutations";
import type {
  EventMediaType,
  OrganizerEvent,
  OrganizerMedia,
} from "../types/event.types";
import { mediaMutationFeedback } from "../utils/event-error";
import { getEventCover, getEventGallery } from "../utils/event-display";
import { EventImage } from "./event-image";
import {
  AddMediaDialog,
  AltTextDialog,
  RemoveMediaDialog,
} from "./event-media-dialogs";

type MediaDialog =
  | { kind: "add"; type: EventMediaType }
  | { kind: "alt" | "remove"; media: OrganizerMedia };

const typeLabels: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
};

function fileSummary(media: OrganizerMedia) {
  return [
    media.originalName,
    media.mimeType && (typeLabels[media.mimeType] ?? media.mimeType),
    media.width && media.height && `${media.width} × ${media.height}`,
    media.sizeBytes &&
      `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(media.sizeBytes / 1024)} KB`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function AltTextPreview({ media }: { media: OrganizerMedia }) {
  const altText = media.altText?.trim();
  return altText ? (
    <p className="manage-media-alt">{altText}</p>
  ) : (
    <p className="manage-media-alt is-missing">Alt text missing</p>
  );
}

export function EventMediaManager({ event }: { event: OrganizerEvent }) {
  const cover = getEventCover(event);
  const gallery = getEventGallery(event);
  const [dialog, setDialog] = useState<MediaDialog | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLElement | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  function open(next: MediaDialog, trigger: HTMLElement) {
    triggerRef.current = trigger;
    setDialog(next);
  }
  function close() {
    setDialog(null);
    const trigger = triggerRef.current;
    if (trigger?.isConnected) trigger.focus();
    else sectionRef.current?.focus();
  }

  return (
    <div
      className="event-detail-story manage-media"
      ref={sectionRef}
      tabIndex={-1}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <section
        className="event-detail-section"
        aria-labelledby="media-cover-heading"
      >
        <div className="manage-media-heading">
          <div>
            <p className="eyebrow">Cover image</p>
            <h2 id="media-cover-heading">
              The first <em>impression.</em>
            </h2>
          </div>
        </div>
        {cover ? (
          <article className="manage-media-cover" aria-label="Cover image">
            <div className="event-detail-cover">
              <EventImage
                image={cover}
                alt={cover.altText?.trim() || `${event.title} cover`}
                sizes="(max-width: 767px) calc(100vw - 40px), 760px"
              />
            </div>
            <div className="manage-media-body">
              <AltTextPreview media={cover} />
              <p className="manage-media-meta">
                {fileSummary(cover) || "No file details"}
              </p>
              <p className="manage-media-key">{cover.storageKey}</p>
              <div className="manage-media-actions">
                <button
                  type="button"
                  className="text-link min-h-11"
                  onClick={(click) =>
                    open({ kind: "alt", media: cover }, click.currentTarget)
                  }
                >
                  Edit alt text
                </button>
                <button
                  type="button"
                  className="manage-media-remove"
                  onClick={(click) =>
                    open({ kind: "remove", media: cover }, click.currentTarget)
                  }
                >
                  Remove cover
                </button>
              </div>
            </div>
          </article>
        ) : (
          <div className="event-state manage-media-empty">
            <ImagePlus size={32} strokeWidth={1.2} aria-hidden="true" />
            <h3>No cover image yet.</h3>
            <p>A cover leads your event on Explore and in My events.</p>
            <Button
              variant="secondary"
              onClick={(click) =>
                open({ kind: "add", type: "COVER" }, click.currentTarget)
              }
            >
              Add cover image <Plus size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </section>

      <section
        className="event-detail-section"
        aria-labelledby="media-gallery-heading"
      >
        <div className="manage-media-heading">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2 id="media-gallery-heading">
              A closer <em>look.</em>
            </h2>
          </div>
          {gallery.length > 0 && (
            <Button
              variant="secondary"
              onClick={(click) =>
                open({ kind: "add", type: "GALLERY" }, click.currentTarget)
              }
            >
              Add image <Plus size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
        {gallery.length ? (
          <GalleryList
            slug={event.slug}
            gallery={gallery}
            onAnnounce={setAnnouncement}
            onEditAlt={(media, trigger) =>
              open({ kind: "alt", media }, trigger)
            }
            onRemove={(media, trigger) =>
              open({ kind: "remove", media }, trigger)
            }
          />
        ) : (
          <div className="event-state manage-media-empty">
            <Images size={32} strokeWidth={1.2} aria-hidden="true" />
            <h3>No gallery images yet.</h3>
            <p>
              Show people the place, the atmosphere and the moments to come.
            </p>
            <Button
              variant="secondary"
              onClick={(click) =>
                open({ kind: "add", type: "GALLERY" }, click.currentTarget)
              }
            >
              Add gallery image <Plus size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </section>

      {dialog?.kind === "add" && (
        <AddMediaDialog
          slug={event.slug}
          type={dialog.type}
          onAdded={setAnnouncement}
          onClose={close}
        />
      )}
      {dialog?.kind === "alt" && (
        <AltTextDialog
          slug={event.slug}
          media={dialog.media}
          onSaved={setAnnouncement}
          onClose={close}
        />
      )}
      {dialog?.kind === "remove" && (
        <RemoveMediaDialog
          slug={event.slug}
          media={dialog.media}
          onRemoved={setAnnouncement}
          onClose={close}
        />
      )}
    </div>
  );
}

function GalleryList({
  slug,
  gallery,
  onAnnounce,
  onEditAlt,
  onRemove,
}: {
  slug: string;
  gallery: OrganizerMedia[];
  onAnnounce: (message: string) => void;
  onEditAlt: (media: OrganizerMedia, trigger: HTMLElement) => void;
  onRemove: (media: OrganizerMedia, trigger: HTMLElement) => void;
}) {
  const mutation = useReorderEventMediaMutation(slug);
  const serverIds = gallery.map((media) => media.id);
  const serverKey = serverIds.join();
  // Local order applies only to the gallery it was made from; once the server
  // returns the saved order, the server order takes over again.
  const [local, setLocal] = useState<{ source: string; ids: string[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  // The order at the end of a drag, read by the drop handler.
  const latest = useRef<string[]>([]);
  const ids = local?.source === serverKey ? local.ids : serverIds;
  const byId = new Map(gallery.map((media) => [media.id, media]));

  function preview(next: string[]) {
    latest.current = next;
    setLocal({ source: serverKey, ids: next });
  }

  function save(next: string[]) {
    if (next.join() === serverKey) return setLocal(null);
    setError(null);
    mutation.mutate(
      next.map((mediaId, sortOrder) => ({ mediaId, sortOrder })),
      {
        onSuccess: () => onAnnounce("Gallery order saved."),
        onError: (failure) => {
          setLocal(null);
          setError(
            mediaMutationFeedback(failure, "save the gallery order").message,
          );
        },
      },
    );
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (mutation.isPending || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    preview(next);
    save(next);
    onAnnounce(`Image moved to position ${target + 1} of ${ids.length}.`);
  }

  return (
    <>
      <p className="manage-media-hint" id="gallery-reorder-hint">
        Drag images to reorder them, or use the move buttons.
      </p>
      {error && (
        <p className="manage-media-error" role="alert">
          {error}
        </p>
      )}
      <Reorder.Group
        axis="y"
        values={ids}
        onReorder={preview}
        className="manage-gallery"
        aria-label="Gallery images"
        aria-describedby="gallery-reorder-hint"
        aria-busy={mutation.isPending}
      >
        {ids.map((id, index) => {
          const media = byId.get(id);
          if (!media) return null;
          return (
            <GalleryItem
              key={id}
              media={media}
              index={index}
              total={ids.length}
              saving={mutation.isPending}
              onDragStart={() => {
                latest.current = ids;
              }}
              onDragEnd={() => save(latest.current)}
              onMove={(offset) => move(index, offset)}
              onEditAlt={onEditAlt}
              onRemove={onRemove}
            />
          );
        })}
      </Reorder.Group>
    </>
  );
}

function GalleryItem({
  media,
  index,
  total,
  saving,
  onDragStart,
  onDragEnd,
  onMove,
  onEditAlt,
  onRemove,
}: {
  media: OrganizerMedia;
  index: number;
  total: number;
  saving: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (offset: -1 | 1) => void;
  onEditAlt: (media: OrganizerMedia, trigger: HTMLElement) => void;
  onRemove: (media: OrganizerMedia, trigger: HTMLElement) => void;
}) {
  const dragControls = useDragControls();
  const position = `image ${index + 1} of ${total}`;
  return (
    <Reorder.Item
      value={media.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="manage-gallery-item"
      whileDrag={{ scale: 1.01 }}
    >
      <span
        className="manage-gallery-handle"
        aria-hidden="true"
        onPointerDown={(pointer) => {
          if (saving) return;
          onDragStart();
          dragControls.start(pointer);
        }}
      >
        <GripVertical size={18} />
      </span>
      <div className="manage-gallery-thumb">
        <EventImage
          image={media}
          alt={media.altText?.trim() || `Gallery ${position}`}
          sizes="(max-width: 639px) calc(100vw - 80px), 160px"
        />
        <span className="event-detail-gallery-number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="manage-media-body">
        <AltTextPreview media={media} />
        <p className="manage-media-meta">
          {fileSummary(media) || "No file details"}
        </p>
        <div className="manage-media-actions">
          <button
            type="button"
            className="text-link min-h-11"
            onClick={(click) => onEditAlt(media, click.currentTarget)}
          >
            Edit alt text
          </button>
          <button
            type="button"
            className="manage-media-remove"
            onClick={(click) => onRemove(media, click.currentTarget)}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="manage-gallery-move">
        <button
          type="button"
          aria-label={`Move ${position} earlier`}
          aria-disabled={index === 0 || saving}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Move ${position} later`}
          aria-disabled={index === total - 1 || saving}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={16} aria-hidden="true" />
        </button>
      </div>
    </Reorder.Item>
  );
}
