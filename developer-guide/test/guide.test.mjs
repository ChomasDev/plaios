import assert from "node:assert/strict";
import test from "node:test";

import { DeveloperGuideCapability, GUIDE } from "../dist/src/index.js";

const KINDS = ["env", "system1", "system2", "discovery", "database", "memory", "orchestrator", "agent", "input", "output", "action"];

test("every chapter is well formed and every map box opens one", () => {
  const ids = GUIDE.map((chapter) => chapter.id);
  assert.equal(new Set(ids).size, ids.length, "chapter ids are unique");
  for (const chapter of GUIDE) assert.ok(chapter.markdown.length > 400, `${chapter.id} has real content`);
  for (const kind of KINDS) assert.ok(GUIDE.some((chapter) => chapter.kinds?.includes(kind)), `a chapter covers ${kind}`);
});

test("in-guide links point at chapters that exist", () => {
  const ids = new Set([...GUIDE.map((chapter) => chapter.id), "dg-map-title"]);
  for (const chapter of GUIDE) {
    for (const [, target] of chapter.markdown.matchAll(/\]\(#([^)]+)\)/g)) assert.ok(ids.has(target), `${chapter.id} links to missing #${target}`);
  }
});

test("the agent can list the chapters and read one by id or by kind", async () => {
  const guide = new DeveloperGuideCapability();
  const contents = await guide.execute({ chapter: null });
  assert.equal(contents.success, true);
  assert.equal(contents.data.chapters.length, GUIDE.length);
  const byKind = await guide.execute({ chapter: "system1" });
  assert.match(byKind.data.summary, /System 1 and System 2/);
  const missing = await guide.execute({ chapter: "nope" });
  assert.equal(missing.success, false);
  assert.deepEqual(guide.uiComponents(), []);
});
