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

const readSessionBackupPackageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/sessionBackupService", () => ({
  readSessionBackupPackage: (...args: unknown[]) => readSessionBackupPackageMock(...args),
}));

import {
  createDefaultProjectBundleSelection,
  type ProjectBundleConfiguration,
} from "@/lib/backupMigration";
import { generateProjectBundle, validateProjectBundle } from "@/lib/server/projectBundleService";

let tmpDir: string;
const originalBundleRoot = process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT;
const originalBackupRoot = process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-project-bundle-"));
  process.env.AGENT_STORAGE_MANAGER_PROJECT_BUNDLE_ROOT = path.join(tmpDir, "project-bundles");
  process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT = path.join(tmpDir, "backups");
  await fs.mkdir(process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT, { recursive: true });
  readSessionBackupPackageMock.mockReset();
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

describe("project bundle service", () => {
  it("returns a warning and unresolved reference when a selected session has no existing backup", async () => {
    readSessionBackupPackageMock.mockRejectedValue(new Error("missing"));

    const result = await validateProjectBundle(makeSelection(), makeConfig());

    expect(result.validation.status).toBe("valid-with-warnings");
    expect(result.validation.items.some((item) => item.id.startsWith("bundle-session-missing-package-"))).toBe(true);
    const sessionReference = result.memberReferences.find((item) => item.category === "sessions");
    expect(sessionReference?.status).toBe("missing-package");
    expect(sessionReference?.detail).toContain("expected until the session has been backed up");
  });

  it("generates a real local bundle file with the expected minimum structure", async () => {
    await fs.mkdir(path.join(process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT!, "backup-001"), { recursive: true });
    readSessionBackupPackageMock.mockResolvedValue({
      manifest: {
        backupId: "backup-001",
        createdAt: "2026-04-16T10:00:00.000Z",
      },
      records: [
        {
          session: {
            id: "session-1",
            source: "codex",
            rootId: "root-1",
          },
        },
      ],
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

  it("blocks generation when bundle identity is structurally invalid", async () => {
    readSessionBackupPackageMock.mockRejectedValue(new Error("missing"));

    await expect(
      generateProjectBundle(makeSelection(), makeConfig({ bundleName: "" }))
    ).rejects.toThrow(/structurally valid composition/i);
  });
});
