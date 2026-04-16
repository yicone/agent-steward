import "server-only";

import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import {
  PROJECT_BUNDLE_MEMBER_CATEGORIES,
  PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES,
  buildProjectBundleValidationSummary,
  dedupeSessionSelections,
  deriveValidationResult,
  formatSessionSelectionLabel,
  type BackupValidationItem,
  type ProjectBundleConfiguration,
  type ProjectBundleDocument,
  type ProjectBundleGenerateResponse,
  type ProjectBundleMemberCategory,
  type ProjectBundleMemberInventoryItem,
  type ProjectBundleMemberReference,
  type ProjectBundleMemberStatus,
  type ProjectBundleMetadataSnapshot,
  type ProjectBundlePackageMetadata,
  type ProjectBundleProjectMetadata,
  type ProjectBundleSelectableMemberCategory,
  type ProjectBundleSelectionState,
  type ProjectBundleValidationResponse,
} from "@/lib/backupMigration";
import { createContextAssetSeeds } from "@/lib/contextAssets";
import { parseSessionBackupManifest, parseSessionRecord } from "@/lib/sessionBackup";
import { getProjectBundlesRoot, getSessionBackupsRoot } from "@/lib/server/paths";
import { readBackupFile, readBackupManifestFile } from "@/lib/server/sessionBackupStore";

type SessionBackupReferenceMatch = {
  backupId: string;
  createdAt: string;
  source: string;
  sessionId: string;
  rootId?: string;
};

type ComposeProjectBundleResult = ProjectBundleValidationResponse & {
  packageMetadata: ProjectBundlePackageMetadata;
  projectMetadata: ProjectBundleProjectMetadata;
};

