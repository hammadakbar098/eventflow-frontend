import type { EventFilters, MyEventFilters } from "../types/event.types";

const referenceSearch = (search: string) => search.trim().slice(0, 100);

export const eventKeys = {
  all: ["events"] as const,
  lists: () => ["events", "list"] as const,
  list: (filters: EventFilters) => ["events", "list", filters] as const,
  detail: (slug: string) => ["events", "detail", slug] as const,
  categories: () => ["events", "categories"] as const,
  tags: (search = "") => ["events", "tags", referenceSearch(search)] as const,
  mine: () => ["events", "mine"] as const,
  mineLists: () => ["events", "mine", "list"] as const,
  mineList: (filters: MyEventFilters) =>
    ["events", "mine", "list", filters] as const,
  mineDetail: (slug: string) => ["events", "mine", "detail", slug] as const,
  venues: () => ["events", "venues"] as const,
  venueSearch: (search = "") =>
    ["events", "venues", referenceSearch(search)] as const,
};
