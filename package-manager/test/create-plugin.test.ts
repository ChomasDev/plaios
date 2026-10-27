import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createPlugin } from "../src/create-plugin.js";
import { PLUGIN_KINDS } from "../src/plugin-kinds.js";

test("creates one plugin with multiple interfaces without overwriting", async () => {
  const root = await mkdtemp(join(tmpdir(), "agentos-create-test-"));

  try {
    await mkdir(join(root, "core"));
    await writeFile(join(root, "core", "package.json"), "{}\n");
    await writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n");

    const created = await createPlugin({
      workspaceRoot: root,
      kinds: PLUGIN_KINDS,
      name: "Example Plugin",
    });

    const packageJson = JSON.parse(
      await readFile(join(created.packageDirectory, "package.json"), "utf8"),
    ) as { name: string; main: string };
    const manifest = await readFile(
      join(created.packageDirectory, "agent-os.package.yaml"),
      "utf8",
    );
    const index = await readFile(
      join(created.packageDirectory, "src", "index.ts"),
      "utf8",
    );
    const webStyles = await readFile(
      join(created.packageDirectory, "web", "styles.css"),
      "utf8",
    );

    assert.equal(packageJson.name, "@agent-os/example-plugin");
    assert.equal(packageJson.main, "./dist/src/index.js");
    assert.match(webStyles, /@agent-os\/microfrontend\/styles\.css/);
    assert.deepEqual(
      created.interfaces.map((item) => item.kind),
      PLUGIN_KINDS,
    );

    for (const kind of PLUGIN_KINDS) {
      assert.match(manifest, new RegExp(`kind: ${kind}`));
      // The page microfrontend uses the conventional ./web/<kind> entry, so the yaml only documents it.
      assert.match(manifest, new RegExp(`\\./web/${kind} by default`));
      assert.match(index, new RegExp(`\\./${kind}\\.js`));
      assert.ok(
        await readFile(
          join(created.packageDirectory, "src", `${kind}.ts`),
          "utf8",
        ),
      );
      assert.ok(
        await readFile(
          join(created.packageDirectory, "web", kind, "index.tsx"),
          "utf8",
        ),
      );
    }

    await assert.rejects(
      createPlugin({
        workspaceRoot: root,
        kinds: ["action"],
        name: "Example Plugin",
      }),
      /already exists/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires at least one interface kind", async () => {
  await assert.rejects(
    createPlugin({
      workspaceRoot: "/tmp",
      kinds: [],
      name: "empty",
    }),
    /At least one plugin interface kind is required/,
  );
});
