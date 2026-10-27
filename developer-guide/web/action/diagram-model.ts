import { BookMarked, Brain, Compass, Database, Inbox, KeyRound, Route, Send, Workflow, Wrench, Zap, type LucideIcon } from "lucide-react";

export type Kind = "env" | "system1" | "system2" | "discovery" | "database" | "memory" | "orchestrator" | "agent" | "input" | "output" | "action";
export interface DiagramNode { kind: Kind; x: number; y: number; w: number; h: number; wide?: boolean }
export interface DiagramEdge { from: Kind; to: Kind; d: string; label: string; lx: number; ly: number; quiet?: boolean }

// shortcut: same layout as the host's Settings diagram (app-dynamic architecture-model.ts), copied because plugins cannot import host code; move both into @agent-os/microfrontend when it is next published.
export const KIND_INFO: Record<Kind, { label: string; icon: LucideIcon; role: string }> = {
  input: { label: "Inputs", icon: Inbox, role: "Messages in" },
  memory: { label: "Memory", icon: BookMarked, role: "Remembers" },
  orchestrator: { label: "Orchestrator", icon: Route, role: "Plans the turn" },
  agent: { label: "Agent loop", icon: Workflow, role: "Does the work" },
  output: { label: "Outputs", icon: Send, role: "Answers out" },
  discovery: { label: "Discovery", icon: Compass, role: "Knows every tool" },
  action: { label: "Actions", icon: Wrench, role: "Does things" },
  system1: { label: "Fast model", icon: Zap, role: "Snap judgments" },
  system2: { label: "Model", icon: Brain, role: "Reasons, writes" },
  database: { label: "Database", icon: Database, role: "Private tables per plugin" },
  env: { label: "Environment", icon: KeyRound, role: "Config and secrets" },
};

export const NODES: DiagramNode[] = [
  { kind: "input", x: 20, y: 210, w: 150, h: 64 },
  { kind: "memory", x: 215, y: 210, w: 150, h: 64 },
  { kind: "orchestrator", x: 410, y: 210, w: 150, h: 64 },
  { kind: "agent", x: 605, y: 210, w: 150, h: 64 },
  { kind: "output", x: 800, y: 210, w: 140, h: 64 },
  { kind: "discovery", x: 508, y: 60, w: 150, h: 64 },
  { kind: "action", x: 800, y: 60, w: 140, h: 64 },
  { kind: "system1", x: 410, y: 370, w: 150, h: 64 },
  { kind: "system2", x: 605, y: 370, w: 150, h: 64 },
  { kind: "database", x: 20, y: 470, w: 455, h: 50, wide: true },
  { kind: "env", x: 485, y: 470, w: 455, h: 50, wide: true },
];

export const EDGES: DiagramEdge[] = [
  { from: "input", to: "memory", d: "M170 242H213", label: "message", lx: 192, ly: 232 },
  { from: "memory", to: "orchestrator", d: "M365 242H408", label: "+ context", lx: 387, ly: 232 },
  { from: "orchestrator", to: "agent", d: "M560 242H603", label: "decision", lx: 582, ly: 232 },
  { from: "agent", to: "output", d: "M755 242H798", label: "answer", lx: 777, ly: 232 },
  { from: "output", to: "memory", d: "M870 210C870 158 290 158 290 208", label: "saves both turns", lx: 400, ly: 176, quiet: true },
  { from: "discovery", to: "orchestrator", d: "M548 124C548 168 485 166 485 208", label: "searches", lx: 500, ly: 150 },
  { from: "discovery", to: "agent", d: "M618 124C618 168 680 166 680 208", label: "fetches chosen", lx: 690, ly: 150 },
  { from: "agent", to: "action", d: "M735 210C735 140 760 92 798 92", label: "calls", lx: 770, ly: 140 },
  { from: "action", to: "discovery", d: "M800 80H660", label: "registered in", lx: 730, ly: 72, quiet: true },
  { from: "orchestrator", to: "system1", d: "M470 274V368", label: "yes / no scores", lx: 470, ly: 322 },
  { from: "orchestrator", to: "system2", d: "M530 274C530 330 630 318 645 368", label: "fallback", lx: 590, ly: 318 },
  { from: "agent", to: "system2", d: "M700 274V368", label: "reasoning + tools", lx: 700, ly: 322 },
  { from: "memory", to: "database", d: "M290 274V468", label: "graph", lx: 290, ly: 372 },
  { from: "input", to: "database", d: "M95 274V468", label: "cron jobs", lx: 95, ly: 372, quiet: true },
];

/** The one path every message travels, for the pulse that rides along it. */
export const MESSAGE_PATH = "M170 242H800";
