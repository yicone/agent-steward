import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SessionRecord } from "../src/lib/sessionRecord";
import { attachSessionRecord, createWorkItem, listWorkItems, readSessionEvidenceSnapshot, readWorkItem, updateWorkItem } from "../src/lib/server/workItemStore";
import type { WorkItem } from "../src/lib/workContinuity";

let tmpDir: string;
const originalRoot = process.env.AGENT_STEWARD_WORK_ITEM_ROOT;

function makeRecord(): SessionRecord {
  return {
    schemaVersion: "session-record/v1",
    session: { id: "session-1", source: "codex", title: "Fix issue" },
    sourceRef: { kind: "file", locator: "sessions/session-1.jsonl" },
    provenance: { capturedBy: "agent-steward", capturedAt: "2026-09-19T01:00:00Z" },
    timestamps: { capturedAt: "2026-09-19T01:00:00Z" },
    summary: { totalSteps: 1, renderedEvents: 1, userCount: 1, assistantCount: 0, thoughtCount: 0, toolCount: 0, commandCount: 0, subagentCount: 0, errorCount: 0 },
    events: [{ id: "e1", index: 0, source: "codex", kind: "user", stepType: "message", title: "Fix issue", text: "Please fix it" }]
  };
}

function makeItem(): WorkItem {
  return {
    schemaVersion: "work-item/v1",
    id: "work-1",
    project: { rootPath: tmpDir },
    goal: { value: "Fix issue", confidence: "observed" },
    status: "captured",
    createdAt: "2026-09-19T01:00:00Z",
    updatedAt: "2026-09-19T01:00:00Z"
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-steward-work-item-"));
  process.env.AGENT_STEWARD_WORK_ITEM_ROOT = path.join(tmpDir, "managed");
});

afterEach(async () => {
  if (originalRoot === undefined) delete process.env.AGENT_STEWARD_WORK_ITEM_ROOT;
  else process.env.AGENT_STEWARD_WORK_ITEM_ROOT = originalRoot;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("work item store", () => {
  it("persists atomically and caches bounded session evidence", async () => {
    const created = await createWorkItem(makeItem(), { sessionRecord: makeRecord() });
    expect(created.version).toBe(1);
    expect((await readWorkItem("work-1")).id).toBe("work-1");
    expect((await readSessionEvidenceSnapshot("work-1"))?.sessionId).toBe("session-1");
    expect((await listWorkItems()).map((item) => item.id)).toEqual(["work-1"]);
  });

  it("guards stale updates and rejects traversal IDs", async () => {
    await createWorkItem(makeItem());
    await expect(updateWorkItem("work-1", { status: "organized" }, { expectedVersion: 99 })).rejects.toThrow("version conflict");
    await expect(readWorkItem("../escape")).rejects.toThrow();
  });

  it("attaches multiple bounded sessions and keeps the first snapshot compatible", async () => {
    await createWorkItem(makeItem(), { sessionRecord: makeRecord() });
    const second = { ...makeRecord(), session: { ...makeRecord().session, id: "session-2", title: "Second" } };
    const updated = await attachSessionRecord("work-1", { id: "session-codex-session-2", source: "codex", sessionId: "session-2", attachedAt: "2026-09-19T02:00:00Z", confidence: "observed" }, second);
    expect(updated.sessions).toHaveLength(2);
    expect(updated.sessionEvidenceSnapshots).toHaveLength(2);
    expect(updated.evidence?.map((item) => item.kind)).toEqual(["session", "session"]);
    await expect(attachSessionRecord("work-1", { id: "duplicate", source: "codex", sessionId: "session-2", attachedAt: "2026-09-19T02:00:00Z", confidence: "observed" }, second)).rejects.toThrow("already attached");
  });
});
