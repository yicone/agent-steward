import { describe, expect, it } from "vitest";

import { toSessionRecord } from "../src/lib/sessionRecordMapper";
import type { TrajectoryContent } from "../src/lib/types";

function makeTrajectoryContent(overrides?: Partial<TrajectoryContent>): TrajectoryContent {
  return {
    kind: "trajectory",
    source: "codex",
    events: [],
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
    ...overrides
  };
}

describe("toSessionRecord", () => {
  it("maps normalized trajectory content into session-record/v1", () => {
    const content = makeTrajectoryContent({
      events: [
        {
          id: "e1",
          index: 0,
          source: "codex",
          kind: "user",
          stepType: "user_message",
          title: "User",
          text: "Review these changes",
          createdAt: "2026-04-10T10:00:00.000Z"
        },
        {
          id: "e2",
          index: 1,
          source: "codex",
          kind: "assistant",
          stepType: "assistant_message",
          title: "Assistant",
          text: "I found two issues",
          createdAt: "2026-04-10T10:00:02.000Z",
          completedAt: "2026-04-10T10:00:05.000Z"
        }
      ],
      summary: {
        totalSteps: 2,
        renderedEvents: 2,
        userCount: 1,
        assistantCount: 1,
        thoughtCount: 0,
        toolCount: 0,
        commandCount: 0,
        subagentCount: 0,
        errorCount: 0
      }
    });

    const record = toSessionRecord({
      sessionId: "rollout-123",
      source: "codex",
      sourceRef: { kind: "file", locator: "/tmp/rollout-123.jsonl" },
      content,
      meta: {
        title: "Review uncommitted changes",
        cwd: "/Users/tr/Workspace/agent-storage-manager",
        gitBranch: "main",
        model: "gpt-5.4"
      },
      session: {
        sourceSessionId: "upstream-rollout-123",
        rootId: "root-codex"
      },
      provenance: {
        capturedAt: "2026-04-10T10:01:00.000Z",
        normalizerVersion: "test-normalizer"
      },
      extensions: {
        codex: {
          rootPath: "/tmp"
        }
      }
    });

    expect(record.schemaVersion).toBe("session-record/v1");
    expect(record.session).toEqual({
      id: "rollout-123",
      source: "codex",
      sourceSessionId: "upstream-rollout-123",
      rootId: "root-codex",
      title: "Review uncommitted changes",
      cwd: "/Users/tr/Workspace/agent-storage-manager",
      gitBranch: "main",
      model: "gpt-5.4"
    });
    expect(record.sourceRef).toEqual({
      kind: "file",
      locator: "/tmp/rollout-123.jsonl"
    });
    expect(record.provenance).toEqual({
      capturedBy: "agent-steward",
      capturedAt: "2026-04-10T10:01:00.000Z",
      importedFromBackup: false,
      normalizerVersion: "test-normalizer"
    });
    expect(record.timestamps).toEqual({
      capturedAt: "2026-04-10T10:01:00.000Z",
      startedAt: "2026-04-10T10:00:00.000Z",
      lastEventAt: "2026-04-10T10:00:05.000Z"
    });
    expect(record.summary).toBe(content.summary);
    expect(record.events).toBe(content.events);
    expect(record.extensions).toEqual({
      codex: {
        rootPath: "/tmp"
      }
    });
  });

  it("handles an empty session without deriving event timestamps", () => {
    const record = toSessionRecord({
      sessionId: "empty-session",
      source: "windsurf",
      sourceRef: { kind: "runtime_rpc", locator: "windsurf:cascade/empty-session" },
      content: makeTrajectoryContent({ source: "windsurf" }),
      provenance: {
        capturedAt: "2026-04-10T11:00:00.000Z"
      }
    });

    expect(record.schemaVersion).toBe("session-record/v1");
    expect(record.session.id).toBe("empty-session");
    expect(record.session.source).toBe("windsurf");
    expect(record.timestamps).toEqual({
      capturedAt: "2026-04-10T11:00:00.000Z",
      startedAt: undefined,
      lastEventAt: undefined
    });
    expect(record.events).toEqual([]);
    expect(record.summary.totalSteps).toBe(0);
  });
});
