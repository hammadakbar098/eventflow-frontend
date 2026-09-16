export const eventCategories = [
  "All experiences",
  "Arts & culture",
  "Food & drink",
  "Talks & ideas",
] as const;
export type EventCategory = (typeof eventCategories)[number];

export const inspirationEvents = [
  {
    id: "art-after-hours",
    title: "A different point of view.",
    category: "Arts & culture",
    format: "Gallery evenings & creative gatherings",
    image: "/images/event-art.jpg",
    imageAlt: "A close-up of a richly detailed classical painting",
    description:
      "Turn a little curiosity into a shared experience. Think unhurried gallery evenings, conversations with local artists, and a room full of new perspectives.",
    idea: "Start with a creative space and an open invitation.",
  },
  {
    id: "supper-club",
    title: "A seat at the table.",
    category: "Food & drink",
    format: "Supper clubs & shared plates",
    image: "/images/event-dinner.jpg",
    imageAlt:
      "A dinner table decorated with flowers and carefully arranged place settings",
    description:
      "Some of the best connections begin over a good meal. Bring people together around a seasonal menu, a favorite neighborhood spot, or your very own supper club.",
    idea: "Start with a table, a menu, and people you’d like to know.",
  },
  {
    id: "big-ideas",
    title: "Ideas that bring us together.",
    category: "Talks & ideas",
    format: "Conversations & fresh perspectives",
    image: "/images/event-conference.jpg",
    imageAlt:
      "A conference room with tables and a projection screen, ready for guests",
    description:
      "Make room for the conversations that stay with you. From a small community meetup to an inspiring talk, give good ideas a place to meet curious people.",
    idea: "Start with a topic that deserves a conversation.",
  },
] as const;

export type InspirationEvent = (typeof inspirationEvents)[number];
