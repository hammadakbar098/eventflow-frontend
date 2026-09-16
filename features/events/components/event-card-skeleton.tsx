export function EventCardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="event-skeleton aspect-[4/3] rounded-xl" />
      <div className="event-skeleton h-3 w-28 rounded" />
      <div className="event-skeleton h-6 w-4/5 rounded" />
      <div className="event-skeleton h-4 w-2/3 rounded" />
    </div>
  );
}
export function EventGridSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading events"
      className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <EventCardSkeleton key={index} />
      ))}
      <span className="sr-only">Finding your next experience.</span>
    </div>
  );
}
