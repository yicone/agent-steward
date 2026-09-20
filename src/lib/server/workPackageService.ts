import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

import {
  WORK_PACKAGE_SCHEMA_VERSION,
  canonicalJson,
  normalizeRelativePath,
  validateWorkPackage,
  type ContextEntry,
  type EvidenceReference,
  type HandoffHistoryEntry,
  type RepositoryState,
  type ValidationCheck,
  type WorkItem,
  type WorkPackage,
  type RedactionManifest,
} from "@/lib/workContinuity";
import { createProjectionEnvelope, sha256Canonical } from "@/lib/server/workContinuityHash";
import { readWorkItem, appendHandoffOutcome } from "@/lib/server/workItemStore";
import { getWorkPackagesRoot } from "@/lib/server/paths";
import { buildProviderProjection, type ProjectionProvider, PROVIDER_PROJECTION_CAPABILITIES } from "@/lib/server/providerProjections";

const execFile = promisify(execFileCallback);
const DEFAULT_MAX_CONTENT_BYTES = 24_000;
const PACKAGE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

type PackageStatus = "ready" | "ready_with_warnings" | "blocked";

export type HandoffOptions = {
  targetProvider: ProjectionProvider;
  includeEvidence?: boolean;
  includeRawContent?: boolean;
  redactPaths?: boolean;
  truncateContent?: boolean;
  maxContentBytes?: number;
};

export type WorkPackagePreflight = {
  status: PackageStatus;
  checks: ValidationCheck[];
  warnings: string[];
  missing: string[];
  repositoryState: RepositoryState;
  redaction: RedactionManifest;
};

export type CreatedWorkPackage = {
  package: WorkPackage;
  packageDir: string;
  manifestPath: string;
  markdownPath: string;
  jsonPath: string;
  codexPath: string;
  providerPath: string;
};

function packageId(): string {
  return `work-package-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
}

function resolveWithinRoot(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) throw new Error(`Package path must be relative: ${relativePath}`);
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  const relative = path.relative(base, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Package path escapes managed root: ${relativePath}`);
  }
  return target;
}

function validatePackageId(id: string): void {
  if (!PACKAGE_ID_PATTERN.test(id)) throw new Error(`Invalid packageId: ${id}`);
}

async function writeAtomic(target: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
  }
}

function truncate(value: string, maxBytes: number): { value: string; truncated: boolean } {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return { value, truncated: false };
  const marker = "\n[…truncated by AgentSteward…]";
  const budget = Math.max(0, maxBytes - Buffer.byteLength(marker, "utf8"));
  return { value: `${Buffer.from(value, "utf8").subarray(0, budget).toString("utf8")}${marker}`, truncated: true };
}

const REDACTION_RULES: Array<[string, RegExp]> = [
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ["bearer-token", /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi],
  ["secret-assignment", /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi],
  ["localhost-url", /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3})(?::\d+)?[^\s)]*/gi],
];

function redact(value: string, options: { redactPaths: boolean }): { value: string; count: number; rules: string[] } {
  let output = value;
  let count = 0;
  const rules: string[] = [];
  for (const [name, pattern] of REDACTION_RULES) {
    output = output.replace(pattern, () => {
      count += 1;
      if (!rules.includes(name)) rules.push(name);
      return `[REDACTED:${name}]`;
    });
  }
  if (options.redactPaths) {
    output = output.replace(/(?:\/Users\/|\/home\/|[A-Za-z]:\\)[^\s"']+/g, () => {
      count += 1;
      if (!rules.includes("absolute-path")) rules.push("absolute-path");
      return "[REDACTED:path]";
    });
  }
  return { value: output, count, rules };
}

