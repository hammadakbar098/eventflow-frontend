"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { useSignOut } from "@/features/auth/hooks/use-auth-mutations";
import { useHasSession } from "@/features/auth/hooks/use-session";

const links = [
  { href: ROUTES.FEATURES, label: "Features" },
  { href: ROUTES.HOW_IT_WORKS, label: "How it works" },
  { href: ROUTES.EXPLORE, label: "Explore" },
];

export function LandingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hasSession = useHasSession();
  const { signOut, pending: signingOut } = useSignOut();
  const workspaceCurrent = pathname.startsWith(ROUTES.DASHBOARD)
    ? "page"
    : undefined;
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
          {hasSession ? (
            <>
              <ButtonLink
                href={ROUTES.MY_EVENTS}
                aria-current={workspaceCurrent}
              >
                My events <ArrowUpRight size={16} aria-hidden="true" />
              </ButtonLink>
              <AccountMenu />
            </>
          ) : (
            <>
              <Link href={ROUTES.LOGIN} className="nav-login">
                Log in
              </Link>
              <ButtonLink href={ROUTES.SIGNUP}>
                Get started <ArrowUpRight size={16} aria-hidden="true" />
              </ButtonLink>
            </>
          )}
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
            {hasSession ? (
              <>
                <Link href={ROUTES.ACCOUNT} onClick={closeMenu}>
                  Account
                </Link>
                <button
                  type="button"
                  className="mobile-logout"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                >
                  {signingOut ? "Logging out…" : "Log out"}
                </button>
                <ButtonLink
                  href={ROUTES.MY_EVENTS}
                  onClick={closeMenu}
                  aria-current={workspaceCurrent}
                >
                  My events <ArrowUpRight size={16} aria-hidden="true" />
                </ButtonLink>
              </>
            ) : (
              <>
                <Link href={ROUTES.LOGIN} onClick={closeMenu}>
                  Log in
                </Link>
                <ButtonLink href={ROUTES.SIGNUP} onClick={closeMenu}>
                  Get started <ArrowUpRight size={16} aria-hidden="true" />
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
