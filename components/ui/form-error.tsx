import { CircleAlert } from "lucide-react";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/5 p-3.5 text-sm leading-relaxed text-danger"
    >
      <CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
