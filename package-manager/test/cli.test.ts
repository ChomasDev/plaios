import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateArguments, parsePluginKinds } from "../src/cli.js";

test("parses positional create arguments with multiple kinds", () => {
  assert.deepEqual(parseCreateArguments(["input,output", "telegram", "--yes"]), {
    kinds: ["input,output"],
    name: "telegram",
    yes: true,
    help: false,
  });
});

test("parses repeated named kind arguments", () => {
  assert.deepEqual(
    parseCreateArguments([
      "--kind",
      "system2",
      "--kind",
      "memory",
      "--name",
      "browser",
      "--root",
      "../AgentOsv2",
    ]),
    {
      kinds: ["system2", "memory"],
      name: "browser",
      root: "../AgentOsv2",
      yes: false,
      help: false,
    },
  );
});

test("normalizes, validates, and deduplicates interface kinds", () => {
  assert.deepEqual(parsePluginKinds(["input, output", "input"]), [
    "input",
    "output",
  ]);
  assert.deepEqual(parsePluginKinds(["1,2"]), ["input", "output"]);
  assert.throws(() => parsePluginKinds(["invalid"]), /Unknown plugin kind/);
});
