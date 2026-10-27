export type OutputChannel = "cli" | (string & {});

export type OutputContent = string | AsyncIterable<string>;

/**
 * A transport-neutral output destination. Supporting both content shapes keeps
 * streaming a runtime choice rather than an adapter-specific behavior.
 */
export interface OutputInterface {
  readonly channel: OutputChannel;
  /** Human-readable routing guidance for an orchestrator. */
  readonly description?: string;
  /** How replies must be formatted for this destination (plain text, markdown, a UI language); given to the model. */
  readonly instructions?: string;
  write(content: OutputContent): Promise<void>;
}
