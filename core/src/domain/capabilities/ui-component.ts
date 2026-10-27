/** One positional argument of a chat component, as the model writes it in OpenUI Lang. */
export interface UIComponentProp {
  name: string;
  type: "string" | "string[]" | "number" | "boolean";
  optional?: boolean;
  description?: string;
}

/**
 * A component the model may write into a chat answer, e.g. `HomeCameras("garage")`.
 * The capability returns the spec; its web module exports a renderer with the same `name` in `openui`.
 */
export interface UIComponentSpec {
  name: string;
  description: string;
  props: readonly UIComponentProp[];
}
