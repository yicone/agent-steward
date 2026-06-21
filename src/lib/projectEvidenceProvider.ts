import {
  normalizeContextAsset,
  type ContextAsset,
  type ContextAssetInput,
  type ContextAssetSource,
  type ContextAssetSubtype,
} from "@/lib/contextAssets";
import { normalizeAnalysisFinding, type AnalysisFinding, type AnalysisIssueClass } from "@/lib/analysisFindings";

export type ProjectEvidenceProviderStatus = "available" | "empty" | "partial" | "unavailable";
export type ProjectEvidenceKind = "rule" | "skill" | "command" | "unknown";
export type ProjectEvidenceDiagnosticKind = "unreadable" | "skipped" | "unsupported" | "duplicate" | "ambiguous";
export type ProjectEvidenceSource = "repo-local";

export type ProjectEvidenceItem = {
  id: string;
  path: string;
  title: string;
  kind: ProjectEvidenceKind;
  source: ContextAssetSource;
  evidenceSource: ProjectEvidenceSource;
  status: "read" | "ambiguous";
  bodySummary?: string;
};

export type ProjectEvidenceDiagnostic = {
  id: string;
  kind: ProjectEvidenceDiagnosticKind;
  severity: "info" | "warning";
  path: string;
  message: string;
};

export type ProjectEvidenceProviderResult = {
  provider: "project-evidence-provider-v1";
  status: ProjectEvidenceProviderStatus;
  projectName: string;
  rootLabel: string;
  evidenceSource: ProjectEvidenceSource;
  items: ProjectEvidenceItem[];
  assets: ContextAsset[];
  diagnostics: ProjectEvidenceDiagnostic[];
};

export type ProjectEvidenceFileSystem = {
  exists(relativePath: string): boolean;
  isFile(relativePath: string): boolean;
  isDirectory(relativePath: string): boolean;
  listDirectory(relativePath: string): string[];
  readFile(relativePath: string): string;
};

type EvidencePattern = {
  base: string;
  recursive: false;
  kind: ProjectEvidenceKind;
  source: ContextAssetSource;
  fileName?: string;
  extension?: string;
};

const FIXED_EVIDENCE = [
  { path: "AGENTS.md", kind: "rule", source: "codex" },
  { path: ".github/copilot-instructions.md", kind: "rule", source: "unknown" },
  { path: ".codex/hooks.json", kind: "command", source: "codex" },
  { path: ".windsurf/hooks.json", kind: "command", source: "windsurf" },
  { path: ".devin/hooks.json", kind: "command", source: "devin" },
  { path: ".cursor/mcp.json", kind: "command", source: "cursor" },
  { path: ".cursorrules", kind: "rule", source: "cursor" },
] satisfies Array<{ path: string; kind: ProjectEvidenceKind; source: ContextAssetSource }>;

const DIRECTORY_EVIDENCE = [
  { base: ".github/instructions", recursive: false, kind: "rule", source: "unknown", extension: ".md" },
  { base: ".github/prompts", recursive: false, kind: "command", source: "unknown" },
  { base: ".github/hooks", recursive: false, kind: "command", source: "unknown" },
  { base: ".github/skills", recursive: false, kind: "skill", source: "unknown", fileName: "SKILL.md" },
  { base: ".codex/skills", recursive: false, kind: "skill", source: "codex", fileName: "SKILL.md" },
  { base: ".codex/agents", recursive: false, kind: "command", source: "codex" },
  { base: ".agents/skills", recursive: false, kind: "skill", source: "unknown", fileName: "SKILL.md" },
  { base: ".agent/skills", recursive: false, kind: "skill", source: "unknown", fileName: "SKILL.md" },
  { base: ".windsurf/skills", recursive: false, kind: "skill", source: "windsurf", fileName: "SKILL.md" },
  { base: ".windsurf/rules", recursive: false, kind: "rule", source: "windsurf", extension: ".md" },
  { base: ".windsurf/workflows", recursive: false, kind: "command", source: "windsurf" },
  { base: ".windsurf/hooks", recursive: false, kind: "command", source: "windsurf" },
  { base: ".devin/skills", recursive: false, kind: "skill", source: "devin", fileName: "SKILL.md" },
  { base: ".devin/rules", recursive: false, kind: "rule", source: "devin", extension: ".md" },
  { base: ".devin/workflows", recursive: false, kind: "command", source: "devin" },
  { base: ".devin/plans", recursive: false, kind: "command", source: "devin", extension: ".md" },
  { base: ".devin/hooks", recursive: false, kind: "command", source: "devin" },
  { base: ".cursor/rules", recursive: false, kind: "rule", source: "cursor", extension: ".mdc" },
] satisfies EvidencePattern[];

