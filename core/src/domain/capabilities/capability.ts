import type { CapabilityManifest } from "./capability-manifest.js";
import type { CapabilityResult } from "./capability-result.js";
import type { UIComponentSpec } from "./ui-component.js";

export interface CapabilityExecutionContext {
  runId: string;
  callId: string;
  sessionId?: string;
  userId?: string;
  startedAt: Date;
  signal?: AbortSignal;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface Capability<TInput = unknown, TOutput = unknown> {
  readonly manifest: CapabilityManifest;
  /**
   * Optional startup hook for capabilities that need to prepare native
   * resources or request host permissions before the agent starts listening.
   */
  initialize?(): Promise<void>;
  execute(
    input: TInput,
    context: CapabilityExecutionContext,
  ): Promise<CapabilityResult<TOutput>>;
  /**
   * The chat components the model may write into an answer. Return `[]` when there are none.
   * This is the only place the host reads them from; the web module pairs each with a renderer.
   */
  uiComponents(): readonly UIComponentSpec[];
  /**
   * Markdown the agent reads on demand (through `read_capability_docs`) before using this capability:
   * when to use it and when not, how the inputs work, limits, and a few examples.
   * The host appends config fields, input schema and chat components itself, so do not repeat them.
   */
  docs(): string;
}

export type CapabilityType =
  | "action"
  | "agent"
  | "orchestrator"
  | "discovery"
  | "database"
  | "memory"
  | "system1"
  | "system2"
  | "env"
  | "input"
  | "output";