function collectStrings(value: unknown, pathHint: string, output: Array<{ path: string; value: string }>): void {
  if (typeof value === "string") output.push({ path: pathHint, value });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${pathHint}[${index}]`, output));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => collectStrings(item, pathHint ? `${pathHint}.${key}` : key, output));
}

function applyRedaction<T>(value: T, options: { redactPaths: boolean; truncateContent: boolean; maxContentBytes: number }): { value: T; manifest: RedactionManifest } {
  const clone = JSON.parse(JSON.stringify(value)) as T;
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(clone, "", strings);
  const manifest: RedactionManifest = { count: 0, rules: [], sources: [] };
  for (const entry of strings) {
    const redacted = redact(entry.value, options);
    let next = redacted.value;
    if (options.truncateContent && /(text|output|content|prompt|command)/i.test(entry.path)) {
      const bounded = truncate(next, options.maxContentBytes);
      next = bounded.value;
      if (bounded.truncated) {
        manifest.count += 1;
        manifest.rules?.push("bounded-truncation");
      }
    }
    if (redacted.count > 0) {
      manifest.count += redacted.count;
      manifest.rules?.push(...redacted.rules.filter((rule) => !manifest.rules?.includes(rule)));
      manifest.sources?.push(entry.path || "root");
    }
    setPath(clone as unknown as Record<string, unknown>, entry.path, next);
  }
  manifest.rules = Array.from(new Set(manifest.rules));
  manifest.sources = Array.from(new Set(manifest.sources));
  return { value: clone, manifest };
}

function setPath(root: Record<string, unknown>, dotted: string, value: string): void {
  if (!dotted) return;
  const parts = dotted.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!current || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  if (current && typeof current === "object") (current as Record<string, unknown>)[parts.at(-1)!] = value;
}

async function readGit(rootPath: string): Promise<RepositoryState> {
  const observedAt = new Date().toISOString();
  try {
    const top = (await execFile("git", ["-C", rootPath, "rev-parse", "--show-toplevel"])).stdout.trim();
    const branch = (await execFile("git", ["-C", rootPath, "branch", "--show-current"])).stdout.trim();
    const commit = (await execFile("git", ["-C", rootPath, "rev-parse", "HEAD"])).stdout.trim();
    const status = (await execFile("git", ["-C", rootPath, "status", "--porcelain=v1"])).stdout.trim();
    const untracked = status.split("\n").filter((line) => line.startsWith("?? ")).map((line) => line.slice(3)).filter(Boolean);
    return { rootPath: top, branch: branch || undefined, commit: commit || undefined, dirty: Boolean(status), untracked, observedAt, confidence: "observed" };
  } catch {
    return { rootPath, observedAt, confidence: "unknown" };
  }
}

function contextForPackage(workItem: WorkItem, rootPath: string): ContextEntry[] {
  return (workItem.context ?? []).map((entry) => ({ ...entry, locator: entry.locator ? normalizeRelativePath(entry.locator) : undefined }))
    .concat([{ id: "context-project-root", name: "Project root", source: "agent-steward", scope: "project", observedAt: new Date().toISOString(), provenance: rootPath, confidence: "observed", attribution: "observed available", locator: "." }]);
}

function packageEvidence(workItem: WorkItem, includeEvidence: boolean): EvidenceReference[] {
  if (!includeEvidence) return (workItem.evidence ?? []).map((item) => ({ ...item, embedded: false }));
  return (workItem.evidence ?? []).map((item) => ({ ...item, embedded: item.kind === "event" || item.kind === "session" }));
}

export async function preflightWorkPackage(workItem: WorkItem, options: HandoffOptions): Promise<WorkPackagePreflight> {
  const checks: ValidationCheck[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];
  const rootPath = workItem.project.rootPath;
  const repositoryState = await readGit(rootPath);
  checks.push({ id: "goal", status: workItem.goal.value.trim() ? "pass" : "block", detail: "Work Item goal is present", confidence: workItem.goal.confidence });
  if (workItem.goal.confidence !== "verified") {
    warnings.push("The goal is not user-verified; confirm the Work Item boundary before continuation.");
    checks.push({ id: "goal-confirmation", status: "warning", detail: "Goal requires user confirmation", confidence: workItem.goal.confidence });
  }
  checks.push({ id: "project-root", status: repositoryState.confidence === "unknown" ? "warning" : "pass", detail: "Project root identity captured", confidence: repositoryState.confidence });
  const hasSession = Boolean(workItem.sessionEvidence?.sessionId || workItem.evidence?.some((item) => item.kind === "session"));
  if (!hasSession) {
    missing.push("session evidence");
    warnings.push("No Session evidence is attached; this package cannot claim verified continuation.");
    checks.push({ id: "session-evidence", status: "warning", detail: "No Session evidence attached", confidence: "missing" });
  } else checks.push({ id: "session-evidence", status: "pass", detail: "Session evidence attached", confidence: "observed" });
  if ((workItem.openQuestions ?? []).length > 0) {
    warnings.push(`${workItem.openQuestions!.length} open question(s) remain unresolved.`);
    checks.push({ id: "open-questions", status: "warning", detail: "Open questions remain unresolved", confidence: "inferred" });
  }
  if (repositoryState.confidence === "unknown") warnings.push("Git repository state is unavailable and remains unknown.");
  const status: PackageStatus = checks.some((check) => check.status === "block") ? "blocked" : warnings.length > 0 ? "ready_with_warnings" : "ready";
  return { status, checks, warnings, missing, repositoryState, redaction: { count: 0, rules: [], sources: [] } };
}

function markdownProjection(pkg: WorkPackage): string {
  const lines = [
    `# Agent Work Handoff: ${pkg.workItem.goal.value}`,
    "",
    `Work Item: ${pkg.workItemId}`,
    `Package: ${pkg.id}`,
    `Canonical hash: ${pkg.canonicalHash ?? "unknown"}`,
    `Status: ${pkg.workItem.status}`,
    "",
    "## Next step",
    ...(pkg.workItem.progress ?? []).filter((item) => item.kind === "next").map((item) => `- ${item.value} [${item.confidence}]`),
    "",
    "## Warnings",
    ...(pkg.validation.warnings ?? []).map((warning) => `- ${warning}`),
    "",
    "This package is a handoff description; AgentSteward does not inject it directly into a provider session.",
  ];
  return lines.join("\n");
}

