import type { ComponentType } from "react";

export type InterfaceKind =
  | "env"
  | "system1"
  | "system2"
  | "discovery"
  | "database"
  | "memory"
  | "orchestrator"
  | "agent"
  | "input"
  | "output"
  | "action";

/** One setting declared in the interface's `config` manifest field. */
export interface ConfigField {
  key: string;
  type?: "string" | "number" | "boolean" | "secret";
  required?: boolean;
  default?: unknown;
  description?: string;
  env?: string;
}

export interface ComponentInstance {
  instanceId: string;
  kind: InterfaceKind;
  id: string;
  packageId?: string;
  version?: string;
  config: Record<string, unknown>;
  fields?: readonly ConfigField[];
}

export interface MicrofrontendProps<TData = unknown> {
  component: ComponentInstance;
  data?: TData;
  onSaveConfig?: (config: Record<string, unknown>) => void | Promise<void>;
}

export type MicrofrontendComponent<TData = unknown> = ComponentType<
  MicrofrontendProps<TData>
>;

/** One positional argument of a plugin component the model can call in OpenUI Lang. */
export interface OpenUIPropSpec {
  name: string;
  type: "string" | "string[]" | "number" | "boolean";
  optional?: boolean;
  description?: string;
}

/** A plugin component the model may use in chat answers; the backend publishes the spec, the web module the renderer. */
export interface OpenUIComponentSpec {
  name: string;
  description: string;
  props: readonly OpenUIPropSpec[];
}

export interface OpenUIComponentModule<TData = unknown, TArgs = Record<string, unknown>> extends OpenUIComponentSpec {
  component: ComponentType<MicrofrontendProps<TData> & { args: TArgs; onOpen?(instanceId: string): void }>;
}
