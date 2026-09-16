"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, UserRound } from "lucide-react";
import { easeOutExpo } from "@/animations/variants";
import { ROUTES } from "@/constants/routes";
import { useCurrentUser, useSignOut } from "../hooks/use-auth-mutations";

export function initials(user?: { firstName: string; lastName: string }) {
  return user
    ? `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0)}`.toUpperCase()
    : "";
}

/** The signed-in account disclosure in the site header. */
export function AccountMenu() {
  const id = useId();
  const reduced = useReducedMotion();
  const user = useCurrentUser().data;
  const { signOut, pending } = useSignOut();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : "";

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="account-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="account-menu-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={name ? `Account menu for ${name}` : "Account menu"}
        onClick={() => setOpen(!open)}
      >
        {initials(user) || <UserRound size={18} aria-hidden="true" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={`${id}-panel`}
            className="account-menu-panel"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, ease: easeOutExpo }}
          >
            {user && (
              <div className="account-menu-identity">
                <p>{name}</p>
                <span>{user.email}</span>
              </div>
            )}
            <nav aria-label="Account">
              <Link href={ROUTES.MY_EVENTS} onClick={() => setOpen(false)}>
                My events
              </Link>
              <Link href={ROUTES.ACCOUNT} onClick={() => setOpen(false)}>
                Account
              </Link>
            </nav>
            <button
              type="button"
              className="account-menu-logout"
              disabled={pending}
              onClick={() => void signOut()}
            >
              <LogOut size={15} aria-hidden="true" />
              {pending ? "Logging out…" : "Log out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
