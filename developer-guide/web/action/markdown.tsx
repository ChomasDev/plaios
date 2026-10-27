import { Check, Copy } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

const LIST_ITEM = /^\s*([-*]|\d+\.)\s+/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;

/**
 * The guide's markdown, rendered as React nodes so nothing is ever injected as HTML.
 * Supports what the chapters use: headings (with anchors), paragraphs, lists, fenced code,
 * tables, `> **Label** text` callouts, and inline bold, italics, code and links.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.trim().split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const fence = /^```(\w+)?(?:\s+(.+))?$/.exec(line);
    if (fence) {
      const code: string[] = [];
      while (++index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index]!);
      blocks.push(<CodeBlock key={index} language={fence[1]} title={fence[2]} code={code.join("\n")} />);
      continue;
    }
    if (TABLE_ROW.test(line)) {
      const rows: string[][] = [];
      while (index < lines.length && TABLE_ROW.test(lines[index]!)) rows.push(cells(lines[index++]!));
      index -= 1;
      blocks.push(<Table key={index} rows={rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)))} />);
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]!.startsWith(">")) quote.push(lines[index++]!.replace(/^>\s?/, ""));
      index -= 1;
      blocks.push(<Callout key={index} text={quote.join(" ")} />);
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length && LIST_ITEM.test(lines[index]!)) items.push(lines[index++]!.replace(LIST_ITEM, ""));
      index -= 1;
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={index} className={`dg-list ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</List>);
      continue;
    }
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = (["h2", "h3", "h4"] as const)[heading[1]!.length - 2]!;
      blocks.push(<Tag key={index} id={slug(heading[2]!)} className={`dg-${Tag}`}>{inline(heading[2]!)}</Tag>);
      continue;
    }
    if (line.trim()) blocks.push(<p key={index} className="dg-p">{inline(line)}</p>);
  }
  return <>{blocks}</>;
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[`*]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function CodeBlock({ language, title, code }: { language?: string; title?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return <figure className="dg-code">
    <figcaption>
      <span>{title ?? language ?? "code"}</span>
      <button type="button" onClick={() => void copy()} aria-label="Copy code" className="dg-copy">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}
      </button>
    </figcaption>
    <pre><code>{code}</code></pre>
  </figure>;
}

/** `> **Tip** text` becomes a tinted box with "Tip" as its label. */
function Callout({ text }: { text: string }) {
  const label = /^\*\*([^*]+)\*\*\s*/.exec(text);
  const tone = label?.[1]?.toLowerCase() ?? "note";
  return <aside className={`dg-callout is-${tone.replace(/[^a-z]/g, "")}`}>
    {label ? <strong>{label[1]}</strong> : null}
    <span>{inline(label ? text.slice(label[0].length) : text)}</span>
  </aside>;
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  if (!head) return null;
  return <div className="dg-table"><table>
    <thead><tr>{head.map((cell, i) => <th key={i}>{inline(cell)}</th>)}</tr></thead>
    <tbody>{body.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{inline(cell)}</td>)}</tr>)}</tbody>
  </table></div>;
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function inline(text: string): ReactNode {
  return text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) return <Link key={index} label={link[1]!} href={link[2]!} />;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="dg-inline-code">{part.slice(1, -1)}</code>;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** In-guide anchors (`#memory`) scroll; http(s) links open a new tab; anything else stays text. */
function Link({ label, href }: { label: string; href: string }) {
  if (href.startsWith("#")) return <a href={href} onClick={(event) => { event.preventDefault(); document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="dg-link">{label}</a>;
  if (!/^https?:\/\//i.test(href)) return <>{label}</>;
  return <a href={href} target="_blank" rel="noreferrer noopener" className="dg-link">{label}</a>;
}
