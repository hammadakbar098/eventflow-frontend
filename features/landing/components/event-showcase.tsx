"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { easeOutExpo } from "@/animations/variants";
import { trapDialogFocus } from "@/utils/trap-dialog-focus";
import {
  eventCategories,
  inspirationEvents,
  type EventCategory,
  type InspirationEvent,
} from "@/features/landing/data";

export function EventShowcase() {
  const [category, setCategory] = useState<EventCategory>("All experiences");
  const [selected, setSelected] = useState<InspirationEvent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();
  const visibleEvents = inspirationEvents.filter(
    (event) => category === "All experiences" || event.category === category,
  );

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  function preview(event: InspirationEvent, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelected(event);
    dialogRef.current?.showModal();
  }

  return (
    <section
      id="explore"
      className="site-container explore-section"
      aria-labelledby="explore-heading"
    >
      <Reveal className="explore-heading-row">
        <div>
          <p className="eyebrow">Out of the ordinary. Into your calendar.</p>
          <h2 id="explore-heading" className="section-heading">
            Find your next
            <br />
            <em>“you had to be there.”</em>
          </h2>
        </div>
        <p>
          A taste of what’s possible.
          <br />
          Explore ideas for your next gathering.
        </p>
      </Reveal>
      <div
        className="event-filters"
        role="group"
        aria-label="Filter event inspiration by category"
      >
        {eventCategories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={
              category === item ? "event-filter is-active" : "event-filter"
            }
          >
            {item}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {visibleEvents.length} inspiration{" "}
        {visibleEvents.length === 1 ? "idea" : "ideas"} shown
      </p>
      <div className="event-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleEvents.map((event) => (
            <motion.article
              key={event.id}
              layout={!reduced}
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: easeOutExpo }}
              className="event-card"
            >
              <button
                className="event-card-button"
                type="button"
                onClick={(click) => preview(event, click.currentTarget)}
                aria-label={`Explore ${event.title}`}
              >
                <div className="event-image">
                  <Image
                    src={event.image}
                    alt={event.imageAlt}
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                  />
                  <span className="event-category">{event.category}</span>
                  <span className="event-card-arrow" aria-hidden="true">
                    <ArrowUpRight size={22} />
                  </span>
                </div>
                <div className="event-card-info">
                  <span className="eyebrow">Gathering inspiration</span>
                  <h3>{event.title}</h3>
                  <p>{event.format}</p>
                </div>
              </button>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
      <div className="explore-bottom">
        <span>There’s a world of reasons to get together.</span>
        <a className="text-link" href={ROUTES.SIGNUP}>
          Make one of your own <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <dialog
        ref={dialogRef}
        className="event-dialog"
        aria-labelledby="event-dialog-title"
        aria-describedby="event-dialog-description"
        onClose={() => {
          setSelected(null);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={trapDialogFocus}
      >
        <div className="event-dialog-inner">
          <button
            className="dialog-close"
            type="button"
            aria-label="Close event preview"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={21} aria-hidden="true" />
          </button>
          {selected && (
            <>
              <div className="dialog-image">
                <Image
                  src={selected.image}
                  alt={selected.imageAlt}
                  fill
                  sizes="(max-width: 600px) 100vw, 600px"
                />
              </div>
              <div className="dialog-copy">
                <p className="eyebrow">
                  {selected.category} · Gathering inspiration
                </p>
                <h2 id="event-dialog-title">{selected.title}</h2>
                <p id="event-dialog-description">{selected.description}</p>
                <div className="dialog-idea">
                  <Sparkles size={18} aria-hidden="true" />
                  <p>{selected.idea}</p>
                </div>
                <p className="dialog-note">
                  An idea to inspire your own event, with no tickets or
                  scheduled date.
                </p>
                <ButtonLink href={ROUTES.SIGNUP}>
                  Bring your idea to life{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </ButtonLink>
              </div>
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
