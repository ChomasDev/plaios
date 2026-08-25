import type { ReactNode } from "react";

import type { ComponentInstance } from "./types.js";

export interface MicrofrontendFrameProps {
  component: ComponentInstance;
  title: string;
  description: string;
  children: ReactNode;
}

export function MicrofrontendFrame({
  component,
  title,
  description,
  children,
}: MicrofrontendFrameProps) {
  return (
    <div className="min-h-[calc(100svh-4rem)] space-y-8 p-5 md:p-8 xl:p-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <span>{component.kind}</span>
          <span className="text-muted-foreground">/</span>
          <code className="normal-case tracking-normal text-muted-foreground">
            {component.instanceId}
          </code>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
          {description}
        </p>
      </header>
      {children}
    </div>
  );
}
