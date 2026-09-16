import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { ROUTES } from "@/constants/routes";
import { AuthVisual } from "./auth-visual";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="mx-auto grid min-h-svh max-w-[1680px] lg:grid-cols-2"
    >
      <div className="hidden p-5 pr-0 lg:block">
        <AuthVisual />
      </div>
      <div className="flex min-w-0 flex-col px-6 py-7 sm:px-12 lg:px-14 xl:px-24">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <Link
            href={ROUTES.HOME}
            className="flex min-h-11 items-center gap-2 text-xs text-muted hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to home</span>
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <noscript>
            <p className="mb-5 rounded-xl bg-lavender p-4 text-sm">
              Please enable JavaScript to securely use the login and signup
              forms.
            </p>
          </noscript>
          {children}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-5 text-[10px] text-muted">
          <p>© {new Date().getFullYear()} EventFlow</p>
          <p>A little closer to something great.</p>
        </div>
      </div>
    </main>
  );
}
