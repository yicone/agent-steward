import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/contextAssets", () => ({
  createContextAssetSeeds: () => [
    {
      id: "asset-rule-project-codex",
      title: "Project Rule",
      subtype: "rule",
      scope: "project",
      provenance: "Imported from project context.",
      status: "active",
    },
  ],
}));

import {
  createDefaultProjectBundleSelection,
  type ProjectBundleConfiguration,
} from "@/lib/backupMigration";
import { buildSessionBackupManifest, serializeSessionBackupManifest, serializeSessionRecord } from "@/lib/sessionBackup";
import { generateProjectBundle, validateProjectBundle } from "@/lib/server/projectBundleService";

let tmpDir: string;
const originalBundleRoot = process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT;
const originalBackupRoot = process.env.AGENT_SWITCH_BACKUP_ROOT;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-project-bundle-"));
  process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT = path.join(tmpDir, "project-bundles");
  process.env.AGENT_SWITCH_BACKUP_ROOT = path.join(tmpDir, "backups");
  await fs.mkdir(process.env.AGENT_SWITCH_BACKUP_ROOT, { recursive: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (originalBundleRoot === undefined) {
    delete process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT;
  } else {
    process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT = originalBundleRoot;
  }
  if (originalBackupRoot === undefined) {
    delete process.env.AGENT_SWITCH_BACKUP_ROOT;
  } else {
    process.env.AGENT_SWITCH_BACKUP_ROOT = originalBackupRoot;
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeSelection() {
  return createDefaultProjectBundleSelection(
    {
      origin: "overview",
      subtitle: "Open Project Bundle from overview.",
      workflowType: "project-bundle",
      projectBundleScopeHint: "overview-routed project context",
    },
    [
      {
        sessionId: "session-1",
        source: "codex",
        rootId: "root-1",
      },
    ]
  );
}

function makeConfig(overrides?: Partial<ProjectBundleConfiguration>): ProjectBundleConfiguration {
  return {
    bundleName: "Current project context bundle",
    notes: "QA bundle",
    ...overrides,
  };
}

async function writeBackupPackage(input: {
  backupId: string;
  createdAt: string;
  sessionId: string;
  source: "codex" | "windsurf" | "antigravity";
  rootId?: string;
}) {
  const backupDir = path.join(process.env.AGENT_SWITCH_BACKUP_ROOT!, input.backupId);
  await fs.mkdir(path.join(backupDir, "sessions"), { recursive: true });
  const manifest = buildSessionBackupManifest([
    {
      sessionId: input.sessionId,
      path: `sessions/${input.sessionId}.record.json`,
      includesSourceCopy: false,
    },
  ]);
  manifest.backupId = input.backupId;
  manifest.createdAt = input.createdAt;
  await fs.writeFile(path.join(backupDir, "manifest.json"), serializeSessionBackupManifest(manifest), "utf8");
  await fs.writeFile(
    path.join(backupDir, "sessions", `${input.sessionId}.record.json`),
    serializeSessionRecord({
      schemaVersion: "session-record/v1",
      session: {
        id: input.sessionId,
        source: input.source,
        rootId: input.rootId,
        title: "Fixture session",
      },
      sourceRef: {
        kind: "file",
        locator: path.join(tmpDir, `${input.sessionId}.jsonl`),
      },
      provenance: {
        capturedBy: "agent-storage-manager",
        capturedAt: input.createdAt,
      },
      timestamps: {
        capturedAt: input.createdAt,
      },
      summary: {
        totalSteps: 0,
        renderedEvents: 0,
        userCount: 0,
        assistantCount: 0,
        thoughtCount: 0,
        toolCount: 0,
        commandCount: 0,
        subagentCount: 0,
        errorCount: 0,
      },
      events: [],
    }),
    "utf8"
  );
}

async function writeIncompleteUnrelatedBackupPackage(input: {
  backupId: string;
  sessionId: string;
}) {
  const backupDir = path.join(process.env.AGENT_SWITCH_BACKUP_ROOT!, input.backupId);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(
    path.join(backupDir, "manifest.json"),
    JSON.stringify({
      schemaVersion: "session-backup/v1",
      backupId: input.backupId,
      createdAt: "2026-04-16T08:00:00.000Z",
      createdBy: "agent-storage-manager",
      sessionCount: 1,
      records: [
        {
          sessionId: input.sessionId,
          path: "sessions/missing.record.json",
          includesSourceCopy: false,
        },
      ],
    }),
    "utf8"
  );
}

describe("project bundle service", () => {
  it("returns a warning and unresolved reference when a selected session has no existing backup", async () => {
    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("valid-with-warnings");
    expect(result.validation.items.some((item) => item.id.startsWith("bundle-session-missing-package-"))).toBe(true);
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");
    expect(sessionReference?.status).toBe("missing-package");
    expect(sessionReference?.detail).toContain("expected until the session has been backed up");
  });

  it("generates a real local bundle file with the expected minimum structure", async () => {
    await writeBackupPackage({
      backupId: "backup-001",
      createdAt: "2026-04-16T10:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const generated = await generateProjectBundle(makeSelection(), makeConfig());
    const raw = await fs.readFile(generated.filePath, "utf8");
    const document = JSON.parse(raw) as Record<string, unknown>;

    expect(generated.validation.status).toBe("valid");
    expect(generated.createdAt).toMatch(/^20/);
    expect(document.manifest).toBeTruthy();
    expect(document.packageMetadata).toBeTruthy();
    expect(document.projectMetadata).toBeTruthy();
    expect(document.memberInventory).toBeTruthy();
    expect(document.memberReferences).toBeTruthy();
    expect(document.validationSummary).toBeTruthy();
    expect(generated.filePath).toContain("project-bundles");
  });

  it("prefers the newest matching session backup package when multiple matches exist", async () => {
    await writeBackupPackage({
      backupId: "backup-old",
      createdAt: "2026-04-16T09:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });
    await writeBackupPackage({
      backupId: "backup-new",
      createdAt: "2026-04-16T10:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");

    expect(sessionReference?.backupId).toBe("backup-new");
    expect(sessionReference?.detail).toContain("backup-new");
  });

  it("keeps newest-match selection stable when traversal sees an older match first", async () => {
    await writeBackupPackage({
      backupId: "aaa-old",
      createdAt: "2026-04-16T09:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });
    await writeBackupPackage({
      backupId: "zzz-new",
      createdAt: "2026-04-16T11:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");

    expect(sessionReference?.backupId).toBe("zzz-new");
    expect(result.summary.resolvedReferenceCount).toBeGreaterThan(0);
  });

  it("uses backup id as a deterministic tie-breaker when matching timestamps are equal", async () => {
    await writeBackupPackage({
      backupId: "aaa-same-time",
      createdAt: "2026-04-16T11:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });
    await writeBackupPackage({
      backupId: "zzz-same-time",
      createdAt: "2026-04-16T11:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");

    expect(sessionReference?.backupId).toBe("zzz-same-time");
  });

  it("compares backup timestamps numerically before using backup id tie-breaker", async () => {
    await writeBackupPackage({
      backupId: "zzz-offset-time",
      createdAt: "2026-04-16T12:00:00+02:00",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });
    await writeBackupPackage({
      backupId: "aaa-utc-later",
      createdAt: "2026-04-16T10:30:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");

    expect(sessionReference?.backupId).toBe("aaa-utc-later");
  });

  it("does not expose the raw workspace path in validation member references", async () => {
    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(process.cwd());
    const projectReference = result.memberReferences.find((item) => item.category === "project-metadata");
    expect(projectReference?.referenceId).toBe(path.basename(process.cwd()));
    expect(projectReference?.snapshot?.provenanceSummary).toBe("Current workspace metadata.");
  });

  it("matches backup packages by source and root identity, not session id alone", async () => {
    await writeBackupPackage({
      backupId: "backup-wrong-root",
      createdAt: "2026-04-16T12:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "other-root",
    });
    await writeBackupPackage({
      backupId: "backup-right-root",
      createdAt: "2026-04-16T10:00:00.000Z",
      sessionId: "session-1",
      source: "codex",
      rootId: "root-1",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");

    expect(sessionReference?.backupId).toBe("backup-right-root");
  });

  it("ignores incomplete unrelated backup packages instead of failing validation", async () => {
    await writeIncompleteUnrelatedBackupPackage({
      backupId: "backup-unrelated",
      sessionId: "other-session",
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("valid-with-warnings");
    expect(result.validation.items.some((item) => item.id.startsWith("bundle-session-missing-package-"))).toBe(true);
  });

  it("blocks generation when bundle identity is structurally invalid", async () => {
    await expect(
      generateProjectBundle(makeSelection(), makeConfig({ bundleName: "" }))
    ).rejects.toThrow(/structurally valid composition/i);
  });

  it("marks both package and project metadata categories blocked when package metadata cannot be read", async () => {
    const originalCwd = process.cwd();
    const missingWorkspace = path.join(tmpDir, "missing-workspace");
    await fs.mkdir(missingWorkspace, { recursive: true });
    process.chdir(missingWorkspace);

    try {
      const result = await validateProjectBundle(makeSelection(), makeConfig());
      const packageMetadata = result.memberInventory.find((item) => item.category === "package-metadata");
      const projectMetadata = result.memberInventory.find((item) => item.category === "project-metadata");

      expect(result.validation.items.some((item) => item.id === "bundle-package-metadata-missing")).toBe(true);
      expect(
        result.validation.items.find((item) => item.id === "bundle-package-metadata-missing")?.detail
      ).toBe("Required package metadata could not be read from the current workspace.");
      expect(packageMetadata?.status).toBe("blocked");
      expect(projectMetadata?.status).toBe("blocked");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("blocks validation when the bundle root path is not a writable directory", async () => {
    const bundleRoot = process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT!;
    await fs.writeFile(bundleRoot, "not-a-directory", "utf8");

    try {
      const result = await validateProjectBundle(makeSelection(), makeConfig());
      const outputBlocker = result.validation.items.find((item) => item.id === "bundle-output-root-unwritable");
      expect(outputBlocker).toBeTruthy();
      expect(outputBlocker?.label).toBe("Project bundle output destination");
      expect(outputBlocker?.detail).not.toContain(tmpDir);
      expect(result.validation.status).toBe("invalid");
      expect(result.memberInventory.find((item) => item.category === "package-metadata")?.status).not.toBe("blocked");
    } finally {
      await fs.rm(bundleRoot, { force: true });
    }
  });

  it("blocks validation when a missing output root has a non-directory ancestor", async () => {
    const blockedAncestor = path.join(tmpDir, "not-a-directory");
    await fs.writeFile(blockedAncestor, "not a directory", "utf8");
    process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT = path.join(blockedAncestor, "project-bundles");

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-output-root-unwritable")).toBe(true);
  });

  it("blocks validation when output root lstat fails with a permission error", async () => {
    const bundleRoot = process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT!;
    const originalLstat = fs.lstat.bind(fs);
    vi.spyOn(fs, "lstat").mockImplementation(async (target, options) => {
      if (String(target) === bundleRoot) {
        const error = new Error("permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      return originalLstat(target, options);
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-output-root-unwritable")).toBe(true);
  });

  it("blocks validation when the configured output root is a broken symlink", async () => {
    const bundleRoot = process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT!;
    await fs.symlink(path.join(tmpDir, "missing-target"), bundleRoot, "dir");

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-output-root-unwritable")).toBe(true);
  });

  it("blocks validation when a missing output root has a broken symlink ancestor", async () => {
    const brokenAncestor = path.join(tmpDir, "broken-ancestor");
    await fs.symlink(path.join(tmpDir, "missing-target"), brokenAncestor, "dir");
    process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT = path.join(brokenAncestor, "project-bundles");

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-output-root-unwritable")).toBe(true);
  });

  it("blocks validation when an existing output root ancestor is not accessible", async () => {
    const inaccessibleAncestor = path.join(tmpDir, "inaccessible");
    await fs.mkdir(inaccessibleAncestor, { recursive: true });
    process.env.AGENT_SWITCH_PROJECT_BUNDLE_ROOT = path.join(inaccessibleAncestor, "project-bundles");
    const originalAccess = fs.access.bind(fs);
    vi.spyOn(fs, "access").mockImplementation(async (target, mode) => {
      if (String(target) === inaccessibleAncestor) {
        const error = new Error("operation not permitted") as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      }
      return originalAccess(target, mode);
    });

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-output-root-unwritable")).toBe(true);
  });

  it("blocks validation when no selectable project bundle category is selected", async () => {
    const selection = makeSelection();
    selection.includedCategories = {
      sessions: false,
      rules: false,
      memory: false,
      skills: false,
      commands: false,
    };

    const result = await validateProjectBundle(selection, makeConfig());

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.id === "bundle-no-categories")).toBe(true);
    expect(result.summary.blockerCount).toBeGreaterThan(0);
  });
});
