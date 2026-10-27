import type { AIProvider } from "../ai/ai-provider.js";

/** A yes/no question; answered with the probability of yes. */
export interface NoulQuestion {
  type: "noul";
  instructions?: unknown;
  criteria?: { true?: unknown; false?: unknown } | null;
}

/** A question choosing one of the labels in `criteria`. */
export interface ChoiceQuestion {
  type: "choice";
  instructions?: unknown;
  criteria: Record<string, unknown>;
}

/** A question scored against an ordered rubric, from 0 to `criteria.length - 1`. */
export interface ScoreQuestion {
  type: "score";
  instructions?: unknown;
  criteria: readonly unknown[];
}

export type SystemQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export type SystemQuestions = Record<string, SystemQuestion>;

export interface SystemAnswer {
  type?: string;
  choice?: string;
  noul?: number;
  score?: number;
}

export type SystemAnswers = Record<string, SystemAnswer>;

export interface SystemAskOptions {
  signal?: AbortSignal;
}

/** Fast typed judgments about `state` (for example TypeSafe Jev). Optional for plugins. */
export interface System1 {
  readonly model: string;
  ask(state: Record<string, unknown>, questions: SystemQuestions, options?: SystemAskOptions): Promise<SystemAnswers>;
}

/** The generative model. Answers the same typed questions as System 1, more slowly. */
export interface System2 extends AIProvider {
  ask(state: Record<string, unknown>, questions: SystemQuestions, options?: SystemAskOptions): Promise<SystemAnswers>;
}
