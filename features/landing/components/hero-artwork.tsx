"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/ui/brand";
import { easeOutExpo } from "@/animations/variants";

export function HeroArtwork() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [16, -16]);
  const ticketY = useTransform(scrollYProgress, [0, 1], [20, -24]);

  return (
    <div className="hero-artwork" ref={ref}>
      <motion.div
        className="hero-photo-frame"
        initial={reduced ? false : { opacity: 0, y: 35, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 1.1, ease: easeOutExpo, delay: 0.15 }}
      >
        <motion.div className="hero-photo" style={{ y: reduced ? 0 : imageY }}>
          <Image
            src="/images/event-crowd.jpg"
            alt="A crowd coming together under the lights at a live concert"
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1100px) 45vw, 42vw"
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>
        <div className="hero-photo-shade" />
        <div className="hero-photo-label">
          <span className="eyebrow">A moment worth showing up for</span>
          <p>
            Be there.
            <br />
            Feel everything.
          </p>
        </div>
        <div className="hero-photo-corner" aria-hidden="true">
          <ArrowUpRight size={25} strokeWidth={1.5} />
        </div>
      </motion.div>
      <motion.div
        className="hero-stamp"
        initial={reduced ? false : { opacity: 0, scale: 0.7, rotate: -35 }}
        animate={{ opacity: 1, scale: 1, rotate: -13 }}
        transition={{ duration: 0.85, delay: 0.5, ease: easeOutExpo }}
        aria-hidden="true"
      >
        <span>GOOD TIMES</span>
        <BrandMark className="size-9" />
        <span>START HERE</span>
      </motion.div>
      <motion.div
        className="hero-ticket-wrap"
        style={{ y: reduced ? 0 : ticketY }}
        initial={reduced ? false : { opacity: 0, x: -25 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.4, ease: easeOutExpo }}
      >
        <div
          className="hero-ticket"
          aria-label="Illustrative EventFlow ticket: an open invitation to your next good memory"
        >
          <div className="ticket-top">
            <span className="eyebrow">Your next good memory</span>
            <BrandMark className="size-5" />
          </div>
          <p>
            You had
            <br />
            to be there.
          </p>
          <div className="ticket-bottom">
            <span>
              AN OPEN INVITATION
              <br />
              <strong>TO SOMETHING GOOD</strong>
            </span>
            <div className="ticket-barcode" aria-hidden="true" />
          </div>
        </div>
      </motion.div>
      <span className="hero-side-note" aria-hidden="true">
        LESS SCREEN TIME. MORE YOU-HAD-TO-BE-THERE.
      </span>
    </div>
  );
}
