"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandMark } from "@/components/ui/brand";
import { cn } from "@/utils/cn";
import type { EventImage as EventImageData } from "../types/event.types";
import { resolveEventImage } from "../utils/event-media";

export function EventImage({
  image,
  alt,
  sizes,
  preload = false,
  className,
}: {
  image?: EventImageData | null;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  const src = resolveEventImage(image?.storageKey);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || src === failedSource) {
    return (
      <div
        className={cn("event-image-placeholder", className)}
        role="img"
        aria-label={`${alt} — image not available`}
      >
        <span className="event-placeholder-orbit" aria-hidden="true" />
        <BrandMark className="relative z-1 size-12 opacity-60" />
        <span className="relative z-1 mt-5 text-[10px] font-medium uppercase tracking-[.18em]">
          An experience awaits
        </span>
      </div>
    );
  }
  return (
    <Image
      key={src}
      src={src}
      alt={image?.altText?.trim() || alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn("object-cover", className)}
      onError={() => setFailedSource(src)}
    />
  );
}
