"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

const links = [
  { href: ROUTES.FEATURES, label: "Features" },
  { href: ROUTES.HOW_IT_WORKS, label: "How it works" },
  { href: ROUTES.EXPLORE, label: "Explore" },
];

export function LandingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <header
      className="landing-header"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeMenu();
        }
      }}
    >
      <div className="site-container landing-nav">
        <Brand />
        <nav className="desktop-navigation" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.href === ROUTES.EXPLORE && pathname.startsWith(ROUTES.EXPLORE) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="desktop-account-nav">
          <Link href={ROUTES.LOGIN} className="nav-login">
            Log in
          </Link>
          <ButtonLink href={ROUTES.SIGNUP}>
            Get started <ArrowUpRight size={16} aria-hidden="true" />
          </ButtonLink>
        </div>
        <button
          ref={triggerRef}
          className="mobile-menu-trigger"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation site-container"
          aria-label="Mobile navigation"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu} aria-current={link.href === ROUTES.EXPLORE && pathname.startsWith(ROUTES.EXPLORE) ? "page" : undefined}>
              {link.label}
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          ))}
          <div className="mobile-account-links">
            <Link href={ROUTES.LOGIN} onClick={closeMenu}>
              Log in
            </Link>
            <ButtonLink href={ROUTES.SIGNUP} onClick={closeMenu}>
              Get started <ArrowUpRight size={16} aria-hidden="true" />
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
