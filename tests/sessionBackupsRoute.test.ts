import fs from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

const readConfigMock = vi.hoisted(() => vi.fn());
const getCodexConversationMock = vi.hoisted(() => vi.fn());
const getCodexRawContentMock = vi.hoisted(() => vi.fn());
const getTrajectoryMetaMapCachedMock = vi.hoisted(() => vi.fn());
const writeSessionBackupPackageMock = vi.hoisted(() => vi.fn());
const importSessionBackupPackageMock = vi.hoisted(() => vi.fn());
const readSessionBackupPackageMock = vi.hoisted(() => vi.fn());
const toSessionRecordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/config", () => ({
  readConfig: (...args: unknown[]) => readConfigMock(...args)
}));

vi.mock("@/lib/server/codex", () => ({
  getCodexConversation: (...args: unknown[]) => getCodexConversationMock(...args),
  getCodexRawContent: (...args: unknown[]) => getCodexRawContentMock(...args),
  validateRootId: (rawRootId: string | null) => {
    if (rawRootId === null) return undefined;
    const trimmed = rawRootId.trim();
    return trimmed === "" ? undefined : trimmed;
  }
}));

vi.mock("@/lib/server/antigravity", () => ({
  getAntigravityConversation: vi.fn()
}));

vi.mock("@/lib/server/windsurf", () => ({
  getWindsurfTrajectory: vi.fn()
}));

vi.mock("@/lib/server/metaCache", () => ({
  getTrajectoryMetaMapCached: (...args: unknown[]) => getTrajectoryMetaMapCachedMock(...args)
}));

vi.mock("@/lib/server/sessionBackupService", () => ({
  writeSessionBackupPackage: (...args: unknown[]) => writeSessionBackupPackageMock(...args),
  importSessionBackupPackage: (...args: unknown[]) => importSessionBackupPackageMock(...args),
  readSessionBackupPackage: (...args: unknown[]) => readSessionBackupPackageMock(...args)
}));

vi.mock("@/lib/sessionRecordMapper", () => ({
  toSessionRecord: (...args: unknown[]) => toSessionRecordMock(...args)
}));

// @ts-ignore
import { POST as createBackup } from "@/app/api/session-backups/route";
// @ts-ignore
import { POST as importBackup } from "@/app/api/session-backups/import/route";
// @ts-ignore
import { GET as getBackup } from "@/app/api/session-backups/[backupId]/route";

afterEach(() => {
  vi.restoreAllMocks();
  readConfigMock.mockReset();
  getCodexConversationMock.mockReset();
  getCodexRawContentMock.mockReset();
  getTrajectoryMetaMapCachedMock.mockReset();
  writeSessionBackupPackageMock.mockReset();
  importSessionBackupPackageMock.mockReset();
  readSessionBackupPackageMock.mockReset();
  toSessionRecordMock.mockReset();
});

