import type { WorkPackage } from "@/lib/workContinuity";

export type ProjectionProvider = "codex" | "cursor" | "windsurf" | "antigravity";

export type ProviderProjectionCapability = {
  provider: ProjectionProvider;
  format: "markdown";
  consumption: "manual";
  sessionInjection: "unsupported";
  sourceEvidence: "portable-reference" | "provider-session-reference";
  entryInstruction: string;
};

export const PROVIDER_PROJECTION_CAPABILITIES: Record<ProjectionProvider, ProviderProjectionCapability> = {
  codex: {
    provider: "codex",
    format: "markdown",
    consumption: "manual",
    sessionInjection: "unsupported",
    sourceEvidence: "provider-session-reference",
    entryInstruction: "Open the JSON sidecar or paste this handoff into a new Codex session, then verify the canonical hash.",
  },
  cursor: {
    provider: "cursor",
    format: "markdown",
    consumption: "manual",
    sessionInjection: "unsupported",
    sourceEvidence: "provider-session-reference",
    entryInstruction: "Open this Markdown handoff in Cursor and verify the project, branch, and canonical hash before continuing.",
  },
  windsurf: {
    provider: "windsurf",
    format: "markdown",
    consumption: "manual",
    sessionInjection: "unsupported",
    sourceEvidence: "provider-session-reference",
    entryInstruction: "Open this Markdown handoff in Windsurf and review the bounded evidence before continuing.",
  },
  antigravity: {
    provider: "antigravity",
    format: "markdown",
    consumption: "manual",
    sessionInjection: "unsupported",
    sourceEvidence: "provider-session-reference",
    entryInstruction: "Open this Markdown handoff in Antigravity and verify unresolved questions before continuing.",
  },
};

function nextSteps(pkg: WorkPackage): string[] {
  const progress = pkg.workItem.progress ?? [];
  return progress.filter((item) => item.kind === "next").map((item) => `- ${item.value} [${item.confidence}]`);
}

export function buildProviderProjection(provider: ProjectionProvider, pkg: WorkPackage): { content: string; format: "text/markdown"; capability: ProviderProjectionCapability } {
  const capability = PROVIDER_PROJECTION_CAPABILITIES[provider];
  const lines = [
    `# Agent Work Handoff: ${pkg.workItem.goal.value}`,
    "",
    `Target provider: ${provider}`,
    `Work Item: ${pkg.workItemId}`,
    `Package: ${pkg.id}`,
    `Canonical hash: ${pkg.canonicalHash ?? "unknown"}`,
    `Validation: ${pkg.validation.status ?? "unknown"}`,
    "",
    "## Next step",
    ...nextSteps(pkg),
    "",
    "## Warnings",
    ...(pkg.validation.warnings ?? []).map((warning) => `- ${warning}`),
    "",
    "## Consumption boundary",
    `- ${capability.entryInstruction}`,
    "- AgentSteward does not inject this package directly into a provider session.",
    `- Session injection capability: ${capability.sessionInjection}`,
  ];
  return { content: lines.join("\n"), format: "text/markdown", capability };
}

export function isProjectionProvider(value: unknown): value is ProjectionProvider {
  return value === "codex" || value === "cursor" || value === "windsurf" || value === "antigravity";
}
