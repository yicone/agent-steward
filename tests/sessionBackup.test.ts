import { describe, expect, it } from "vitest";

import {
  buildSessionBackupManifest,
  parseSessionBackupManifest,
  parseSessionRecord,
  serializeSessionBackupManifest,
  serializeSessionRecord,
  validateSessionBackupManifest,
  validateSessionRecord
} from "../src/lib/sessionBackup";
import type { SessionBackupManifest, SessionRecord } from "../src/lib/sessionRecord";

function makeSessionRecord(): SessionRecord {
  return {
    schemaVersion: "session-record/v1",
    session: {
      id: "rollout-123",
      source: "codex",
      title: "Review uncommitted changes"
    },
    sourceRef: {
      kind: "file",
      locator: "/tmp/rollout-123.jsonl"
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

describe("session backup manifest", () => {
  it("builds a v1 manifest for records", () => {
    const manifest = buildSessionBackupManifest([
      { sessionId: "abc", path: "sessions/abc.record.json", includesSourceCopy: false }
    ]);

    expect(manifest.schemaVersion).toBe("session-backup/v1");
    expect(manifest.createdBy).toBe("agent-steward");
    expect(manifest.sessionCount).toBe(1);
    expect(manifest.records).toEqual([
      { sessionId: "abc", path: "sessions/abc.record.json", includesSourceCopy: false }
    ]);
  });

  it("serializes and parses a valid manifest", () => {
    const json = serializeSessionBackupManifest(
      buildSessionBackupManifest([{ sessionId: "abc", path: "sessions/abc.record.json", includesSourceCopy: false }])
    );
    const parsed = parseSessionBackupManifest(json);

    expect(parsed.schemaVersion).toBe("session-backup/v1");
    expect(parsed.records[0]?.sessionId).toBe("abc");
  });

  it("rejects a manifest with mismatched session counts", () => {
    const manifest: SessionBackupManifest = {
      schemaVersion: "session-backup/v1",
      backupId: "b1",
      createdAt: "2026-04-10T10:01:00.000Z",
      createdBy: "agent-storage-manager",
      sessionCount: 2,
      records: [{ sessionId: "abc", path: "sessions/abc.record.json", includesSourceCopy: false }]
    };

    expect(() => validateSessionBackupManifest(manifest)).toThrow(/sessionCount/i);
  });

  it("rejects unsupported manifest schema versions", () => {
    expect(() =>
      parseSessionBackupManifest(
        JSON.stringify({
          schemaVersion: "session-backup/v0",
          backupId: "b1",
          createdAt: "2026-04-10T10:01:00.000Z",
          createdBy: "agent-storage-manager",
          sessionCount: 0,
          records: []
        })
      )
    ).toThrow(/Unsupported session backup schema version/i);
  });
});

describe("session record serialization", () => {
  it("serializes and parses a valid session record", () => {
    const record = makeSessionRecord();
    const json = serializeSessionRecord(record);
    const parsed = parseSessionRecord(json);

    expect(parsed.schemaVersion).toBe("session-record/v1");
    expect(parsed.session.id).toBe("rollout-123");
    expect(parsed.sourceRef.locator).toBe("/tmp/rollout-123.jsonl");
  });

  it("rejects unsupported session record schema versions", () => {
    expect(() =>
      parseSessionRecord(
        JSON.stringify({
          ...makeSessionRecord(),
          schemaVersion: "session-record/v0"
        })
      )
    ).toThrow(/Unsupported session record schema version/i);
  });

  it("rejects records that omit required fields", () => {
    const record = makeSessionRecord();
    delete (record.sourceRef as Partial<SessionRecord["sourceRef"]>).locator;

    expect(() => validateSessionRecord(record)).toThrow(/sourceRef\.kind and sourceRef\.locator/i);
  });
});
