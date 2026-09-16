import { Reveal } from "@/components/animation/reveal";
import type { EventSummary } from "../types/event.types";
import { EventCard } from "./event-card";

export function EventGrid({ events }: { events: EventSummary[] }) {
  return (
    <ul className="explore-event-grid" aria-label="Events">
      {events.map((event, index) => (
        <li key={event.id}>
          <Reveal delay={Math.min(index % 3, 2) * 0.055}>
            <EventCard event={event} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
