---
id: models
part: The components
title: System 1 and System 2
tagline: A fast mind for judgments, a slow mind for words. Use both.
kinds: system1, system2
---
PLAIOS splits the model in two, like the psychology it is named after.

- **System 1** answers typed questions instantly: yes/no as a probability, a choice between labels, a score. It cannot write a sentence, and that is the point.
- **System 2** is the generative model. It writes, reasons and calls tools, and it can answer the same typed questions, just slower.

## The contracts

```ts @plaios/core/domain
export type SystemQuestion =
  | { type: "noul"; instructions?: string; criteria?: { true?: unknown; false?: unknown } | null }
  | { type: "choice"; instructions?: string; criteria: Record<string, unknown> }
  | { type: "score"; instructions?: string; criteria: readonly unknown[] };

export type SystemQuestions = Record<string, SystemQuestion>;
export interface SystemAnswer { type?: string; choice?: string; noul?: number; score?: number }

export interface System1 {
  readonly model: string;
  ask(state: Record<string, unknown>, questions: SystemQuestions, options?: { signal?: AbortSignal }): Promise<Record<string, SystemAnswer>>;
}

export interface System2 extends AIProvider {
  ask(state: Record<string, unknown>, questions: SystemQuestions, options?: { signal?: AbortSignal }): Promise<Record<string, SystemAnswer>>;
}

export interface AIProvider {
  readonly provider: string; readonly model: string; readonly settings: Readonly<AIModelSettings>;
  processInput(input: AIInput, options?: AIProcessOptions): Promise<AIProcessResult>;
  functionCall<T>(input: string, definition: AIFunctionDefinition<T>, options?: Omit<AIProcessOptions, "stream">): Promise<AIFunctionCallResult<T>>;
  processWithFunctions(input: AIInput, definitions: readonly AIExecutableFunctionDefinition[], options?: AIFunctionProcessOptions): Promise<AIProcessResult>;
}
```

## Using them from any plugin

Declare what you need and it appears in your options:

```yaml agent-os.package.yaml
    required: [system2]
    optional: [system1]
```

```ts src/action.ts
const answers = await (this.options.system1 ?? this.options.system2).ask(
  { request: text, devices: ["kitchen light", "garage door"] },
  {
    isCommand: { type: "noul", instructions: "Is the user asking to change a device?" },
    device: { type: "choice", instructions: "Which device?", criteria: { kitchen: "kitchen light", garage: "garage door" } },
  },
);
if ((answers.isCommand?.noul ?? 0) > 0.7) await this.toggle(answers.device?.choice);
```

That fallback line is the whole philosophy. Try the fast mind, use the slow one when it is missing. Both speak the same question format, so your code does not care which one answered.

## Picking an instance

With several models installed, set `system1Instance` or `system2Instance` in your component config to an instance id. Otherwise the host gives you the one with `config.role: routing`, or the first.

## Writing a provider

Implement `AIProvider` plus `ask` and you are a System 2: Codex, OpenRouter or a local model all fit. `processWithFunctions` owns the tool loop: call the model, run each `execute` it asks for, feed results back, stop after `maxSteps`, and stream the final text when `stream` is true.