const UNSUPPORTED_AGENT_PATH_PREFIXES = [
  ".github/workflows/",
  ".codex/hooks/",
  ".agent/workflows/",
] as const;

function normalizeRelativePath(input: string): string | null {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) return null;
  return normalized;
}

function joinRelativePath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

function stableEvidenceId(relativePath: string): string {
  return `asset-project-evidence-${relativePath.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function titleFromPath(relativePath: string): string {
  const fileName = relativePath.split("/").at(-1) ?? relativePath;
  const leaf = fileName === "SKILL.md"
    ? relativePath.split("/").at(-2) ?? fileName
    : fileName.replace(/\.(md|json|toml|ya?ml)$/i, "");
  return leaf
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || relativePath;
}

function summarizeEvidenceContent(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("<!--"));
  const heading = lines.find((line) => line.startsWith("#"));
  const summary = (heading ?? lines[0] ?? "Content is present but no text summary is available.")
    .replace(/^#+\s*/, "")
    .slice(0, 180);
  return `${summary}${summary.length === 180 ? "..." : ""}`;
}

function diagnostic(input: Omit<ProjectEvidenceDiagnostic, "id">): ProjectEvidenceDiagnostic {
  return {
    ...input,
    id: `project-evidence-diagnostic-${input.kind}-${input.path.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  };
}

function canReadEvidencePath(fs: ProjectEvidenceFileSystem, relativePath: string): boolean {
  try {
    return fs.exists(relativePath) && fs.isFile(relativePath);
  } catch {
    return true;
  }
}

function collectDirectoryEvidence(fs: ProjectEvidenceFileSystem, pattern: EvidencePattern): string[] {
  if (!fs.exists(pattern.base) || !fs.isDirectory(pattern.base)) return [];
  const names = fs.listDirectory(pattern.base).filter((name) => normalizeRelativePath(name) === name).sort();
  const paths: string[] = [];

  for (const name of names) {
    const firstLevelPath = joinRelativePath(pattern.base, name);
    if (pattern.fileName) {
      if (!fs.isDirectory(firstLevelPath)) continue;
      const skillPath = joinRelativePath(firstLevelPath, pattern.fileName);
      if (canReadEvidencePath(fs, skillPath)) paths.push(skillPath);
      continue;
    }
    if (!fs.isFile(firstLevelPath)) continue;
    if (pattern.extension && !firstLevelPath.endsWith(pattern.extension)) continue;
    paths.push(firstLevelPath);
  }

  return paths;
}

function patternForPath(relativePath: string): { kind: ProjectEvidenceKind; source: ContextAssetSource } | null {
  const fixed = FIXED_EVIDENCE.find((item) => item.path === relativePath);
  if (fixed) return { kind: fixed.kind, source: fixed.source };

  for (const pattern of DIRECTORY_EVIDENCE) {
    if (!relativePath.startsWith(`${pattern.base}/`)) continue;
    if (pattern.fileName && !relativePath.endsWith(`/${pattern.fileName}`)) continue;
    if (pattern.extension && !relativePath.endsWith(pattern.extension)) continue;
    const remainder = relativePath.slice(pattern.base.length + 1);
    const expectedDepth = pattern.fileName ? 2 : 1;
    if (remainder.split("/").length !== expectedDepth) continue;
    return { kind: pattern.kind, source: pattern.source };
  }

  return null;
}

