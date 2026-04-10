import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { importSessionBackupPackage, readSessionBackupPackage, writeSessionBackupPackage } from "../src/lib/server/sessionBackupService";
import type { SessionRecord } from "../src/lib/sessionRecord";

let tmpDir: string;
let sourceRoot: string;
const originalBackupRoot = process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;

function makeRecord(): SessionRecord {
  return {
    schemaVersion: "session-record/v1",
    session: {
      id: "rollout-123",
      source: "codex",
      title: "Review uncommitted changes"
    },
    sourceRef: {
      kind: "file",
      locator: path.join(sourceRoot, "rollout-123.jsonl")
    },
    provenance: {
      capturedBy: "agent-storage-manager",
      capturedAt: "2026-04-10T10:01:00.000Z"
    },
    timestamps: {
      capturedAt: "2026-04-10T10:01:00.000Z"
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
      errorCount: 0
    },
    events: []
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-backup-service-"));
  sourceRoot = path.join(tmpDir, "source");
  process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT = path.join(tmpDir, "managed-backups");
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.writeFile(path.join(sourceRoot, "rollout-123.jsonl"), '{"type":"session_meta"}\n', "utf8");
});

afterEach(async () => {
  if (originalBackupRoot === undefined) {
    delete process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;
  } else {
    process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT = originalBackupRoot;
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("session backup service", () => {
  it("writes manifest and record files only under the managed backup root", async () => {
    const result = await writeSessionBackupPackage({
      backupId: "backup-001",
      records: [makeRecord()]
    });

    expect(result.manifestPath).toBe(path.join(tmpDir, "managed-backups", "backup-001", "manifest.json"));
    expect(result.backupDir).toBe(path.join(tmpDir, "managed-backups", "backup-001"));

    const manifestExists = await fs
      .stat(path.join(tmpDir, "managed-backups", "backup-001", "manifest.json"))
      .then(() => true)
      .catch(() => false);
    const recordExists = await fs
      .stat(path.join(tmpDir, "managed-backups", "backup-001", "sessions", "rollout-123.record.json"))
      .then(() => true)
      .catch(() => false);

    expect(manifestExists).toBe(true);
    expect(recordExists).toBe(true);
  });

  it("does not mutate the original source root during backup", async () => {
    await writeSessionBackupPackage({
      backupId: "backup-002",
      records: [makeRecord()]
    });

    const sourceEntries = await fs.readdir(sourceRoot);
    expect(sourceEntries).toEqual(["rollout-123.jsonl"]);
    const sourceContents = await fs.readFile(path.join(sourceRoot, "rollout-123.jsonl"), "utf8");
    expect(sourceContents).toBe('{"type":"session_meta"}\n');
  });

  it("reads and imports a valid backup package", async () => {
    await writeSessionBackupPackage({
      backupId: "backup-003",
      records: [makeRecord()],
      sourceCopies: [{ sessionId: "rollout-123", relativePath: "original.jsonl", content: '{"type":"session_meta"}\n' }]
    });

    const readBack = await readSessionBackupPackage("backup-003");
    expect(readBack.manifest.sessionCount).toBe(1);
    expect(readBack.records[0]?.session.id).toBe("rollout-123");

    const imported = await importSessionBackupPackage("backup-003");
    expect(imported.importedAt).toMatch(/T/);
    expect(imported.records[0]?.schemaVersion).toBe("session-record/v1");
  });

  it("rejects a backup package with a tampered record checksum", async () => {
    await writeSessionBackupPackage({
      backupId: "backup-004",
      records: [makeRecord()]
    });

    await fs.writeFile(
      path.join(tmpDir, "managed-backups", "backup-004", "sessions", "rollout-123.record.json"),
      JSON.stringify({
        ...makeRecord(),
        session: {
          ...makeRecord().session,
          title: "tampered"
        }
      }, null, 2),
      "utf8"
    );

    await expect(readSessionBackupPackage("backup-004")).rejects.toThrow(/checksum mismatch/i);
  });

  it("rejects source-copy paths that escape the managed backup root", async () => {
    await expect(
      writeSessionBackupPackage({
        backupId: "backup-005",
        records: [makeRecord()],
        sourceCopies: [
          {
            sessionId: "rollout-123",
            relativePath: "../../../source-root-overwrite.jsonl",
            content: "tamper"
          }
        ]
      })
    ).rejects.toThrow(/escapes managed backup root/i);

    const sourceEntries = await fs.readdir(sourceRoot);
    expect(sourceEntries).toEqual(["rollout-123.jsonl"]);
  });

  it("rejects backupIds that are not simple managed-directory names", async () => {
    await expect(
      writeSessionBackupPackage({
        backupId: "../backup-006",
        records: [makeRecord()]
      })
    ).rejects.toThrow(/Invalid backupId/i);
  });

  it("rejects manifest record paths that escape the package during read", async () => {
    const managedRoot = path.join(tmpDir, "managed-backups");
    const backupDir = path.join(managedRoot, "backup-007");
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(
      path.join(backupDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: "session-backup/v1",
        backupId: "backup-007",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: [
          {
            sessionId: "rollout-123",
            path: "../outside.record.json",
            sha256: "deadbeef",
            includesSourceCopy: false
          }
        ]
      }, null, 2),
      "utf8"
    );

    await expect(readSessionBackupPackage("backup-007")).rejects.toThrow(/escapes managed backup root/i);
  });
});
