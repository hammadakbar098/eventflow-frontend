export function EventDetailSkeleton() {
  return (
    <div
      className="site-container event-detail"
      role="status"
      aria-label="Loading event details"
    >
      <span className="sr-only">Getting the experience ready.</span>
      <div aria-hidden="true">
        <div className="event-detail-backrow">
          <div className="event-skeleton h-3 w-28 rounded" />
        </div>
        <div className="event-detail-heading">
          <div>
            <div className="mb-6 flex gap-2">
              <div className="event-skeleton h-8 w-24 rounded-full" />
              <div className="event-skeleton h-8 w-28 rounded-full" />
            </div>
            <div className="space-y-4">
              <div className="event-skeleton h-12 w-full rounded-md sm:h-18" />
              <div className="event-skeleton h-12 w-3/4 rounded-md sm:h-18" />
            </div>
          </div>
          <div className="space-y-4 pb-2">
            <div className="event-skeleton h-3 w-20 rounded" />
            <div className="event-skeleton h-6 w-52 max-w-full rounded" />
            <div className="event-skeleton h-4 w-40 max-w-full rounded" />
          </div>
        </div>
        <div className="event-detail-cover event-skeleton" />
        <div className="event-detail-body">
          <div className="space-y-8">
            <div className="event-skeleton h-4 w-20 rounded" />
            <div className="event-skeleton h-10 w-3/5 rounded" />
            <div className="space-y-3">
              {["100%", "96%", "100%", "74%"].map((width, index) => (
                <div
                  key={index}
                  className="event-skeleton h-4 rounded"
                  style={{ width }}
                />
              ))}
            </div>
            <div className="event-skeleton mt-12 h-44 rounded-2xl" />
          </div>
          <div className="event-detail-facts space-y-7">
            <div className="event-skeleton h-5 w-32 rounded" />
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-3">
                <div className="event-skeleton h-3 w-20 rounded" />
                <div className="event-skeleton h-5 w-full rounded" />
                <div className="event-skeleton h-3 w-3/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