function sourceLabel(source: ContextAssetSource): string {
  if (source === "codex") return "Codex";
  if (source === "cursor") return "Cursor";
  if (source === "windsurf") return "Windsurf";
  if (source === "devin") return "Devin";
  if (source === "antigravity") return "Antigravity";
  return "repo-local";
}

function subtypeFromKind(kind: ProjectEvidenceKind): ContextAssetSubtype {
  if (kind === "rule" || kind === "skill" || kind === "command") return kind;
  return "unknown";
}

export function normalizeProjectEvidenceItem(input: {
  path: string;
  kind?: ProjectEvidenceKind | null;
  source?: ContextAssetSource | null;
  content?: string | null;
}): ProjectEvidenceItem {
  const path = normalizeRelativePath(input.path) ?? "unknown";
  const kind = input.kind ?? "unknown";
  return {
    id: stableEvidenceId(path),
    path,
    title: titleFromPath(path),
    kind,
    source: input.source ?? "unknown",
    evidenceSource: "repo-local",
    status: kind === "unknown" ? "ambiguous" : "read",
    ...(input.content ? { bodySummary: summarizeEvidenceContent(input.content) } : {}),
  };
}

export function projectEvidenceItemToContextAssetInput(item: ProjectEvidenceItem): ContextAssetInput {
  const subtype = subtypeFromKind(item.kind);
  return {
    id: item.id,
    title: item.title,
    subtype,
    scope: "project",
    source: item.source,
    status: item.status === "ambiguous" ? "unknown" : "active",
    provenance: `${item.path} (${item.evidenceSource})`,
    bodySummary: item.bodySummary ?? `Recognized ${subtype} evidence at ${item.path}.`,
    sourceReference: {
      label: item.path,
      target: "source",
      path: item.path,
    },
    usage: {
      state: item.status === "ambiguous" ? "unknown" : "in_effect",
      summary: item.status === "ambiguous"
        ? "Provider found the file in an allowlisted location but could not classify the reusable asset subtype."
        : `Recognized as ${sourceLabel(item.source)} ${subtype} evidence from an allowlisted repo-local path.`,
      analysisLabel: item.status === "ambiguous" ? "Ambiguous provider evidence" : undefined,
    },
  };
}

export function createProjectEvidenceDiagnosticsFindings(result: ProjectEvidenceProviderResult): AnalysisFinding[] {
  return result.diagnostics
    .filter((item) => item.severity === "warning")
    .map((item) => {
      const relatedAsset = result.assets.find((asset) => asset.provenance.includes(item.path));
      const issueClass: AnalysisIssueClass = item.kind === "duplicate" ? "conflict" : item.kind === "unreadable" ? "provenance" : "unknown";
      return normalizeAnalysisFinding({
        id: `finding-${item.id}`,
        title: `Provider ${item.kind} evidence: ${item.path}`,
        issueClass,
        severity: item.kind === "duplicate" ? "high" : "medium",
        status: "open",
        affectedObjectType: relatedAsset ? "asset" : "project",
        affectedObjectLabel: relatedAsset?.title ?? item.path,
        whyItMatters: `${item.message} This is a bounded project evidence provider diagnostic, not a semantic repository analysis.`,
        evidence: [
          {
            label: item.path,
            target: relatedAsset ? "asset" : "source",
            assetId: relatedAsset?.id,
          },
        ],
        routes: relatedAsset
          ? [
            {
              target: "assets",
              label: "Open provider evidence",
              reason: "Assets owns provider-backed evidence inventory and diagnostic inspection.",
              assetId: relatedAsset.id,
              assetSubtype: relatedAsset.subtype,
              assetStatus: relatedAsset.status,
            },
          ]
          : [
            {
              target: "assets",
              label: "Review provider inventory",
              reason: "Assets owns provider diagnostic visibility even when no asset could be normalized.",
            },
          ],
      });
    });
}

