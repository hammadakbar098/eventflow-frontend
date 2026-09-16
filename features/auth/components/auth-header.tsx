export function AuthHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-[1.12] tracking-[-0.055em]">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
    </header>
  );
}
