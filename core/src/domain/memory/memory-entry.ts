export type MemoryKind = "working" | "semantic" | "episodic" | "procedural";

export interface MemoryEntry<T = unknown> {
  id: string;
  kind: MemoryKind;
  content: T;
  /** Legacy creation timestamp. Prefer addedMemoryDate for new durable memories. */
  createdAt: Date;
  /** When this memory was added to the store. */
  addedMemoryDate?: Date;
  /** When the remembered fact happened, when the source provides a date. */
  factDate?: Date;
  userId?: string;
  sessionId?: string;
  updatedAt?: Date;
  importance?: number;
  confidence?: number;
  metadata?: Readonly<Record<string, unknown>>;
}
