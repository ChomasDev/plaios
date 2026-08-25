"use client";

import { useEffect, useState } from "react";

import { Button } from "./components/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/card.js";
import { Textarea } from "./components/textarea.js";
import { MicrofrontendFrame } from "./frame.js";
import type {
  ComponentInstance,
  MicrofrontendProps,
} from "./types.js";

export interface ConfigurationEditorProps {
  component: ComponentInstance;
  onSaveConfig?: MicrofrontendProps["onSaveConfig"];
}

export function ConfigurationEditor({
  component,
  onSaveConfig,
}: ConfigurationEditorProps) {
  const [draft, setDraft] = useState(() =>
    JSON.stringify(component.config, null, 2),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(JSON.stringify(component.config, null, 2));
    setStatus("idle");
    setError("");
  }, [component.config]);

  async function save(): Promise<void> {
    setError("");

    let config: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(draft);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Configuration must be a JSON object");
      }
      config = value as Record<string, unknown>;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid JSON");
      return;
    }

    setStatus("saving");
    try {
      if (onSaveConfig) {
        await onSaveConfig(config);
      } else {
        await saveWithDefaultEndpoint(component.instanceId, config);
      }
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1_400);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save configuration",
      );
      setStatus("idle");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component settings</CardTitle>
        <CardDescription>
          Edit the configuration for this interface instance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setStatus("idle");
          }}
          spellCheck={false}
          className="min-h-96 resize-y font-mono leading-6"
          aria-label="Component configuration JSON"
        />
      </CardContent>
      <CardFooter className="justify-between gap-4">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button onClick={save} disabled={status === "saving"}>
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : "Save settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function InstanceSummary({
  component,
}: {
  component: ComponentInstance;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Instance</CardTitle>
        <CardDescription>Runtime identity and package source.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4 text-sm">
          <Field label="Configuration ID" value={component.instanceId} />
          <Field label="Interface" value={component.kind} />
          <Field label="Interface ID" value={component.id} />
          <Field
            label="Package"
            value={component.packageId ?? component.id.split(".")[0] ?? component.id}
          />
          <Field
            label="Version"
            value={component.version ?? "workspace default"}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

export function CapabilityMicrofrontend({
  component,
  onSaveConfig,
}: MicrofrontendProps) {
  return (
    <MicrofrontendFrame
      component={component}
      title={humanize(component.id)}
      description={`Manage the ${component.kind} interface without leaving its package boundary.`}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ConfigurationEditor
          component={component}
          onSaveConfig={onSaveConfig}
        />
        <InstanceSummary component={component} />
      </div>
    </MicrofrontendFrame>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
    </div>
  );
}

function humanize(value: string): string {
  return value
    .split(/[._-]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function saveWithDefaultEndpoint(
  instanceId: string,
  config: Record<string, unknown>,
): Promise<void> {
  const response = await fetch("/api/configuration", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instanceId, config }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "Could not save configuration");
  }
}
