import type { AgentLoopEventHandler } from "../agent/agent-loop.js";
import type { InputMessage } from "../input/input-interface.js";
import type { MemoryProposal } from "../memory/memory-proposal.js";
import type {
  OutputChannel,
  OutputInterface,
} from "../output/output-interface.js";

export interface AdditionalOrchestrationOutput {
  outputChannel: OutputChannel;
  /**
   * `response` copies the agent's generated response to this output.
   * `text` writes the route's fixed text instead, which is useful for
   * acknowledging a request on its originating channel.
   */
  content: "response" | "text";
  text?: string;
}

export interface OrchestrationDecision {
  capabilityIds: readonly string[];
  /** Primary destination for progress events and the generated response. */
  outputChannel: OutputChannel;
  /** Extra response copies or channel-specific messages. */
  additionalOutputs?: readonly AdditionalOrchestrationOutput[];
  /** Durable user facts explicitly identified from the current message. */
  memoryProposals?: readonly MemoryProposal[];
  /** Extract durable memories after delivering the response, outside TTFT. */
  deferMemoryProposal?: boolean;
  /**
   * Skip the generative model and execute the selected capabilities with the
   * raw user text. Used for capabilities that interpret natural language themselves.
   */
  bypassModel?: boolean;
  reason?: string;
}

export interface OrchestratorOptions {
  signal?: AbortSignal;
  onEvent?: AgentLoopEventHandler;
}

/**
 * Discovers and selects the capabilities and output destination for one input message.
 * Implementations may use a model, deterministic rules, or both.
 * The agent loop does not rediscover; it only executes selected capability IDs.
 */
export interface Orchestrator {
  orchestrate(
    message: InputMessage,
    outputs: readonly OutputInterface[],
    options?: OrchestratorOptions,
  ): Promise<OrchestrationDecision>;
  proposeMemory?(
    message: InputMessage,
    options?: OrchestratorOptions,
  ): Promise<readonly MemoryProposal[]>;
}
