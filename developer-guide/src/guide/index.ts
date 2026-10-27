import type { Part } from "./chapter.js";
import { CHAPTERS } from "./content.generated.js";

export const PARTS: readonly Part[] = ["Start here", "The components", "Superpowers"];

/** Chapters in reading order: by part, then by file name (guide/NN-*.md). */
export const GUIDE = PARTS.flatMap((part) => CHAPTERS.filter((chapter) => chapter.part === part));
