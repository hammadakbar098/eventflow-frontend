import { Reveal } from "@/components/animation/reveal";
import type { EventMedia } from "../types/event.types";
import { EventImage } from "./event-image";

export function EventGallery({
  images,
  title,
}: {
  images: EventMedia[];
  title: string;
}) {
  if (!images.length) return null;

  return (
    <Reveal>
      <section
        className="event-detail-gallery"
        aria-labelledby="gallery-heading"
      >
        <div className="event-detail-gallery-heading">
          <div>
            <p className="eyebrow">In the picture</p>
            <h2 id="gallery-heading">
              A closer <em>look.</em>
            </h2>
          </div>
          <p>
            {images.length} {images.length === 1 ? "image" : "images"}
          </p>
        </div>
        <div className="event-detail-gallery-grid">
          {images.map((image, index) => (
            <figure key={image.id}>
              <EventImage
                image={image}
                alt={`${title}, gallery image ${index + 1}`}
                sizes={
                  index === 0 && images.length % 2 !== 0
                    ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1536px) calc(100vw - 96px), 1440px"
                    : "(max-width: 639px) calc(100vw - 40px), (max-width: 767px) calc(50vw - 30px), (max-width: 1536px) calc(50vw - 60px), 708px"
                }
              />
              <span className="event-detail-gallery-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </figure>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
