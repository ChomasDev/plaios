import type { ComponentProps } from "react";

import { cn } from "../lib/utils.js";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}
