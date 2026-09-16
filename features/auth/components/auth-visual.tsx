"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, AudioLines, Check, MoveUpRight } from "lucide-react";
import { BrandMark } from "@/components/ui/brand";
import { easeOutExpo } from "@/animations/variants";

export function AuthVisual() {
  const reduced = useReducedMotion();
  return (
    <aside
      className="relative flex h-full min-h-[760px] flex-col overflow-hidden rounded-3xl bg-lavender-2 p-10 xl:p-14"
      aria-label="Experiences with EventFlow"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">Made for real-life moments</span>
        <BrandMark className="size-7" />
      </div>
      <h2 className="relative z-10 mt-12 font-display text-[clamp(2.8rem,4.2vw,4.7rem)] font-medium leading-[1.04] tracking-[-0.07em]">
        Good things
        <br />
        happen together<span className="text-muted">.</span>
      </h2>
      <div className="relative mx-auto my-10 w-full max-w-[370px] flex-1">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 32, rotate: -7 }}
          animate={{ opacity: 1, y: 0, rotate: -5 }}
          transition={{ duration: 0.9, ease: easeOutExpo }}
          className="auth-paper relative rounded-2xl bg-white p-3"
        >
          <div className="relative h-[245px] overflow-hidden rounded-lg">
            <Image
              src="/images/event-crowd.jpg"
              alt="A crowd sharing a moment beneath the lights at a live music event"
              fill
              sizes="400px"
              className="object-cover"
              preload
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
              Be there. Be part of it.
            </span>
            <div className="absolute bottom-5 left-5 text-white">
              <AudioLines className="mb-2" size={26} />
              <p className="font-display text-4xl font-semibold tracking-[-0.05em]">
                After hours.
              </p>
              <p className="mt-1 text-xs text-white/80">
                Good music. Better company.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-4">
            <div>
              <p className="eyebrow text-muted">Your next great memory</p>
              <p className="mt-1 text-sm font-semibold">
                One ticket. Endless possibilities.
              </p>
            </div>
            <ArrowUpRight size={22} />
          </div>
        </motion.div>
        <motion.div
          initial={reduced ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: easeOutExpo }}
          className="auth-paper absolute -right-5 top-[220px] flex items-center gap-3 rounded-xl bg-white p-4 xl:-right-10"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-lavender">
            <Check size={17} />
          </span>
          <div>
            <p className="text-xs font-semibold">You’re on the list.</p>
            <p className="mt-1 text-[10px] text-muted">
              Let the experience begin.
            </p>
          </div>
        </motion.div>
      </div>
      <div className="flex items-end justify-between gap-6">
        <p className="max-w-[240px] text-sm leading-6 text-ink-soft">
          For the ones who bring people together. And the ones who show up.
        </p>
        <MoveUpRight size={40} strokeWidth={1} />
      </div>
    </aside>
  );
}
