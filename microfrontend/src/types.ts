import type { ComponentType } from "react";

export type InterfaceKind =
  | "env"
  | "ai"
  | "discovery"
  | "database"
  | "memory"
  | "orchestrator"
  | "agent"
  | "input"
  | "output"
  | "action";

export interface ComponentInstance {
  instanceId: string;
  kind: InterfaceKind;
  id: string;
  packageId?: string;
  version?: string;
  config: Record<string, unknown>;
}

export interface MicrofrontendProps<TData = unknown> {
  component: ComponentInstance;
  data?: TData;
  onSaveConfig?: (config: Record<string, unknown>) => void | Promise<void>;
}

export type MicrofrontendComponent<TData = unknown> = ComponentType<
  MicrofrontendProps<TData>
>;