export async function createWorkPackage(workItemId: string, options: HandoffOptions): Promise<CreatedWorkPackage> {
  const workItem = await readWorkItem(workItemId);
  const preflight = await preflightWorkPackage(workItem, options);
  if (preflight.status === "blocked") throw new Error("Work Package preflight is blocked");
  const maxContentBytes = options.maxContentBytes ?? DEFAULT_MAX_CONTENT_BYTES;
  const provider = options.targetProvider;
  const packageWorkItem = options.includeEvidence ? workItem : (() => {
    const { sessionEvidence: _sessionEvidence, sessionEvidenceSnapshots: _sessionEvidenceSnapshots, ...withoutSessionEvidence } = workItem;
    return withoutSessionEvidence as WorkItem;
  })();
  const rawPackage: WorkPackage = {
    schemaVersion: WORK_PACKAGE_SCHEMA_VERSION,
    id: packageId(),
    workItemId,
    createdAt: new Date().toISOString(),
    target: { provider, profile: PROVIDER_PROJECTION_CAPABILITIES[provider].consumption },
    workItem: packageWorkItem,
    summary: { goal: workItem.goal, progress: workItem.progress ?? [], next: (workItem.progress ?? []).filter((item) => item.kind === "next") },
    context: contextForPackage(workItem, workItem.project.rootPath),
    evidence: packageEvidence(workItem, options.includeEvidence ?? false),
    repositoryState: preflight.repositoryState,
    validation: { status: preflight.status, checks: preflight.checks, warnings: preflight.warnings, missing: preflight.missing },
    redaction: { count: 0, rules: [], sources: [] },
  };
  const sanitized = applyRedaction(rawPackage, { redactPaths: options.redactPaths ?? true, truncateContent: options.truncateContent ?? true, maxContentBytes });
  const pkg = sanitized.value;
  pkg.redaction = sanitized.manifest;
  const canonicalHash = sha256Canonical({ ...pkg, canonicalHash: undefined, projections: undefined });
  pkg.canonicalHash = canonicalHash;
  validateWorkPackage(pkg);
  const markdown = markdownProjection(pkg);
  const json = canonicalJson(pkg);
  const providerProjection = buildProviderProjection(provider, pkg);
  const codex = provider === "codex" ? providerProjection.content : buildProviderProjection("codex", pkg).content;
  const markdownProjectionEnvelope = createProjectionEnvelope({ provider: "generic", canonicalHash, content: markdown });
  const jsonProjectionEnvelope = createProjectionEnvelope({ provider: "generic-json", canonicalHash, content: json, format: "application/json" });
  const codexProjectionEnvelope = createProjectionEnvelope({ provider: "codex", canonicalHash, content: codex });
  pkg.projections = {
    markdown: { hash: markdownProjectionEnvelope.hash, format: "text/markdown" },
    json: { hash: jsonProjectionEnvelope.hash, format: "application/json" },
    codex: { hash: codexProjectionEnvelope.hash, format: "text/markdown" },
    [provider]: { hash: createProjectionEnvelope({ provider, canonicalHash, content: providerProjection.content }).hash, format: providerProjection.format },
  };
  const root = path.resolve(getWorkPackagesRoot());
  const dir = resolveWithinRoot(root, pkg.id);
  validatePackageId(pkg.id);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const manifestPath = resolveWithinRoot(dir, "manifest.json");
  const jsonPath = resolveWithinRoot(dir, "package.json");
  const markdownPath = resolveWithinRoot(dir, "handoff.md");
  const codexPath = resolveWithinRoot(dir, "codex-handoff.md");
  const providerPath = resolveWithinRoot(dir, `${provider}-handoff.md`);
  await writeAtomic(manifestPath, canonicalJson({ ...pkg, projections: pkg.projections }));
  await writeAtomic(jsonPath, json);
  await writeAtomic(markdownPath, markdown);
  await writeAtomic(codexPath, codex);
  await writeAtomic(providerPath, providerProjection.content);
  await appendHandoffOutcome(workItemId, {
    id: `handoff-${pkg.id}`,
    workItemId,
    packageId: pkg.id,
    packageHash: canonicalHash,
    schemaVersion: WORK_PACKAGE_SCHEMA_VERSION,
    target: { provider: options.targetProvider },
    project: workItem.project,
    createdAt: pkg.createdAt,
    method: "observed",
    outcome: "created",
  });
  return { package: pkg, packageDir: dir, manifestPath, markdownPath, jsonPath, codexPath, providerPath };
}

export async function recordHandoffOutcome(workItemId: string, outcome: HandoffHistoryEntry): Promise<void> {
  await appendHandoffOutcome(workItemId, outcome);
}

export { DEFAULT_MAX_CONTENT_BYTES };