describe("session backup routes", () => {
  it("creates a codex backup package", async () => {
    const config = {
      schemaVersion: 1,
      roots: [],
      windsurf: {},
      ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
    };
    const record = {
      schemaVersion: "session-record/v1",
      session: { id: "session-1", source: "codex", title: "Codex Session", cwd: "/workspace/project" },
      sourceRef: { kind: "file", locator: "/tmp/session-1.jsonl" },
      provenance: { capturedBy: "agent-storage-manager", capturedAt: "2026-04-10T10:00:00.000Z" },
      timestamps: { capturedAt: "2026-04-10T10:00:00.000Z" },
      summary: {
        totalSteps: 1,
        renderedEvents: 1,
        userCount: 1,
        assistantCount: 0,
        thoughtCount: 0,
        toolCount: 0,
        commandCount: 0,
        subagentCount: 0,
        errorCount: 0
      },
      events: []
    };

    readConfigMock.mockResolvedValue({ config });
    getTrajectoryMetaMapCachedMock.mockResolvedValue({
      "session-1": { title: "Codex Session", cwd: "/workspace/project" }
    });
    getCodexConversationMock.mockResolvedValue({
      events: [],
      summary: record.summary
    });
    getCodexRawContentMock.mockResolvedValue({
      filePath: "/tmp/session-1.jsonl",
      rawLines: [],
      truncated: false,
      returnedLines: 0,
      totalLines: 0
    });
    toSessionRecordMock.mockReturnValue(record);
    writeSessionBackupPackageMock.mockResolvedValue({
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: [
          {
            sessionId: "session-1",
            path: "sessions/session-1.record.json",
            includesSourceCopy: false
          }
        ]
      },
      records: [record]
    });

    const response = await createBackup(
      new Request("http://localhost/api/session-backups", {
        method: "POST",
        body: JSON.stringify({
          source: "codex",
          sessionId: "session-1",
          rootId: "root-1",
          includeSourceCopy: false
        })
      })
    );

    expect(response.status).toBe(200);
    expect(getCodexConversationMock).toHaveBeenCalledWith("session-1", config, { preferredRootId: "root-1" });
    expect(getCodexRawContentMock).toHaveBeenCalledWith("session-1", config, { preferredRootId: "root-1" });
    expect(toSessionRecordMock).toHaveBeenCalled();
    expect(writeSessionBackupPackageMock).toHaveBeenCalledWith({ records: [record] });

    expect(await response.json()).toEqual({
      backupId: "backup-1",
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: [
          {
            sessionId: "session-1",
            path: "sessions/session-1.record.json",
            includesSourceCopy: false
          }
        ]
      },
      sessions: [
        {
          sessionId: "session-1",
          source: "codex",
          title: "Codex Session",
          cwd: "/workspace/project",
          eventCount: 0
        }
      ]
    });
  });

  it("rejects includeSourceCopy before source copy support is implemented", async () => {
    readConfigMock.mockResolvedValue({
      config: {
        schemaVersion: 1,
        roots: [],
        windsurf: {},
        ui: { defaultSource: "windsurf", sortOrder: "mtime_desc" }
      }
    });
    getTrajectoryMetaMapCachedMock.mockResolvedValue({});

    const response = await createBackup(
      new Request("http://localhost/api/session-backups", {
        method: "POST",
        body: JSON.stringify({
          source: "windsurf",
          sessionId: "session-1",
          includeSourceCopy: true
        })
      })
    );

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      error: "includeSourceCopy is not implemented for source: windsurf",
      code: "SOURCE_COPY_UNSUPPORTED",
      title: "Source copy unavailable",
      hint: "Only Codex currently supports copy-only source preservation in v1."
    });
  });

  it("passes a codex source copy into the backup package when requested", async () => {
    const config = {
      schemaVersion: 1,
      roots: [],
      windsurf: {},
      ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
    };
    const record = {
      schemaVersion: "session-record/v1",
      session: { id: "session-1", source: "codex", title: "Codex Session", cwd: "/workspace/project" },
      sourceRef: { kind: "file", locator: "/tmp/session-1.jsonl" },
      provenance: { capturedBy: "agent-storage-manager", capturedAt: "2026-04-10T10:00:00.000Z" },
      timestamps: { capturedAt: "2026-04-10T10:00:00.000Z" },
      summary: {
        totalSteps: 1,
        renderedEvents: 1,
        userCount: 1,
        assistantCount: 0,
        thoughtCount: 0,
        toolCount: 0,
        commandCount: 0,
        subagentCount: 0,
        errorCount: 0
      },
      events: []
    };

    readConfigMock.mockResolvedValue({ config });
    getTrajectoryMetaMapCachedMock.mockResolvedValue({});
    getCodexConversationMock.mockResolvedValue({
      events: [],
      summary: record.summary
    });
    getCodexRawContentMock.mockResolvedValue({
      filePath: "/tmp/session-1.jsonl",
      rawLines: [],
      truncated: false,
      returnedLines: 0,
      totalLines: 0
    });
    toSessionRecordMock.mockReturnValue(record);
    writeSessionBackupPackageMock.mockResolvedValue({
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-2",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: [
          {
            sessionId: "session-1",
            path: "sessions/session-1.record.json",
            includesSourceCopy: true
          }
        ]
      },
      records: [record]
    });

    const readFileSpy = vi.spyOn(fs, "readFile").mockResolvedValue(Buffer.from('{"type":"session_meta"}\n'));

    const response = await createBackup(
      new Request("http://localhost/api/session-backups", {
        method: "POST",
        body: JSON.stringify({
          source: "codex",
          sessionId: "session-1",
          includeSourceCopy: true
        })
      })
    );

    expect(response.status).toBe(200);
    expect(readFileSpy).toHaveBeenCalledWith("/tmp/session-1.jsonl");
    expect(writeSessionBackupPackageMock).toHaveBeenCalledWith({
      records: [record],
      sourceCopies: [
        {
          sessionId: "session-1",
          relativePath: "session-1.jsonl",
          content: Buffer.from('{"type":"session_meta"}\n')
        }
      ]
    });
  });

  it("imports a managed backup package by backupId", async () => {
    importSessionBackupPackageMock.mockResolvedValue({
      importedAt: "2026-04-10T10:10:00.000Z",
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: []
      },
      records: [
        {
          session: {
            id: "session-1",
            source: "codex",
            title: "Codex Session",
            cwd: "/workspace/project"
          },
          events: []
        }
      ]
    });

    const response = await importBackup(
      new Request("http://localhost/api/session-backups/import", {
        method: "POST",
        body: JSON.stringify({ backupId: "backup-1" })
      })
    );

    expect(response.status).toBe(200);
    expect(importSessionBackupPackageMock).toHaveBeenCalledWith("backup-1");
    expect(await response.json()).toEqual({
      backupId: "backup-1",
      importedAt: "2026-04-10T10:10:00.000Z",
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: []
      },
      sessions: [
        {
          sessionId: "session-1",
          source: "codex",
          title: "Codex Session",
          cwd: "/workspace/project",
          eventCount: 0
        }
      ]
    });
  });

  it("returns verify metadata for an existing backup package", async () => {
    readSessionBackupPackageMock.mockResolvedValue({
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: []
      },
      records: [
        {
          session: {
            id: "session-1",
            source: "codex",
            title: "Codex Session",
            cwd: "/workspace/project"
          },
          events: []
        }
      ]
    });

    const response = await getBackup(new Request("http://localhost/api/session-backups/backup-1"), {
      params: { backupId: "backup-1" }
    });

    expect(response.status).toBe(200);
    expect(readSessionBackupPackageMock).toHaveBeenCalledWith("backup-1");
    expect(await response.json()).toEqual({
      backupId: "backup-1",
      verified: true,
      manifest: {
        schemaVersion: "session-backup/v1",
        backupId: "backup-1",
        createdAt: "2026-04-10T10:00:01.000Z",
        createdBy: "agent-storage-manager",
        sessionCount: 1,
        records: []
      },
      sessions: [
        {
          sessionId: "session-1",
          source: "codex",
          title: "Codex Session",
          cwd: "/workspace/project",
          eventCount: 0
        }
      ]
    });
  });

  it("surfaces invalid-package failures from verify", async () => {
    readSessionBackupPackageMock.mockRejectedValue(new Error("checksum mismatch"));

    const response = await getBackup(new Request("http://localhost/api/session-backups/backup-bad"), {
      params: { backupId: "backup-bad" }
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "checksum mismatch",
      code: "INVALID_BACKUP_PACKAGE",
      title: "Invalid backup package",
      hint: "Verify the package contents and checksums before retrying the import or verify action.",
      verified: false
    });
  });

  it("maps missing backup packages to not-found diagnostics for import", async () => {
    const missing = new Error("ENOENT: no such file or directory");
    Object.assign(missing, { code: "ENOENT" });
    importSessionBackupPackageMock.mockRejectedValue(missing);

    const response = await importBackup(
      new Request("http://localhost/api/session-backups/import", {
        method: "POST",
        body: JSON.stringify({ backupId: "backup-missing" })
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "The requested backup package could not be found in the managed backup store.",
      code: "BACKUP_NOT_FOUND",
      title: "Backup not found",
      hint: "Check the backup ID and verify the package still exists under the product-managed backup root."
    });
  });
});
