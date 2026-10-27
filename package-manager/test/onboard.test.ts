import assert from "node:assert/strict";
import test from "node:test";

import { AI_CHOICES, TOOLS, buildOnboardingConfig, mergeEnv, pickMany } from "../src/onboard.js";

test("builds a config with the base graph plus the picked features", () => {
  const config = buildOnboardingConfig("http://localhost:4873", [AI_CHOICES[0]!, TOOLS[0]!]);
  const ids = config.components.map((component) => component.instanceId);
  assert.ok(ids.includes("agent:agent-loop"));
  assert.ok(ids.includes("ai:codex"));
  assert.ok(ids.includes("action:perplexity-search"));
  assert.equal(new Set(ids).size, ids.length);
});

test("merges env values in place and appends new ones", () => {
  assert.equal(
    mergeEnv("# keys\nA=old\nB=keep\n\n", { A: "new", C: "with space" }),
    '# keys\nA=new\nB=keep\nC="with space"\n',
  );
  assert.equal(mergeEnv("", { A: "1" }), "A=1\n");
});

test("picks numbered items and rejects unknown ones", () => {
  assert.deepEqual(pickMany("2, 1 2", ["a", "b"]), ["b", "a"]);
  assert.deepEqual(pickMany("", ["a"]), []);
  assert.throws(() => pickMany("3", ["a", "b"]));
});
