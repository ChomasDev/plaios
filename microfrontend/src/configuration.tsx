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
import { Input } from "./components/input.js";
import { Label } from "./components/label.js";
import { Textarea } from "./components/textarea.js";
import { cn } from "./lib/utils.js";
import { MicrofrontendFrame } from "./frame.js";
import type {
  ComponentInstance,
  ConfigField,
  MicrofrontendProps,
} from "./types.js";

export interface ConfigurationEditorProps {
  component: ComponentInstance;
  onSaveConfig?: MicrofrontendProps["onSaveConfig"];
}

type Draft = Record<string, string | boolean | undefined>;

export function ConfigurationEditor({
  component,
  onSaveConfig,
}: ConfigurationEditorProps) {
  const fields = component.fields ?? [];
  const [mode, setMode] = useState<"form" | "json">(
    fields.length ? "form" : "json",
  );
  const [draft, setDraft] = useState(() => toDraft(component.config, fields));
  const [json, setJson] = useState(() => toJson(component.config));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(toDraft(component.config, component.fields ?? []));
    setJson(toJson(component.config));
    setDirty(false);
    setStatus("idle");
    setError("");
  }, [component.config, component.fields]);

  function current(): Record<string, unknown> {
    return mode === "form"
      ? fromDraft(draft, fields, component.config)
      : parseJson(json);
  }

  function switchMode(next: "form" | "json"): void {
    if (next === mode) return;
    setError("");
    try {
      const config = current();
      if (next === "json") setJson(toJson(config));
      else setDraft(toDraft(config, fields));
      setMode(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function save(): Promise<void> {
    setError("");

    let config: Record<string, unknown>;
    try {
      config = current();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid value");
      return;
    }

    setStatus("saving");
    try {
      if (onSaveConfig) {
        await onSaveConfig(config);
      } else {
        await saveWithDefaultEndpoint(component.instanceId, config);
      }
      setDirty(false);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1_400);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save configuration",
      );
      setStatus("idle");
    }
  }

  const declared = new Set(fields.map((field) => field.key));
  const extraKeys = Object.keys(component.config).filter(
    (key) => !declared.has(key),
  );
  const ordered = [...fields].sort(
    (a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              {fields.length
                ? "Leave a field empty to use its default or environment variable."
                : "This package does not describe its settings, so they are edited as JSON."}
            </CardDescription>
          </div>
          {fields.length ? (
            <div
              role="tablist"
              aria-label="Editor mode"
              className="inline-flex rounded-lg border p-0.5 text-xs"
            >
              {(["form", "json"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => switchMode(item)}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium",
                    mode === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item === "form" ? "Form" : "JSON"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {mode === "form" ? (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {ordered.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={draft[field.key]}
                original={component.config[field.key]}
                onChange={(value) => {
                  setDraft((prev) => ({ ...prev, [field.key]: value }));
                  setDirty(true);
                  setStatus("idle");
                }}
              />
            ))}
            {extraKeys.length ? (
              <p className="text-xs text-muted-foreground">
                Also set: {extraKeys.join(", ")}. Switch to JSON to edit{" "}
                {extraKeys.length === 1 ? "it" : "them"}.
              </p>
            ) : null}
          </form>
        ) : (
          <Textarea
            value={json}
            onChange={(event) => {
              setJson(event.target.value);
              setDirty(true);
              setStatus("idle");
            }}
            spellCheck={false}
            className="min-h-96 resize-y font-mono leading-6"
            aria-label="Component configuration JSON"
          />
        )}
      </CardContent>
      <CardFooter className="justify-between gap-4">
        <p
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-muted-foreground",
          )}
          role={error ? "alert" : undefined}
        >
          {error || (dirty ? "Unsaved changes" : "")}
        </p>
        <Button
          onClick={save}
          disabled={status === "saving" || (!dirty && status !== "saved")}
        >
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

function FieldInput({
  field,
  value,
  original,
  onChange,
}: {
  field: ConfigField;
  value: string | boolean | undefined;
  original: unknown;
  onChange(value: string | boolean): void;
}) {
  const [reveal, setReveal] = useState(false);
  const id = `config-${field.key}`;
  const hasDefault = field.default !== undefined && field.default !== "";
  const hint = [
    hasDefault ? `Default: ${String(field.default)}` : "",
    field.env ? `Env: ${field.env}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (field.type === "boolean") {
    return (
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={typeof value === "boolean" ? value : field.default === true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <div className="space-y-1">
          <Label htmlFor={id}>{humanize(field.key)}</Label>
          {field.description ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {field.description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const text = typeof value === "string" ? value : "";
  const multiline =
    (original !== null && typeof original === "object") ||
    text.includes("\n") ||
    /json/i.test(field.description ?? "");
  const placeholder = hasDefault ? String(field.default) : field.env ? `$${field.env}` : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{humanize(field.key)}</Label>
        {field.required ? (
          <span className="text-xs font-medium text-destructive">Required</span>
        ) : null}
      </div>
      {field.description ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {field.description}
        </p>
      ) : null}
      {multiline ? (
        <Textarea
          id={id}
          value={text}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 resize-y font-mono text-xs leading-5"
        />
      ) : (
        <div className="flex gap-2">
          <Input
            id={id}
            type={
              field.type === "secret" && !reveal
                ? "password"
                : field.type === "number"
                  ? "number"
                  : "text"
            }
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.type === "secret" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setReveal((on) => !on)}
            >
              {reveal ? "Hide" : "Show"}
            </Button>
          ) : null}
        </div>
      )}
      {hint ? <p className="font-mono text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function toDraft(
  config: Record<string, unknown>,
  fields: readonly ConfigField[],
): Draft {
  const draft: Draft = {};
  for (const { key, type } of fields) {
    const value = config[key];
    if (value === undefined || value === null) continue;
    if (type === "boolean") draft[key] = value === true || value === "true";
    else draft[key] = typeof value === "object" ? toJson(value) : String(value);
  }
  return draft;
}

function fromDraft(
  draft: Draft,
  fields: readonly ConfigField[],
  original: Record<string, unknown>,
): Record<string, unknown> {
  // Start from the saved config so keys the manifest does not declare survive.
  const config: Record<string, unknown> = { ...original };
  for (const { key, type } of fields) {
    const value = draft[key];
    if (typeof value === "boolean") {
      config[key] = value;
      continue;
    }
    const text = value?.trim() ?? "";
    if (!text) {
      delete config[key];
    } else if (type === "number") {
      const number = Number(text);
      if (!Number.isFinite(number)) throw new Error(`${humanize(key)} must be a number`);
      config[key] = number;
    } else if (original[key] !== null && typeof original[key] === "object") {
      try {
        config[key] = JSON.parse(text);
      } catch {
        throw new Error(`${humanize(key)} must be valid JSON`);
      }
    } else {
      config[key] = value;
    }
  }
  return config;
}

function parseJson(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (reason) {
    throw new Error(reason instanceof Error ? reason.message : "Invalid JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Configuration must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function InstanceSummary({
  component,
}: {
  component: ComponentInstance;
}) {
  return (
    <Card className="h-fit">
      <details className="group">
        <summary className="cursor-pointer list-none p-5 marker:hidden [&::-webkit-details-marker]:hidden">
          <CardTitle className="flex items-center justify-between text-base">
            Technical details
            <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
          </CardTitle>
          <CardDescription className="mt-1.5">IDs, interface and package version.</CardDescription>
        </summary>
        <div className="border-t p-5">
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
        </div>
      </details>
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
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[._\s-]+/)
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
