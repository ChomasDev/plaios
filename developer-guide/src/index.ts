import type {
  Capability,
  CapabilityManifest,
  CapabilityResult,
  UIComponentSpec,
} from "@agent-os/core/domain";

import { GUIDE } from "./guide/index.js";

export { GUIDE, PARTS } from "./guide/index.js";
export type { Chapter, Part } from "./guide/chapter.js";

export interface DeveloperGuideInput {
  /** A chapter id, or null for the table of contents. */
  chapter: string | null;
}

export interface DeveloperGuideOutput {
  summary: string;
  chapters?: Array<{ id: string; title: string; tagline: string }>;
}

const manifest: CapabilityManifest = {
  id: "agent-os.developer-guide",
  version: "1.0.0",
  name: "read_developer_guide",
  description: "Reads the Agent OS developer guide: how to build a plugin of any kind (input, output, action, memory, orchestrator, agent loop, discovery, system 1/2, database, environment), the manifest, config and secrets, the scoped database, the page and chat UI, and publishing. Call it with chapter null for the contents, then with a chapter id.",
  inputSchema: {
    type: "object",
    properties: {
      chapter: { type: ["string", "null"], description: "Chapter id from the contents (e.g. \"input\", \"database\", \"chat-components\"), or null to list the chapters." },
    },
    required: ["chapter"],
    additionalProperties: false,
  },
  tags: ["docs", "developer", "guide", "plugin", "package", "create", "build", "manifest", "capability", "how"],
  examples: [
    { request: "How do I write a new input for Agent OS?", arguments: { chapter: "input" } },
    { request: "What chapters does the developer guide have?", arguments: { chapter: null } },
  ],
  execution: { timeoutMs: 5_000, idempotent: true },
};

const DOCS = `Answers questions about building Agent OS plugins from the official developer guide.

**Use it** when the user wants to create, change or understand a plugin: a new input or output, a capability, memory, an orchestrator, how the manifest, config, database, page or chat components work, or how to publish. **Don't use it** for questions about the user's own data or devices.

**How**: call \`{"chapter":null}\` once to see the chapters, then read the one or two that match, e.g. \`{"chapter":"action"}\` or \`{"chapter":"database"}\`. Quote the guide's code faithfully: the signatures in it are the real contracts. The guide also has its own page in Build, which you can point the user to.`;

export class DeveloperGuideCapability implements Capability<DeveloperGuideInput, DeveloperGuideOutput> {
  readonly manifest = manifest;

  uiComponents(): readonly UIComponentSpec[] {
    return [];
  }

  docs(): string {
    return DOCS;
  }

  async execute(input: DeveloperGuideInput): Promise<CapabilityResult<DeveloperGuideOutput>> {
    const contents = GUIDE.map(({ id, title, tagline }) => ({ id, title, tagline }));
    const id = input.chapter?.trim();
    if (!id) {
      return { success: true, data: { summary: `The guide has ${GUIDE.length} chapters:\n${contents.map((chapter) => `- ${chapter.id}: ${chapter.title} (${chapter.tagline})`).join("\n")}`, chapters: contents } };
    }
    const chapter = GUIDE.find((candidate) => candidate.id === id || candidate.kinds?.includes(id));
    if (!chapter) {
      return { success: false, error: { code: "UNKNOWN_CHAPTER", message: `No chapter "${id}". Chapters: ${contents.map((item) => item.id).join(", ")}`, retryable: false } };
    }
    return { success: true, data: { summary: `# ${chapter.title}\n_${chapter.tagline}_\n\n${chapter.markdown.trim()}` } };
  }
}
