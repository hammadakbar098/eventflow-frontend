import Link from "next/link";
export function AuthFooter({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-7 text-center text-sm text-muted">
      {prompt}{" "}
      <Link
        href={href}
        className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
      >
        {label}
      </Link>
    </p>
  );
}
