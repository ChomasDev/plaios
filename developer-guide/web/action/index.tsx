"use client";
import type { MicrofrontendProps } from "@plaios/microfrontend";
import { useEffect, useMemo, useState } from "react";

import { GUIDE, PARTS } from "../../src/guide/index.js";
import type { Chapter } from "../../src/guide/chapter.js";
import { ArchitectureMap } from "./diagram.js";
import { Markdown } from "./markdown.js";

/** The guide's page: a hero, the live map, and every chapter with a table of contents that follows the reader. */
export default function DeveloperGuide(_props: MicrofrontendProps) {
  const current = useCurrentChapter(GUIDE);
  const open = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return <div className="dg-page">
    <Hero />
    <section className="dg-map-section" aria-labelledby="dg-map-title">
      <h2 id="dg-map-title" className="dg-section-title">The map</h2>
      <p className="dg-section-lede">Eleven kinds of component, one message path. Point at any box to see who it talks to. Click it to read its chapter.</p>
      <ArchitectureMap onOpen={(kind) => open(GUIDE.find((chapter) => chapter.kinds?.includes(kind))?.id ?? kind)} />
    </section>
    <div className="dg-layout">
      <Contents current={current} onOpen={open} />
      <main className="dg-chapters">
        {GUIDE.map((chapter, index) => <ChapterView key={chapter.id} chapter={chapter} number={index + 1} />)}
      </main>
    </div>
  </div>;
}

function Hero() {
  return <header className="dg-hero">
    <p className="dg-eyebrow">PLAIOS · Developer guide</p>
    <h1>Every part of PLAIOS is a plugin.<br /><span>Including the part you are about to write.</span></h1>
    <p className="dg-lede">The memory, the model, the thing that decides what happens next, the chat you are reading this in: all of it is a package with a manifest, a class and a page. Swap any of them. Add your own. This guide shows you exactly how, down to the bytes the host hands your constructor.</p>
    <ul className="dg-stats">
      <li><strong>11</strong> component kinds</li>
      <li><strong>1</strong> manifest per package</li>
      <li><strong>0</strong> lines of glue code</li>
    </ul>
  </header>;
}

function Contents({ current, onOpen }: { current?: string; onOpen(id: string): void }) {
  return <nav className="dg-toc" aria-label="Chapters">
    {PARTS.map((part) => <div key={part} className="dg-toc-part">
      <p>{part}</p>
      <ul>{GUIDE.filter((chapter) => chapter.part === part).map((chapter) => <li key={chapter.id}>
        <a href={`#${chapter.id}`} aria-current={current === chapter.id ? "true" : undefined} onClick={(event) => { event.preventDefault(); onOpen(chapter.id); }}>{chapter.title}</a>
      </li>)}</ul>
    </div>)}
  </nav>;
}

function ChapterView({ chapter, number }: { chapter: Chapter; number: number }) {
  return <article id={chapter.id} className="dg-chapter" data-chapter={chapter.id}>
    <header>
      <span className="dg-number">{String(number).padStart(2, "0")}</span>
      <div>
        <h2 className="dg-chapter-title">{chapter.title}</h2>
        <p className="dg-tagline">{chapter.tagline}</p>
      </div>
    </header>
    <Markdown text={chapter.markdown} />
  </article>;
}

/** The chapter whose top most recently crossed the upper third of the screen. */
function useCurrentChapter(chapters: readonly Chapter[]): string | undefined {
  const [current, setCurrent] = useState<string>();
  const ids = useMemo(() => chapters.map((chapter) => chapter.id), [chapters]);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setCurrent((visible.target as HTMLElement).dataset.chapter);
    }, { rootMargin: "-15% 0px -70% 0px" });
    for (const id of ids) { const element = document.getElementById(id); if (element) observer.observe(element); }
    return () => observer.disconnect();
  }, [ids]);
  return current;
}
