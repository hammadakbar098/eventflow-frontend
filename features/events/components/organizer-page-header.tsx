import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { BrandMark } from "@/components/ui/brand";

export function OrganizerBackRow({
  href,
  label,
  eyebrow,
}: {
  href: string;
  label: string;
  eyebrow: string;
}) {
  return (
    <div className="event-detail-backrow">
      <Link href={href}>
        <ArrowLeft size={15} aria-hidden="true" />
        {label}
      </Link>
      <span className="eyebrow">{eyebrow}</span>
    </div>
  );
}

/** The editorial intro shared by the Create and Edit event pages. */
export function EventFormPageHeader({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: ReactNode;
  note: ReactNode;
}) {
  return (
    <section className="explore-intro" aria-labelledby="event-form-title">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="event-form-title">{title}</h1>
      </Reveal>
      <Reveal delay={0.08} className="explore-intro-note">
        <BrandMark className="size-10" />
        <p>{note}</p>
      </Reveal>
    </section>
  );
}
