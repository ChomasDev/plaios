import type { MemoryKind } from "./memory-entry.js";

/**
 * Models may propose memory changes; an application policy decides whether to
 * persist them.
 */
export type MemoryProposal =
  | {
      operation: "remember";
      kind: MemoryKind;
      content: unknown;
      reason: string;
      confidence?: number;
      /** When the proposed fact happened; absent when the source has no date. */
      factDate?: Date;
    }
  | {
      operation: "forget";
      memoryId: string;
      reason: string;
    };
