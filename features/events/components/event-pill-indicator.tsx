"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easeOutExpo } from "@/animations/variants";

// The ink pill that slides between the active option in a pill row.
export function EventPillIndicator({ layoutId }: { layoutId: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      layoutId={layoutId}
      className="event-pill-indicator"
      transition={{ duration: reduced ? 0 : 0.35, ease: easeOutExpo }}
      aria-hidden="true"
    />
  );
}