function createPackageId(): string {
  return `project-bundle-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
}

function createSnapshot(input: {
  id: string;
  label: string;
  category: ProjectBundleMemberCategory;
  scope?: string;
  subtype?: string;
  provenanceSummary?: string;
  status?: string;
  capturedAt?: string;
}): ProjectBundleMetadataSnapshot {
  return {
    id: input.id,
    label: input.label,
    category: input.category,
    scope: input.scope,
    subtype: input.subtype,
    provenanceSummary: input.provenanceSummary,
    status: input.status,
    timestamps: input.capturedAt ? { capturedAt: input.capturedAt } : undefined,
  };
}

async function listSessionBackupMatches(
  sessionSelections: ProjectBundleSelectionState["sessionSelections"]
): Promise<Map<string, SessionBackupReferenceMatch>> {
  const index = new Map<string, SessionBackupReferenceMatch>();
  const root = getSessionBackupsRoot();
  const requestedKeys = new Set(sessionSelections.map((selection) => formatSessionSelectionLabel(selection)));
  const remainingKeys = new Set(requestedKeys);
  const requestedSessionIds = new Set(sessionSelections.map((selection) => selection.sessionId));

  if (requestedKeys.size === 0) {
    return index;
  }

  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (remainingKeys.size === 0) break;
      if (!entry.isDirectory()) continue;

      try {
        const manifest = parseSessionBackupManifest(await readBackupManifestFile(entry.name));
        for (const recordEntry of manifest.records) {
          if (remainingKeys.size === 0) break;
          if (!requestedSessionIds.has(recordEntry.sessionId)) continue;
          const record = parseSessionRecord((await readBackupFile(entry.name, recordEntry.path)).toString("utf8"));
          const key = formatSessionSelectionLabel({
            sessionId: record.session.id,
            source: record.session.source,
            rootId: record.session.rootId,
          });
          if (!requestedKeys.has(key)) continue;
          const existing = index.get(key);
          if (existing && existing.createdAt >= manifest.createdAt) continue;
          index.set(key, {
            backupId: manifest.backupId,
            createdAt: manifest.createdAt,
            source: record.session.source,
            sessionId: record.session.id,
            rootId: record.session.rootId,
          });
          remainingKeys.delete(key);
        }
      } catch {
        continue;
      }
    }
  } catch {
    return index;
  }

  return index;
}

async function canPrepareBundleOutputRoot(): Promise<boolean> {
  try {
    const root = getProjectBundlesRoot();
    try {
      const stat = await fs.stat(root);
      if (stat.isDirectory()) {
        await fs.access(root, fsConstants.W_OK);
        return true;
      }
      return false;
    } catch {
      // Root does not exist yet; fall back to nearest existing writable ancestor.
    }
    let current = path.dirname(root);
    while (true) {
      try {
        await fs.access(current, fsConstants.W_OK);
        return true;
      } catch {
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function readPackageMetadata(): Promise<{
  projectName: string;
  packageName: string;
  packageVersion: string;
  repository?: string;
  workspacePath: string;
}> {
  const workspacePath = process.cwd();
  const raw = await fs.readFile(path.join(workspacePath, "package.json"), "utf8");
  const pkg = JSON.parse(raw) as {
    name?: string;
    version?: string;
    repository?: { url?: string } | string;
  };

  const repository = typeof pkg.repository === "string"
    ? pkg.repository
    : pkg.repository?.url;

  return {
    projectName: path.basename(workspacePath),
    packageName: pkg.name ?? "",
    packageVersion: pkg.version ?? "",
    repository: repository || undefined,
    workspacePath,
  };
}

function buildContextAssetReferences(
  selection: ProjectBundleSelectionState
): {
  memberReferences: ProjectBundleMemberReference[];
  validationItems: BackupValidationItem[];
} {
  const assets = createContextAssetSeeds();
  const selectedSubtypes = new Map<ProjectBundleSelectableMemberCategory, string>([
    ["rules", "rule"],
    ["memory", "memory"],
    ["skills", "skill"],
    ["commands", "command"],
  ]);

  const memberReferences: ProjectBundleMemberReference[] = [];
  const validationItems: BackupValidationItem[] = [];

  for (const [category, subtype] of selectedSubtypes.entries()) {
    if (!selection.includedCategories[category]) continue;

    for (const asset of assets.filter((item) => item.subtype === subtype)) {
      memberReferences.push({
        id: `${category}:${asset.id}`,
        category,
        label: asset.title,
        referenceType: "context-asset",
        referenceId: asset.id,
        status: "resolved",
        detail: `Include ${asset.title} as a ${category} member reference.`,
        snapshot: createSnapshot({
          id: asset.id,
          label: asset.title,
          category,
          scope: asset.scope,
          subtype: asset.subtype,
          provenanceSummary: asset.provenance,
          status: asset.status,
        }),
      });

      if (!asset.provenance || asset.provenance === "Provenance unavailable.") {
        validationItems.push({
          id: `bundle-${category}-${asset.id}-provenance-missing`,
          label: `${asset.title} provenance`,
          severity: "warning",
          detail: "Provenance is incomplete. The bundle remains structurally valid and will preserve a lightweight metadata snapshot.",
        });
      }
      if (asset.subtype === "unknown") {
        validationItems.push({
          id: `bundle-${category}-${asset.id}-subtype-unknown`,
          label: `${asset.title} subtype classification`,
          severity: "warning",
          detail: "Subtype classification is uncertain. The bundle remains structurally valid and keeps the member snapshot.",
        });
      }
      if (asset.status === "stale" || asset.status === "conflicted" || asset.status === "orphaned" || asset.status === "unknown") {
        validationItems.push({
          id: `bundle-${category}-${asset.id}-state-warning`,
          label: `${asset.title} member state`,
          severity: "warning",
          detail: `Member state is ${asset.status}. The bundle can proceed, but the warning remains visible through confirmation.`,
        });
      }
    }
  }

  return { memberReferences, validationItems };
}

async function composeProjectBundle(
  selection: ProjectBundleSelectionState,
  configuration: ProjectBundleConfiguration
): Promise<ComposeProjectBundleResult> {
  const selectableCategories = PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES.filter((category) => selection.includedCategories[category]);
  const selectedCategories = PROJECT_BUNDLE_MEMBER_CATEGORIES.filter((category) => {
    if (category === "package-metadata" || category === "project-metadata") {
      return true;
    }
    return selection.includedCategories[category];
  });
  const validationItems: BackupValidationItem[] = [];
  const memberReferences: ProjectBundleMemberReference[] = [];
  const now = new Date().toISOString();

  if (selectableCategories.length === 0) {
    validationItems.push({
      id: "bundle-no-categories",
      label: "Bundle composition",
      severity: "block",
      detail: "Select at least one non-metadata bundle member category before validation.",
    });
  }

  if (!configuration.bundleName.trim()) {
    validationItems.push({
      id: "bundle-name-required",
      label: "Bundle name",
      severity: "block",
      detail: "Bundle name is required before a legal bundle manifest can be formed.",
    });
  }

  let packageInfo: Awaited<ReturnType<typeof readPackageMetadata>> | null = null;
  try {
    packageInfo = await readPackageMetadata();
  } catch {
    validationItems.push({
      id: "bundle-package-metadata-missing",
      label: "Package metadata",
      severity: "block",
      detail: "Required package metadata could not be read from the current workspace.",
    });
  }

  if (packageInfo && (!packageInfo.packageName || !packageInfo.packageVersion || !packageInfo.projectName)) {
    validationItems.push({
      id: "bundle-package-metadata-incomplete",
      label: "Package identity",
      severity: "block",
      detail: "Required package identity is incomplete, so a legal bundle package cannot be generated.",
    });
  }

  const outputRootWritable = await canPrepareBundleOutputRoot();
  if (!outputRootWritable) {
    validationItems.push({
      id: "bundle-output-root-unwritable",
      label: "Bundle output",
      severity: "block",
      detail: "Bundle output root cannot be prepared from the current environment.",
    });
  }

  const sessionSelections = dedupeSessionSelections(selection.sessionSelections);
  const sessionBackupIndex =
    selection.includedCategories.sessions && sessionSelections.length > 0
      ? await listSessionBackupMatches(sessionSelections)
      : new Map<string, SessionBackupReferenceMatch>();
  if (selection.includedCategories.sessions && sessionSelections.length === 0) {
    validationItems.push({
      id: "bundle-sessions-empty",
      label: "Session members",
      severity: "warning",
      detail: "Sessions are selected as a default bundle category, but no explicit session references are currently listed.",
    });
  }

  if (selection.includedCategories.sessions) {
    for (const sessionSelection of sessionSelections) {
      const key = formatSessionSelectionLabel(sessionSelection);
      const match = sessionBackupIndex.get(key);
      if (!match) {
        validationItems.push({
          id: `bundle-session-missing-package-${key}`,
          label: `${sessionSelection.sessionId} existing backup package`,
          severity: "warning",
          detail: "No existing session backup package is available. Bundle generation will preserve an unresolved member reference plus metadata snapshot instead of silently omitting the session.",
        });
      }

      memberReferences.push({
        id: `sessions:${key}`,
        category: "sessions",
        label: sessionSelection.sessionId || "unresolved-session",
        referenceType: "session-backup-package",
        referenceId: key,
        status: match ? "resolved" : "missing-package",
        detail: match
          ? `Reuse existing session backup package ${match.backupId}.`
          : "No existing session backup package is available for this selected session yet. This is expected until the session has been backed up.",
        backupId: match?.backupId,
        snapshot: createSnapshot({
          id: key,
          label: sessionSelection.sessionId || "unresolved-session",
          category: "sessions",
          scope: "project",
          subtype: "session-backup-package",
          provenanceSummary: sessionSelection.source
            ? `Selected from ${sessionSelection.source}${sessionSelection.rootId ? ` / ${sessionSelection.rootId}` : ""}.`
            : "Selected session provenance is incomplete.",
          status: match ? "resolved" : "missing-package",
          capturedAt: match?.createdAt,
        }),
      });
    }
  }

  const contextAssets = buildContextAssetReferences(selection);
  memberReferences.push(...contextAssets.memberReferences);
  validationItems.push(...contextAssets.validationItems);

  if (packageInfo) {
    memberReferences.push({
      id: "package-metadata:self",
      category: "package-metadata",
      label: packageInfo.packageName,
      referenceType: "package-metadata",
      referenceId: packageInfo.packageName,
      status: "resolved",
      detail: "Include package-level metadata snapshot for the current app package.",
      snapshot: createSnapshot({
        id: packageInfo.packageName,
        label: packageInfo.packageName,
        category: "package-metadata",
        scope: "package",
        provenanceSummary: packageInfo.repository,
        status: "active",
      }),
    });
  }

  if (packageInfo) {
    memberReferences.push({
      id: "project-metadata:self",
      category: "project-metadata",
      label: packageInfo.projectName,
      referenceType: "project-metadata",
      referenceId: packageInfo.workspacePath,
      status: "resolved",
      detail: "Include project-level metadata snapshot for the current workspace.",
      snapshot: createSnapshot({
        id: packageInfo.workspacePath,
        label: packageInfo.projectName,
        category: "project-metadata",
        scope: "project",
        provenanceSummary: packageInfo.workspacePath,
        status: "active",
      }),
    });
  }

  const memberInventoryStatusByCategory = new Map<ProjectBundleMemberCategory, ProjectBundleMemberStatus>();
  const promoteCategoryStatus = (category: ProjectBundleMemberCategory, next: ProjectBundleMemberStatus) => {
    const current = memberInventoryStatusByCategory.get(category);
    if (current === "blocked") return;
    if (current === "warning" && next === "ready") return;
    if (current === "ready" && next === "ready") return;
    if (current === "warning" && next === "blocked") {
      memberInventoryStatusByCategory.set(category, "blocked");
      return;
    }
    if (!current) {
      memberInventoryStatusByCategory.set(category, next);
      return;
    }
    if (current === "ready" && (next === "warning" || next === "blocked")) {
      memberInventoryStatusByCategory.set(category, next);
    }
  };

  for (const reference of memberReferences) {
    promoteCategoryStatus(reference.category, reference.status === "resolved" ? "ready" : "warning");
  }

  for (const item of validationItems) {
    if (item.id.startsWith("bundle-session-")) {
      promoteCategoryStatus("sessions", item.severity === "block" ? "blocked" : "warning");
    } else if (item.id.startsWith("bundle-package-metadata-")) {
      promoteCategoryStatus("package-metadata", item.severity === "block" ? "blocked" : "warning");
      promoteCategoryStatus("project-metadata", item.severity === "block" ? "blocked" : "warning");
    } else {
      const categoryPrefix = PROJECT_BUNDLE_MEMBER_CATEGORIES.find((category) => item.id.startsWith(`bundle-${category}-`));
      if (categoryPrefix) {
        promoteCategoryStatus(categoryPrefix, item.severity === "block" ? "blocked" : "warning");
      }
    }
  }

  const memberInventory: ProjectBundleMemberInventoryItem[] = PROJECT_BUNDLE_MEMBER_CATEGORIES.map((category) => {
    const selected =
      category === "package-metadata" || category === "project-metadata"
        ? true
        : selection.includedCategories[category];
    const includedCount =
      !selected
        ? 0
        : category === "sessions"
        ? sessionSelections.length
        : memberReferences.filter((item) => item.category === category).length;
    const status = selected ? memberInventoryStatusByCategory.get(category) ?? "ready" : "ready";

    return {
      category,
      selected,
      includedCount,
      status,
      detail: !selected
        ? "Excluded from bundle composition."
        : includedCount === 0
          ? "Selected with no resolved members yet."
          : `${includedCount} member reference${includedCount === 1 ? "" : "s"} included.`,
    };
  });

  const validation = deriveValidationResult(validationItems);
  const summary = buildProjectBundleValidationSummary({
    validationItems,
    memberReferences,
    memberInventory,
    selectedCategoryCount: selectedCategories.length,
    selectedSessionCount: sessionSelections.length,
  });

  const packageId = createPackageId();
  const packageMetadata: ProjectBundlePackageMetadata = {
    packageId,
    schemaVersion: "project-bundle/v1",
    createdAt: now,
    createdBy: "agent-storage-manager",
    bundleName: configuration.bundleName.trim(),
    notes: configuration.notes?.trim() || undefined,
  };

  const projectMetadata: ProjectBundleProjectMetadata = {
    projectName: packageInfo?.projectName ?? "unknown-project",
    workspacePath: packageInfo?.workspacePath ?? process.cwd(),
    repository: packageInfo?.repository,
    packageName: packageInfo?.packageName ?? "unknown-package",
    packageVersion: packageInfo?.packageVersion ?? "0.0.0",
    originCue: selection.originCue,
    scopeHint: selection.scopeHint,
    filterHint: selection.filterHint,
    objectRefs: selection.objectRefs,
  };

  return {
    validation,
    summary,
    memberInventory,
    memberReferences,
    packageMetadata,
    projectMetadata,
  };
}

function createBundleDocument(input: ComposeProjectBundleResult): ProjectBundleDocument {
  return {
    manifest: {
      schemaVersion: "project-bundle/v1",
      packageId: input.packageMetadata.packageId,
      createdAt: input.packageMetadata.createdAt,
      memberInventory: input.memberInventory,
      memberReferences: input.memberReferences,
      validationSummary: input.summary,
    },
    packageMetadata: input.packageMetadata,
    projectMetadata: input.projectMetadata,
    memberInventory: input.memberInventory,
    memberReferences: input.memberReferences,
    validationSummary: input.summary,
  };
}

export async function validateProjectBundle(
  selection: ProjectBundleSelectionState,
  configuration: ProjectBundleConfiguration
): Promise<ProjectBundleValidationResponse> {
  const composed = await composeProjectBundle(selection, configuration);
  return {
    validation: composed.validation,
    summary: composed.summary,
    memberInventory: composed.memberInventory,
    memberReferences: composed.memberReferences,
  };
}

export async function generateProjectBundle(
  selection: ProjectBundleSelectionState,
  configuration: ProjectBundleConfiguration
): Promise<ProjectBundleGenerateResponse> {
  const composed = await composeProjectBundle(selection, configuration);
  if (composed.validation.status === "invalid") {
    throw new Error("Project bundle generation requires a structurally valid composition.");
  }

  const bundle = createBundleDocument(composed);
  await fs.mkdir(getProjectBundlesRoot(), { recursive: true });
  const filePath = path.join(getProjectBundlesRoot(), `${composed.packageMetadata.packageId}.bundle.json`);
  await fs.writeFile(filePath, JSON.stringify(bundle, null, 2), "utf8");

  return {
    validation: composed.validation,
    summary: composed.summary,
    memberInventory: composed.memberInventory,
    memberReferences: composed.memberReferences,
    packageId: composed.packageMetadata.packageId,
    filePath,
  };
}
