import assert from "node:assert/strict";
import test from "node:test";

import { AI_CHOICES, CHANNELS, DATABASES, ENVIRONMENTS, TOOLS, addEnvPlaceholders, buildOnboardingConfig, mergeEnv } from "../src/onboard.js";

test("builds a config with the base graph plus the picked features", () => {
  const config = buildOnboardingConfig("http://localhost:4873", [AI_CHOICES[0]!, ENVIRONMENTS[0]!, DATABASES[0]!, TOOLS[0]!]);
  const ids = config.components.map((component) => component.instanceId);
  assert.ok(ids.includes("agent:agent-loop"));
  assert.ok(ids.includes("ai:codex"));
  assert.ok(ids.includes("action:perplexity-search"));
  assert.ok(ids.includes("database:main"));
  assert.ok(ids.includes("env:env-node:3"));
  assert.equal(new Set(ids).size, ids.length);
});

test("merges env values in place and appends new ones", () => {
  assert.equal(
    mergeEnv("# keys\nA=old\nB=keep\n\n", { A: "new", C: "with space" }),
    '# keys\nA=new\nB=keep\nC="with space"\n',
  );
  assert.equal(mergeEnv("", { A: "1" }), "A=1\n");
});

test("adds commented placeholders only for keys the .env does not mention", () => {
  assert.equal(
    addEnvPlaceholders("A=1\n# B=\n", ["A", "B", "C"]),
    "A=1\n# B=\n# Set up later:\n# C=\n",
  );
  assert.equal(addEnvPlaceholders("A=1", []), "A=1");
  assert.equal(addEnvPlaceholders("", ["C"]), "# Set up later:\n# C=\n");
});

test("every feature instance id is unique", () => {
  const ids = [...AI_CHOICES.slice(0, 1), ...ENVIRONMENTS, ...DATABASES, ...CHANNELS, ...TOOLS].flatMap((feature) => feature.components.map((c) => c.instanceId));
  assert.equal(new Set(ids).size, ids.length);
});
