import { useState } from "react";

import { EDGES, KIND_INFO, MESSAGE_PATH, NODES, type DiagramEdge, type DiagramNode, type Kind } from "./diagram-model.js";

/** The map of Agent OS: point at a part to light up who it talks to; click it to read its chapter. */
export function ArchitectureMap({ onOpen }: { onOpen(kind: Kind): void }) {
  const [active, setActive] = useState<Kind>();
  const linked = (edge: DiagramEdge) => edge.from === active || edge.to === active;
  const near = (kind: Kind) => !active || kind === active || EDGES.some((edge) => linked(edge) && (edge.from === kind || edge.to === kind));
  return <div className="dg-map">
    <svg viewBox="0 50 960 480" className="h-auto w-full min-w-[720px] select-none" onMouseLeave={() => setActive(undefined)} role="group" aria-label="How Agent OS components talk to each other">
      <defs>
        <marker id="dg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9Z" className="fill-foreground/30" /></marker>
        <marker id="dg-arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9Z" className="fill-primary" /></marker>
      </defs>
      {EDGES.map((edge, index) => <Edge key={`${edge.from}-${edge.to}`} edge={edge} index={index} on={linked(edge)} dim={Boolean(active) && !linked(edge)} />)}
      <circle r="4" className="dg-pulse fill-primary"><animateMotion dur="3.6s" repeatCount="indefinite" path={MESSAGE_PATH} /></circle>
      <circle r="3" className="dg-pulse fill-primary/60"><animateMotion dur="3.6s" begin="1.8s" repeatCount="indefinite" path={MESSAGE_PATH} /></circle>
      {NODES.map((node, index) => <Node key={node.kind} node={node} index={index} active={active === node.kind} dim={!near(node.kind)} onActivate={() => setActive(node.kind)} onOpen={() => onOpen(node.kind)} />)}
    </svg>
  </div>;
}

function Edge({ edge, index, on, dim }: { edge: DiagramEdge; index: number; on: boolean; dim: boolean }) {
  return <g className="dg-fade" opacity={dim ? 0.25 : 1}>
    <path
      d={edge.d}
      fill="none"
      pathLength={1}
      strokeWidth={on ? 2 : 1.5}
      markerEnd={on ? "url(#dg-arrow-on)" : "url(#dg-arrow)"}
      className={`dg-draw ${on ? "stroke-primary" : edge.quiet ? "stroke-foreground/15" : "stroke-foreground/25"}`}
      style={{ animationDelay: `${250 + index * 40}ms` }}
    />
    {on ? <path d={edge.d} fill="none" strokeWidth="2" strokeDasharray="4 6" className="dg-flow stroke-primary-foreground/70" /> : null}
    {on ? <text x={edge.lx} y={edge.ly} textAnchor="middle" stroke="var(--background)" strokeWidth="5" paintOrder="stroke" className="dg-label fill-primary text-[11px] font-medium">{edge.label}</text> : null}
  </g>;
}

function Node({ node, index, active, dim, onActivate, onOpen }: { node: DiagramNode; index: number; active: boolean; dim: boolean; onActivate(): void; onOpen(): void }) {
  const info = KIND_INFO[node.kind];
  const Icon = info.icon;
  const iconY = node.y + (node.h - 30) / 2;
  return <g
    role="button"
    tabIndex={0}
    aria-label={`${info.label}: ${info.role}. Open its chapter.`}
    onMouseEnter={onActivate}
    onFocus={onActivate}
    onClick={onOpen}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}
    className="dg-node cursor-pointer outline-none"
    opacity={dim ? 0.35 : 1}
    style={{ animationDelay: `${index * 35}ms` }}
  >
    <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="16" strokeWidth={active ? 2 : 1.5} className={active ? "fill-primary/10 stroke-primary" : "fill-background stroke-foreground/15"} />
    <rect x={node.x + 12} y={iconY} width="30" height="30" rx="9" className={active ? "fill-primary" : "fill-primary/12"} />
    <Icon x={node.x + 19} y={iconY + 7} width={16} height={16} strokeWidth={2} className={active ? "text-primary-foreground" : "text-primary"} />
    <text x={node.x + 52} y={node.wide ? node.y + 22 : node.y + 28} className="fill-foreground text-[13px] font-medium">{info.label}</text>
    <text x={node.x + 52} y={node.wide ? node.y + 38 : node.y + 46} className="fill-muted-foreground text-[11px]">{info.role}</text>
  </g>;
}
