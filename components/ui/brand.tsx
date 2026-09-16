import Link from "next/link";
import { APP_NAME } from "@/constants/brand";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <path
        d="M16 2v28M2 16h28M6.1 6.1l19.8 19.8M6.1 25.9 25.9 6.1"
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  );
}
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.HOME}
      aria-label={`${APP_NAME} home`}
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.055em]",
        className,
      )}
    >
      <BrandMark />
      {APP_NAME.toLowerCase()}
      <span className="mb-3 -ml-1 text-[8px] tracking-normal">®</span>
    </Link>
  );
}
