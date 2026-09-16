import type { EventFilters } from "../types/event.types";
export const eventKeys = {
  all: ["events"] as const,
  list: (filters: EventFilters) => ["events", "list", filters] as const,
  detail: (slug: string) => ["events", "detail", slug] as const,
  categories: () => ["events", "categories"] as const,
  tags: (search = "") =>
    ["events", "tags", search.trim().slice(0, 100)] as const,
};
