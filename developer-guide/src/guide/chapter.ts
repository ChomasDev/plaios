export type Part = "Start here" | "The components" | "Superpowers";

/** One chapter of the guide: rendered on the page, and returned to the agent by read_developer_guide. */
export interface Chapter {
  id: string;
  part: Part;
  title: string;
  /** One line under the title. */
  tagline: string;
  /** The component kinds this chapter documents, so the map can jump to it. */
  kinds?: readonly string[];
  markdown: string;
}