export function discoverProjectEvidence(input: {
  fileSystem: ProjectEvidenceFileSystem;
  rootLabel?: string;
}): ProjectEvidenceProviderResult {
  const diagnostics: ProjectEvidenceDiagnostic[] = [];
  const paths = new Set<string>();

  try {
    for (const item of FIXED_EVIDENCE) {
      if (input.fileSystem.exists(item.path)) paths.add(item.path);
    }

    for (const pattern of DIRECTORY_EVIDENCE) {
      for (const path of collectDirectoryEvidence(input.fileSystem, pattern)) {
        paths.add(path);
      }
    }

    for (const unsupportedPrefix of UNSUPPORTED_AGENT_PATH_PREFIXES) {
      const base = unsupportedPrefix.replace(/\/$/, "");
      if (!input.fileSystem.exists(base) || !input.fileSystem.isDirectory(base)) continue;
      for (const name of input.fileSystem.listDirectory(base)) {
        const relativePath = normalizeRelativePath(joinRelativePath(base, name));
        if (!relativePath) continue;
        diagnostics.push(diagnostic({
          kind: "unsupported",
          severity: "info",
          path: relativePath,
          message: "Provider skipped this repo-local agent-facing file because it is outside the v1 allowlist.",
        }));
      }
    }
  } catch (error) {
    return {
      provider: "project-evidence-provider-v1",
      status: "unavailable",
      projectName: input.rootLabel ?? "Current Project",
      rootLabel: input.rootLabel ?? "repository root",
      evidenceSource: "repo-local",
      items: [],
      assets: [],
      diagnostics: [
        diagnostic({
          kind: "unreadable",
          severity: "warning",
          path: "repository root",
          message: error instanceof Error ? error.message : "Project evidence discovery could not run.",
        }),
      ],
    };
  }

  const items: ProjectEvidenceItem[] = [];
  const seenIds = new Set<string>();

  for (const relativePath of Array.from(paths).sort()) {
    const mapping = patternForPath(relativePath);
    if (!mapping) {
      diagnostics.push(diagnostic({
        kind: "ambiguous",
        severity: "warning",
        path: relativePath,
        message: "Provider found evidence in an allowlisted area but could not map it to a reusable asset subtype.",
      }));
    }

    try {
      const content = input.fileSystem.readFile(relativePath);
      const item = normalizeProjectEvidenceItem({
        path: relativePath,
        kind: mapping?.kind ?? "unknown",
        source: mapping?.source ?? "unknown",
        content,
      });
      if (seenIds.has(item.id)) {
        diagnostics.push(diagnostic({
          kind: "duplicate",
          severity: "warning",
          path: relativePath,
          message: "Provider generated a duplicate stable evidence identity for this path.",
        }));
        continue;
      }
      seenIds.add(item.id);
      items.push(item);
    } catch {
      diagnostics.push(diagnostic({
        kind: "unreadable",
        severity: "warning",
        path: relativePath,
        message: "Provider could not read this repo-local allowlisted evidence file.",
      }));
    }
  }

  const assets = items.map((item) => normalizeContextAsset(projectEvidenceItemToContextAssetInput(item)));
  const hasUnreadable = diagnostics.some((item) => item.kind === "unreadable" && item.severity === "warning");
  const status: ProjectEvidenceProviderStatus = hasUnreadable && assets.length === 0
    ? "unavailable"
    : hasUnreadable
      ? "partial"
      : assets.length > 0
        ? "available"
        : "empty";

  return {
    provider: "project-evidence-provider-v1",
    status,
    projectName: input.rootLabel ?? "Current Project",
    rootLabel: input.rootLabel ?? "repository root",
    evidenceSource: "repo-local",
    items,
    assets,
    diagnostics,
  };
}
