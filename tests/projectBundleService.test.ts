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
const originalBundleRoot = process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT;
const originalBackupRoot = process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-project-bundle-"));
  process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT = path.join(tmpDir, "project-bundles");
  process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT = path.join(tmpDir, "backups");
  await fs.mkdir(process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT, { recursive: true });
});

afterEach(async () => {
  if (originalBundleRoot === undefined) {
    delete process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT;
  } else {
    process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT = originalBundleRoot;
  }
  if (originalBackupRoot === undefined) {
    delete process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;
  } else {
    process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT = originalBackupRoot;
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
  const backupDir = path.join(process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT!, input.backupId);
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
      expect(packageMetadata?.status).toBe("blocked");
      expect(projectMetadata?.status).toBe("blocked");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
